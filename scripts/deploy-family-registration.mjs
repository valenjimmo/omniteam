import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(".");
const environmentPath = resolve(".supabase.env");
const migrationPath = resolve(
  "supabase/migrations/202610010001_configurable_family_registration.sql",
);
const verificationPath = resolve(
  "supabase/scripts/verify_configurable_family_registration.sql",
);
const apply = process.argv.includes("--apply");

function fail(message) {
  console.error(`Error: ${message}`);
  process.exit(1);
}

function loadEnvironment() {
  if (!existsSync(environmentPath)) {
    fail("Missing .supabase.env. See docs/FAMILY_REGISTRATION_DEPLOYMENT.md.");
  }
  for (const line of readFileSync(environmentPath, "utf8").split(/\r?\n/)) {
    const match = line.match(/^([A-Z][A-Z0-9_]*)=(.*)$/);
    if (match && !match[2].startsWith("replace-with-")) {
      process.env[match[1]] = match[2].trim().replace(/^['"]|['"]$/g, "");
    }
  }
  if (!process.env.SUPABASE_PROJECT_REF) fail("SUPABASE_PROJECT_REF is missing from .supabase.env.");
  if (!process.env.SUPABASE_ACCESS_TOKEN) fail("SUPABASE_ACCESS_TOKEN is missing from .supabase.env.");
}

function run(args, capture = false) {
  return execFileSync("supabase", args, {
    cwd: root,
    encoding: capture ? "utf8" : undefined,
    stdio: capture ? ["ignore", "pipe", "pipe"] : "inherit",
  });
}

if (!existsSync(migrationPath)) fail(`Missing migration: ${migrationPath}`);
if (!existsSync(verificationPath)) fail(`Missing verification SQL: ${verificationPath}`);
loadEnvironment();

try {
  run(["--version"]);
} catch {
  fail("Supabase CLI is required and must be available on PATH.");
}

const passwordArgs = process.env.SUPABASE_DB_PASSWORD
  ? ["--password", process.env.SUPABASE_DB_PASSWORD]
  : [];
const linkedArgs = ["--linked"];

console.log(`Target project: ${process.env.SUPABASE_PROJECT_REF}`);
console.log("Linking the checkout to the configured target project...");
run(["link", "--project-ref", process.env.SUPABASE_PROJECT_REF, ...passwordArgs]);
console.log("Checking local and remote migration history...");
run(["migration", "list", ...linkedArgs, ...passwordArgs]);

console.log("Running deployment dry run...");
run(["db", "push", ...linkedArgs, ...passwordArgs, "--dry-run"]);

if (!apply) {
  console.log("Dry run complete. Re-run with --apply to deploy pending migrations.");
  process.exit(0);
}

console.log("Applying pending tracked migrations...");
run(["db", "push", ...linkedArgs, ...passwordArgs]);

console.log("Verifying configurable family registration objects...");
run(["db", "query", ...linkedArgs, ...passwordArgs, readFileSync(verificationPath, "utf8")]);

console.log("Confirming migration history after deployment...");
run(["migration", "list", ...linkedArgs, ...passwordArgs]);
console.log("Configurable family registration deployment completed successfully.");
