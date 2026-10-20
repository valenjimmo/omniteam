// Real local-Supabase + browser test. See docs/FAMILY_REGISTRATION_DEPLOYMENT.md.
import assert from "node:assert/strict";
import { chromium } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

const apiUrl = process.env.API_URL;
const anonKey = process.env.ANON_KEY;
const serviceKey = process.env.SERVICE_ROLE_KEY;
const appUrl = process.env.FAMILY_TEST_APP_URL ?? "http://127.0.0.1:3100";
if (!apiUrl || !anonKey || !serviceKey) throw new Error("API_URL, ANON_KEY, and SERVICE_ROLE_KEY are required");

const admin = createClient(apiUrl, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
const suffix = crypto.randomUUID().slice(0, 8);
const password = `Family-${crypto.randomUUID()}-Aa1!`;
const identities = {
  ownerA: { email: `owner-a-${suffix}@example.test`, first: "Olivia", last: "Owner" },
  ownerB: { email: `owner-b-${suffix}@example.test`, first: "Blake", last: "Owner" },
  guardian: { email: `guardian-${suffix}@example.test`, first: "Grace", last: "Guardian" },
  rejected: { email: `rejected-${suffix}@example.test`, first: "Riley", last: "Guardian" },
};

async function createUser(person) {
  const result = await admin.auth.admin.createUser({ email: person.email, password, email_confirm: true,
    user_metadata: { first_name: person.first, last_name: person.last } });
  assert.ifError(result.error); return result.data.user.id;
}
function client() { return createClient(apiUrl, anonKey, { auth: { persistSession: false, autoRefreshToken: false } }); }
async function signIn(person) { const c = client(); const result = await c.auth.signInWithPassword({ email: person.email, password }); assert.ifError(result.error); return c; }
async function insertOne(table, values) { const result = await admin.from(table).insert(values).select("*").single(); assert.ifError(result.error); return result.data; }
async function loginPage(page, person, nextUrl = "/login") {
  await page.goto(`${appUrl}${nextUrl}`);
  await page.getByLabel("Email").fill(person.email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
}

const ids = {};
let browser;
try {
  for (const [key, person] of Object.entries(identities)) ids[key] = await createUser(person);
  const organization = await insertOne("organizations", { name: `Family registration ${suffix}` });
  const teamA = await insertOne("teams", { organization_id: organization.id, name: `Sharks ${suffix}` });
  const teamB = await insertOne("teams", { organization_id: organization.id, name: `Dolphins ${suffix}` });
  await admin.from("team_memberships").insert([
    { team_id: teamA.id, user_id: ids.ownerA, role: "OWNER" },
    { team_id: teamB.id, user_id: ids.ownerB, role: "OWNER" },
  ]).throwOnError();
  await admin.from("team_module_entitlements").insert([
    { team_id: teamA.id, module_key: "omniathlete" },
    { team_id: teamB.id, module_key: "omniathlete" },
  ]).throwOnError();

  browser = await chromium.launch();
  const ownerContext = await browser.newContext();
  const guardianContext = await browser.newContext();
  const ownerPage = await ownerContext.newPage();
  const guardianPage = await guardianContext.newPage();

  await loginPage(ownerPage, identities.ownerA);
  await ownerPage.goto(`${appUrl}/team/access`);
  await ownerPage.getByLabel("Team link name").fill(`sharks-${suffix}`);
  await ownerPage.getByLabel("Open registration").check();
  await ownerPage.getByRole("button", { name: "Save", exact: true }).click();
  await ownerPage.getByText("Registration settings saved.").waitFor();

  const registrationUrl = `${appUrl}/register/sharks-${suffix}`;
  await guardianPage.goto(registrationUrl);
  await guardianPage.getByRole("button", { name: "Already have an account? Sign in" }).click();
  await guardianPage.getByLabel("Email").fill(identities.guardian.email);
  await guardianPage.getByLabel("Password").fill(password);
  await guardianPage.getByRole("button", { name: "Save and continue" }).click();
  await guardianPage.getByRole("heading", { name: "Household and billing" }).waitFor();
  await guardianPage.getByLabel("Family name").fill("Guardian Family");
  await guardianPage.getByLabel("Primary phone").fill("555-0100");
  await guardianPage.getByLabel("Street address").fill("100 Swim Lane");
  await guardianPage.getByLabel("City").fill("Harbor City");
  await guardianPage.getByLabel("State / province").fill("CA");
  await guardianPage.getByLabel("Postal code").fill("90001");
  await guardianPage.getByLabel("Billing email").fill(identities.guardian.email);
  await guardianPage.getByRole("button", { name: "Save and continue" }).click();

  const contacts = guardianPage.getByRole("heading", { name: "Guardians and emergency contacts" });
  await contacts.waitFor();
  await guardianPage.getByLabel("First name").nth(0).fill("Grace");
  await guardianPage.getByLabel("Last name").nth(0).fill("Guardian");
  await guardianPage.getByLabel("Relationship").nth(0).fill("Parent");
  await guardianPage.getByLabel("Email").fill(identities.guardian.email);
  await guardianPage.getByLabel("Mobile phone").fill("555-0100");
  await guardianPage.getByLabel("First name").nth(1).fill("Erin");
  await guardianPage.getByLabel("Last name").nth(1).fill("Emergency");
  await guardianPage.getByLabel("Relationship").nth(1).fill("Aunt");
  await guardianPage.getByLabel("Phone").fill("555-0199");
  await guardianPage.getByRole("button", { name: "Save and continue" }).click();

  await guardianPage.getByLabel("Legal first name").fill("Sam");
  await guardianPage.getByLabel("Legal last name").fill("Swimmer");
  await guardianPage.getByLabel("Birth date").fill("2014-05-06");
  await guardianPage.getByRole("button", { name: "Save and continue" }).click();
  await guardianPage.getByRole("button", { name: "Save and continue" }).click();
  const agreements = guardianPage.locator(".registration-agreement");
  for (let index = 0; index < await agreements.count(); index += 1) {
    const agreement = agreements.nth(index);
    const checkbox = agreement.getByRole("checkbox");
    const required = (await agreement.getByRole("heading").textContent())?.includes("*");
    if (required) await checkbox.check();
    const initials = agreement.getByLabel("Initials");
    if (await initials.count()) await initials.fill("GG");
  }
  await guardianPage.getByRole("button", { name: "Save and continue" }).click();
  await guardianPage.getByText("I certify this information").click();
  await guardianPage.getByRole("button", { name: "Submit registration" }).click();
  await guardianPage.getByRole("heading", { name: "Registration pending" }).waitFor();

  const request = await admin.from("parent_registration_requests").select("*").eq("team_id", teamA.id).eq("user_id", ids.guardian).single();
  assert.ifError(request.error); assert.equal(request.data.status, "PENDING");
  for (const table of ["families", "family_guardians"]) {
    const rows = await admin.from(table).select("*", { count: "exact", head: true }).eq("team_id", teamA.id);
    assert.equal(rows.count, 0, `${table} must not exist before approval`);
  }
  const pendingMembership = await admin.from("team_memberships").select("id").eq("team_id", teamA.id).eq("user_id", ids.guardian).maybeSingle();
  assert.equal(pendingMembership.data, null, "submission must not create membership");

  const ownerB = await signIn(identities.ownerB);
  const crossRead = await ownerB.from("parent_registration_requests").select("id").eq("team_id", teamA.id);
  assert.ifError(crossRead.error); assert.deepEqual(crossRead.data, []);
  const crossApprove = await ownerB.rpc("review_parent_registration", { target_team_id: teamB.id, target_request_id: request.data.id, approve: true });
  assert(crossApprove.error, "team B must not approve team A request");

  await ownerPage.reload();
  await ownerPage.getByText("Guardian Family").waitFor();
  await ownerPage.getByRole("button", { name: "Approve" }).click();
  await ownerPage.getByText("Family approved.").waitFor();
  await guardianPage.goto(`${appUrl}/my-family`);
  await guardianPage.getByRole("heading", { name: "Guardian Family" }).waitFor();
  await guardianPage.getByText("Sam Swimmer").waitFor();

  const approved = await admin.from("parent_registration_requests").select("status").eq("id", request.data.id).single();
  assert.equal(approved.data.status, "APPROVED");
  const family = await admin.from("families").select("id,team_id").eq("team_id", teamA.id).single(); assert.ifError(family.error);
  for (const table of ["swimmers", "family_swimmers", "family_guardians", "family_contacts", "family_registration_profiles", "swimmer_registration_profiles"]) {
    const rows = await admin.from(table).select("*", { count: "exact", head: true }).eq("team_id", teamA.id);
    assert((rows.count ?? 0) > 0, `${table} must be created on approval`);
  }
  const parentMembership = await admin.from("team_memberships").select("role,status").eq("team_id", teamA.id).eq("user_id", ids.guardian).single();
  assert.deepEqual(parentMembership.data, { role: "PARENT", status: "ACTIVE" });
  const crossFamilyRead = await ownerB.from("families").select("id").eq("team_id", teamA.id);
  assert.ifError(crossFamilyRead.error); assert.deepEqual(crossFamilyRead.data, []);
  const crossLink = await ownerB.from("family_guardians").insert({ team_id: teamB.id, family_id: family.data.id, membership_id: crypto.randomUUID() });
  assert(crossLink.error, "team B must not link team A family");

  const rejectedClient = await signIn(identities.rejected);
  const payload = request.data.registration_payload;
  payload.family.familyName = "Rejected Family";
  payload.family.billingEmail = identities.rejected.email;
  payload.guardians[0].email = identities.rejected.email;
  const rejectedRequest = await rejectedClient.rpc("submit_family_registration", { target_team_id: teamA.id, registration_payload: payload });
  assert.ifError(rejectedRequest.error);
  const ownerA = await signIn(identities.ownerA);
  const rejectedReview = await ownerA.rpc("review_parent_registration", { target_team_id: teamA.id, target_request_id: rejectedRequest.data, approve: false });
  assert.ifError(rejectedReview.error);
  const rejectedMembership = await admin.from("team_memberships").select("id").eq("team_id", teamA.id).eq("user_id", ids.rejected).maybeSingle();
  assert.equal(rejectedMembership.data, null, "rejection must not grant membership");

  console.log(JSON.stringify({ registrationUrl, ownerReviewUrl: `${appUrl}/team/access`, familyUrl: `${appUrl}/my-family`, requestId: request.data.id, familyId: family.data.id }, null, 2));
  await ownerContext.close(); await guardianContext.close();
} finally {
  if (browser) await browser.close();
  for (const id of Object.values(ids)) await admin.auth.admin.deleteUser(id).catch(() => {});
}
