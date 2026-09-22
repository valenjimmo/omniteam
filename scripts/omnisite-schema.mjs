// Generate frozen SQL JSON schemas when introducing a NEW renderer migration.
// Do not regenerate an already-applied migration.
import { z } from "zod";
import {
  snapshotSchema,
  templateSchema,
} from "../src/modules/omnisite/model.ts";
import { writeFileSync } from "node:fs";
const sql =
  `-- Renderer schema v3. Requires Supabase's pg_jsonschema extension.\ncreate extension if not exists pg_jsonschema with schema extensions;\n` +
  Object.entries({ snapshot: snapshotSchema, template: templateSchema })
    .map(
      ([key, schema]) =>
        `create or replace function public.os_valid_${key}(value jsonb) returns boolean language sql immutable set search_path=public,extensions as $fn$\n select value is not null and extensions.jsonb_matches_schema($schema$${JSON.stringify(z.toJSONSchema(schema, { target: "draft-7", unrepresentable: "any" }))}$schema$::json,value);\n$fn$;\n`,
    )
    .join("");
writeFileSync("supabase/migrations/202609220005_omnisite_content_v3.sql", sql);
