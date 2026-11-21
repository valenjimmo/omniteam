import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const checkOnly = process.argv.includes("--check");
const target = resolve("src/lib/supabase/database.types.ts");
const databaseUrl = process.env.OMNITEAM_TYPES_DB_URL?.trim();
const args = ["supabase", "gen", "types", "typescript", "--schema", "public"];
if (databaseUrl) args.push("--db-url", databaseUrl);
else args.push("--local");

const temporaryDirectory = mkdtempSync(join(tmpdir(), "omniteam-types-"));
const generatedPath = join(temporaryDirectory, "database.types.ts");
try {
  const result = spawnSync("npx", args, { encoding: "utf8", maxBuffer: 20 * 1024 * 1024 });
  if (result.stderr) process.stderr.write(result.stderr);
  if (result.status !== 0) {
    if (result.stdout) process.stderr.write(result.stdout);
    process.exit(result.status ?? 1);
  }
  const generated = `${result.stdout.trimEnd()}\n`;
  writeFileSync(generatedPath, generated);
  if (checkOnly) {
    const committed = readFileSync(target, "utf8");
    if (committed !== generated) {
      console.error("Supabase database types are stale. Run `npm run types:generate` against a clean, fully migrated target.");
      process.exit(1);
    }
    console.log("Supabase database types match the clean generation target.");
  } else {
    writeFileSync(target, generated);
    console.log(`Generated ${target}.`);
  }
} finally {
  rmSync(temporaryDirectory, { recursive: true, force: true });
}
