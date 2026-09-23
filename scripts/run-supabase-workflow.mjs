import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const action = process.argv[2];
const root = resolve(".");
const resetSql = resolve("supabase/scripts/reset_omniteam_application.sql");
const baselineSql = resolve(".manual-deploy/omniteam_fresh_baseline.sql");
const configPath = resolve(".supabase.env");
const confirmation = "RESET OMNITEAM APPLICATION";

function fail(message) {
  console.error(`Error: ${message}`);
  process.exit(1);
}

if (!action || !["deploy", "reset"].includes(action)) {
  fail("Usage: npm run supabase:deploy or npm run supabase:reset");
}

if (!existsSync(configPath)) {
  fail(`Missing ${configPath}. Populate it with SUPABASE_PROJECT_REF and SUPABASE_ACCESS_TOKEN.`);
}

for (const line of readFileSync(configPath, "utf8").split(/\r?\n/)) {
  const match = line.match(/^([A-Z][A-Z0-9_]*)=(.*)$/);
  if (match && !match[2].startsWith("replace-with-")) {
    process.env[match[1]] = match[2].trim().replace(/^['"]|['"]$/g, "");
  }
}

if (!process.env.SUPABASE_PROJECT_REF) {
  fail("SUPABASE_PROJECT_REF is missing from .supabase.env.");
}

if (!process.env.SUPABASE_ACCESS_TOKEN) {
  fail("SUPABASE_ACCESS_TOKEN is missing from .supabase.env.");
}

try {
  execFileSync("supabase", ["--version"], { stdio: "inherit" });
} catch {
  fail("Supabase CLI is required. Install it, authenticate with supabase login, and link this project first.");
}

function runSupabase(args) {
  execFileSync("supabase", args, { cwd: root, stdio: "inherit" });
}

function projectArgs() {
  return ["--linked", "--project-ref", process.env.SUPABASE_PROJECT_REF];
}

function passwordArgs() {
  return process.env.SUPABASE_DB_PASSWORD
    ? ["--password", process.env.SUPABASE_DB_PASSWORD]
    : [];
}

if (action === "deploy") {
  runSupabase(["db", "push", ...projectArgs(), ...passwordArgs()]);
  process.exit(0);
}

if (process.env.OMNITEAM_RESET_CONFIRMATION !== confirmation) {
  fail(`Set OMNITEAM_RESET_CONFIRMATION=${confirmation} to authorize the destructive reset.`);
}

if (!existsSync(resetSql)) {
  fail(`Missing reset script: ${resetSql}`);
}

execFileSync("node", ["scripts/prepare-fresh-baseline.mjs"], {
  cwd: root,
  stdio: "inherit",
});

const temporaryDirectory = mkdtempSync(join(tmpdir(), "omniteam-reset-"));
const temporaryResetSql = join(temporaryDirectory, "reset.sql");
try {
  const resetSource = readFileSync(resetSql, "utf8").replace(
    "REPLACE_WITH_RESET_OMNITEAM_APPLICATION",
    confirmation,
  );
  writeFileSync(temporaryResetSql, resetSource);
  runSupabase(["db", "query", ...projectArgs(), "--file", temporaryResetSql]);
  runSupabase(["db", "query", ...projectArgs(), "--file", baselineSql]);
  runSupabase(["migration", "list", ...projectArgs(), ...passwordArgs()]);
} finally {
  rmSync(temporaryDirectory, { recursive: true, force: true });
}
