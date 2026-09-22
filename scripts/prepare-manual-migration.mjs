// Builds a transactional SQL-Editor bundle while preserving Supabase CLI history.
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { basename, dirname, resolve } from "node:path";

const args = process.argv.slice(2);
const recordExisting = args.includes("--record-existing");
const verified = args.includes("--verified");
const input = args.find((arg) => !arg.startsWith("--"));

if (!input) {
  throw new Error(
    "Usage: npm run migration:manual -- supabase/migrations/<version>_<name>.sql [--record-existing --verified]",
  );
}
if (recordExisting && !verified) {
  throw new Error(
    "Recording existing SQL requires both --record-existing and --verified after the complete migration was audited.",
  );
}

const filename = basename(input);
const migrationDirectory = resolve("supabase/migrations");
const resolvedInput = resolve(input);
if (dirname(resolvedInput) !== migrationDirectory) {
  throw new Error("Input must be a direct child of supabase/migrations/.");
}
const match = filename.match(/^(\d{12})_([a-z0-9_]+)\.sql$/);
if (!match) {
  throw new Error("Migration filename must be <12-digit-version>_<name>.sql.");
}
const [, version, name] = match;
const source = readFileSync(resolvedInput, "utf8").trim();
const sha256 = createHash("sha256").update(source).digest("hex");
const encoded = Buffer.from(source, "utf8").toString("base64");
const priorVersions = readdirSync(migrationDirectory)
  .map((file) => file.match(/^(\d{12})_[a-z0-9_]+\.sql$/)?.[1])
  .filter((value) => value && value < version)
  .sort();
const priorArray = priorVersions.map((value) => `'${value}'`).join(",");
const historySetup = `
create schema if not exists supabase_migrations;
create table if not exists supabase_migrations.schema_migrations (
  version text primary key,
  statements text[],
  name text
);
create table if not exists supabase_migrations.manual_deployments (
  version text primary key references supabase_migrations.schema_migrations(version) on delete cascade,
  name text not null,
  sha256 text not null check (sha256 ~ '^[0-9a-f]{64}$'),
  applied_at timestamptz not null default now(),
  applied_by text not null default current_user
);
do $preflight$
declare recorded_hash text;
begin
  select sha256 into recorded_hash
  from supabase_migrations.manual_deployments
  where version='${version}';
  if recorded_hash is not null then
    if recorded_hash='${sha256}' then
      raise exception 'Migration ${version} is already recorded with this checksum';
    end if;
    raise exception 'Migration ${version} checksum differs from its recorded deployment';
  end if;
  if exists(select 1 from supabase_migrations.schema_migrations where version='${version}') then
    raise exception 'Migration ${version} already exists in Supabase history without a verified manual checksum';
  end if;
  if not ${recordExisting ? "true" : `array[${priorArray}]::text[] <@ coalesce((select array_agg(version) from supabase_migrations.schema_migrations),'{}'::text[])`} then
    raise exception 'Earlier repository migrations are missing from history; reconcile them before ${version}';
  end if;
end;
$preflight$;`;
const record = `
insert into supabase_migrations.schema_migrations(version,statements,name)
values (
  '${version}',
  array[convert_from(decode('${encoded}','base64'),'UTF8')],
  '${name}'
);
insert into supabase_migrations.manual_deployments(version,name,sha256)
values ('${version}','${name}','${sha256}');`;

const sql = `-- Generated from ${filename}
-- SHA-256: ${sha256}
-- Mode: ${recordExisting ? "record verified existing migration; SQL is not executed" : "execute migration and record history"}
-- Run the entire file once in the intended Supabase project's SQL Editor.
begin;
${historySetup}

${recordExisting ? "-- Migration SQL intentionally omitted in verified-existing mode." : source}
${record}
commit;
`;

mkdirSync(".manual-deploy", { recursive: true });
const output = `.manual-deploy/${filename.replace(/\.sql$/, recordExisting ? ".record.sql" : ".deploy.sql")}`;
writeFileSync(output, sql);
console.log(`${output}\nversion=${version}\nsha256=${sha256}`);
