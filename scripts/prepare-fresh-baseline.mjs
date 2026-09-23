import { createHash } from "node:crypto";
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const migrationDirectory = resolve("supabase/migrations");
const outputDirectory = resolve(".manual-deploy");
const migrationFiles = readdirSync(migrationDirectory)
  .filter((file) => /^\d{12}_[a-z0-9_]+\.sql$/.test(file))
  .sort();

if (migrationFiles.length === 0) {
  throw new Error("No canonical migrations were found.");
}

const migrations = migrationFiles.map((file) => {
  const source = readFileSync(resolve(migrationDirectory, file), "utf8").trim();
  const [, version, name] = file.match(/^(\d{12})_([a-z0-9_]+)\.sql$/);
  const encoded = Buffer.from(source, "utf8").toString("base64");
  const sha256 = createHash("sha256").update(source).digest("hex");
  return { encoded, file, name, sha256, source, version };
});

const sql = `-- Generated fresh baseline from the canonical migrations.
-- This file is for an empty/new Supabase project only.
-- Do not run it against a project with existing application tables or uncertain
-- migration history. Run supabase/scripts/audit_migration_state.sql first.
--
-- Each source migration runs in its own transaction. This preserves the required
-- commit boundary for 202609140003_parent_role.sql before PARENT is referenced.
-- Each completed migration is recorded in Supabase's standard migration ledger.

do $fresh_preflight$
begin
  if to_regtype('public.record_status') is not null
    or to_regclass('public.organizations') is not null
    or to_regclass('public.teams') is not null then
    raise exception 'Fresh baseline refused: application objects already exist. Run supabase/scripts/audit_migration_state.sql and use a reviewed repair or reset path.';
  end if;
end;
$fresh_preflight$;

create schema if not exists supabase_migrations;
create table if not exists supabase_migrations.schema_migrations (
  version text primary key,
  statements text[],
  name text
);

${migrations
  .map(
    ({ encoded, file, name, sha256, source, version }) => `begin;
-- ============================================================================
-- ${file}
-- SHA-256: ${sha256}
-- ============================================================================
${source}
commit;

insert into supabase_migrations.schema_migrations(version, statements, name)
values ('${version}', array[convert_from(decode('${encoded}', 'base64'), 'UTF8')], '${name}')
on conflict (version) do nothing;`,
  )
  .join("\n\n")}
`;

mkdirSync(outputDirectory, { recursive: true });
const output = resolve(outputDirectory, "omniteam_fresh_baseline.sql");
writeFileSync(output, sql);
console.log(`${output}\nmigrations=${migrations.length}`);
