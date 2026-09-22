// Disposable PostgreSQL/WASM role and transaction tests. Never connects remotely.
// pg_jsonschema is not bundled in PGlite. Its function is stubbed ONLY here;
// run the rollback SQL suite on local Supabase to validate that extension too.
import { PGlite } from "@electric-sql/pglite";
import { pgcrypto } from "@electric-sql/pglite/contrib/pgcrypto";
import { readdir, readFile } from "node:fs/promises";
const db = new PGlite({ extensions: { pgcrypto } });
try {
  await db.exec(`create role anon; create role authenticated; create role service_role bypassrls;
 create schema auth; create schema storage; create schema extensions;
 create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz,raw_user_meta_data jsonb default '{}');
 create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
 grant usage on schema public,auth,storage to anon,authenticated,service_role;
 grant execute on function auth.uid() to anon,authenticated,service_role;
 alter default privileges in schema public grant all on tables to anon,authenticated,service_role;
 create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
 create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text references storage.buckets(id),name text);
 alter table storage.objects enable row level security;
 grant all on storage.objects to anon,authenticated,service_role;
 create function storage.foldername(name text) returns text[] language sql as $$ select (string_to_array(name,'/'))[1:array_length(string_to_array(name,'/'),1)-1] $$;
 create function extensions.jsonb_matches_schema(schema json,instance jsonb) returns boolean language sql immutable as $$ select true $$;`);
  for (const file of (await readdir("supabase/migrations"))
    .filter((f) => f.endsWith(".sql"))
    .sort()) {
    let sql = await readFile(`supabase/migrations/${file}`, "utf8");
    sql = sql.replace(
      "create extension if not exists pg_jsonschema with schema extensions;",
      "-- Test-only: pg_jsonschema shim installed above.",
    );
    try {
      await db.exec(sql);
    } catch (e) {
      throw new Error(`Migration ${file}: ${e.message}`, { cause: e });
    }
  }
  console.log(
    "All tracked migrations applied to disposable PostgreSQL (pg_jsonschema shim).",
  );
  await db.exec(
    await readFile("supabase/tests/omnisite_milestone.sql", "utf8"),
  );
  console.log(
    "PASS: rollback-only OmniSite roles, tenant isolation, revisions, publication, domains, media, catalog and lifecycle suite.",
  );
} catch (e) {
  console.error(e.message);
  if (e.where) console.error(e.where);
  process.exitCode = 1;
} finally {
  await db.close();
}
