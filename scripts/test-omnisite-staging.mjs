// Destructive test-data-only staging verification. Requires an explicitly marked empty test project.
import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";
import { chromium } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const {
  API_URL,
  ANON_KEY,
  SERVICE_ROLE_KEY,
  OMNISITE_TEST_APP_URL: appUrl,
} = process.env;
if (!API_URL || !ANON_KEY || !SERVICE_ROLE_KEY || !appUrl)
  throw new Error("Missing staging environment variables");
const admin = createClient(API_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});
const marker = await admin
  .from("project_maintenance_settings")
  .select("test_project,supabase_project_ref")
  .single();
assert.ifError(marker.error);
assert.equal(
  marker.data.test_project,
  true,
  "Refusing to run outside an explicit test project",
);
const leftovers = await admin.from("teams").select("id,name,is_test_team");
assert.ifError(leftovers.error);
if (leftovers.data.length) {
  assert(
    leftovers.data.every(
      (team) => team.is_test_team && team.name.startsWith("Phase 3 Team "),
    ),
    "Refusing to remove non-Phase-3 teams from staging",
  );
  for (const team of leftovers.data) {
    const listed = await admin.storage.from("omnisite-assets").list(team.id, {
      limit: 1000,
    });
    assert.ifError(listed.error);
    for (const siteFolder of listed.data ?? []) {
      const objects = await admin.storage
        .from("omnisite-assets")
        .list(`${team.id}/${siteFolder.name}`, { limit: 1000 });
      assert.ifError(objects.error);
      const paths = (objects.data ?? [])
        .filter((object) => object.id)
        .map((object) => `${team.id}/${siteFolder.name}/${object.name}`);
      if (paths.length)
        assert.ifError(
          (await admin.storage.from("omnisite-assets").remove(paths)).error,
        );
    }
    assert.ifError(
      (
        await admin
          .from("mock_checkout_sessions")
          .delete()
          .eq("team_id", team.id)
      ).error,
    );
    assert.ifError(
      (await admin.from("teams").delete().eq("id", team.id)).error,
    );
  }
}

const password = `Stage-${crypto.randomUUID()}-Aa1!`;
const people = {};
const teams = [];
const objects = [];
async function person(label) {
  const email = `phase3-${label}-${crypto.randomUUID()}@example.test`;
  const made = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { first_name: label, last_name: "Phase3" },
  });
  assert.ifError(made.error);
  const client = createClient(API_URL, ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const login = await client.auth.signInWithPassword({ email, password });
  assert.ifError(login.error);
  people[label] = {
    id: made.data.user.id,
    email,
    client,
    token: login.data.session.access_token,
    session: login.data.session,
  };
  return people[label];
}

async function authenticatedBrowserChecks(owner) {
  const browser = await chromium.launch({
    headless: true,
    ...(process.env.CHROME_PATH
      ? { executablePath: process.env.CHROME_PATH }
      : {}),
  });
  try {
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.goto(`${appUrl}/subscribe`);
    await page
      .getByRole("button", { name: "I already have an account" })
      .click();
    await page.getByLabel("Email").fill(owner.email);
    await page.getByLabel("Password").fill(password);
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await page.waitForTimeout(1500);
    const subscribeText = await page.locator("body").innerText();
    if (!subscribeText.includes("Choose a plan"))
      throw new Error(`Browser sign-in failed: ${subscribeText.slice(-500)}`);
    await page.goto(`${appUrl}/omnisite`);
    await page.getByRole("heading", { name: "Pages" }).waitFor();
    for (const width of [375, 768, 1280]) {
      await page.setViewportSize({ width, height: 900 });
      await page.reload();
      await page.getByRole("heading", { name: "Pages" }).waitFor();
      assert.equal(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
        true,
      );
      const axe = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze();
      assert.deepEqual(
        axe.violations.map((violation) => violation.id),
        [],
      );
    }
    await page.keyboard.press("Tab");
    assert(await page.evaluate(() => document.activeElement !== document.body));
    const heading = page.getByLabel("Heading").first();
    await heading.fill("Unsaved browser change");
    let dirtyDialog = false;
    page.once("dialog", async (dialog) => {
      dirtyDialog = true;
      await dialog.accept();
    });
    await page.reload();
    assert.equal(dirtyDialog, true, "dirty-state warning must open");
    await page.getByRole("heading", { name: "Pages" }).waitFor();
    await page.getByRole("button", { name: "Media" }).click();
    let destructiveDialog = false;
    page.once("dialog", async (dialog) => {
      destructiveDialog = true;
      await dialog.dismiss();
    });
    await page.getByRole("button", { name: "Delete image" }).first().click();
    assert.equal(destructiveDialog, true, "destructive confirmation must open");
    await page.getByRole("button", { name: "Pages" }).click();
    const unsafeLink = page
      .getByLabel("Link (optional HTTPS or local path)")
      .first();
    await unsafeLink.fill("javascript:alert(1)");
    await page.getByRole("button", { name: "Save draft" }).click();
    await page.getByRole("status").filter({ hasNotText: "Working…" }).waitFor();
    assert.match(
      await page.getByRole("status").textContent(),
      /link|invalid|https/i,
    );
  } finally {
    await browser.close();
  }
}
async function checkout(owner, name) {
  const started = await owner.client.rpc("begin_mock_checkout", {
    selected_plan_id: "omnisite_starter",
    requested_team_name: name,
    requested_timezone: "America/Los_Angeles",
  });
  assert.ifError(started.error);
  const finished = await owner.client.rpc("complete_mock_checkout", {
    target_checkout_id: started.data,
  });
  assert.ifError(finished.error);
  teams.push({ id: finished.data, name });
  return finished.data;
}
async function site(owner, teamId, slug) {
  const template = await owner.client
    .from("site_templates")
    .select("id")
    .eq("status", "PUBLISHED")
    .limit(1)
    .single();
  assert.ifError(template.error);
  const made = await owner.client.rpc("create_team_site", {
    target_team_id: teamId,
    selected_template_id: template.data.id,
    requested_slug: slug,
    requested_name: slug,
  });
  assert.ifError(made.error);
  return made.data;
}
async function snapshot(client, teamId, siteId) {
  const s = await client
    .from("team_sites")
    .select("*")
    .eq("team_id", teamId)
    .eq("id", siteId)
    .single();
  const p = await client
    .from("site_pages")
    .select("*")
    .eq("team_id", teamId)
    .eq("site_id", siteId)
    .order("nav_order");
  assert.ifError(s.error);
  assert.ifError(p.error);
  return {
    schemaVersion: 3,
    teamId,
    siteId,
    slug: s.data.slug,
    siteName: s.data.site_name,
    layout: s.data.layout_key,
    theme: s.data.theme,
    logoPath: s.data.logo_path,
    settings: s.data.settings,
    pages: p.data.map((x) => ({
      slug: x.slug,
      title: x.title,
      seoDescription: x.seo_description,
      navOrder: x.nav_order,
      visible: x.visible,
      sections: x.sections,
    })),
  };
}
async function upload(actor, teamId, siteId, png) {
  const r = await fetch(
    `${appUrl}/api/omnisite/media?teamId=${teamId}&siteId=${siteId}`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${actor.token}`,
        "Content-Type": "image/png",
        "X-File-Extension": "png",
      },
      body: png,
    },
  );
  if (r.status !== 200)
    throw new Error(`Upload failed (${r.status}): ${await r.text()}`);
  const data = await r.json();
  objects.push(data.path);
  return data;
}

await Promise.all([
  person("owner-a"),
  person("owner-b"),
  person("viewer"),
  person("manager"),
]);
try {
  const teamA = await checkout(
    people["owner-a"],
    `Phase 3 Team A ${crypto.randomUUID().slice(0, 6)}`,
  );
  const teamB = await checkout(
    people["owner-b"],
    `Phase 3 Team B ${crypto.randomUUID().slice(0, 6)}`,
  );
  for (const [who, level] of [
    ["viewer", "VIEW"],
    ["manager", "MANAGE"],
  ]) {
    const membership = await admin
      .from("team_memberships")
      .insert({
        team_id: teamA,
        user_id: people[who].id,
        role: "COACH",
        status: "ACTIVE",
      })
      .select("id")
      .single();
    assert.ifError(membership.error);
    assert.ifError(
      (
        await admin.from("team_member_module_permissions").insert({
          team_id: teamA,
          membership_id: membership.data.id,
          module_key: "omnisite",
          access_level: level,
        })
      ).error,
    );
  }
  const siteA = await site(
    people["owner-a"],
    teamA,
    `phase3-a-${crypto.randomUUID().slice(0, 6)}`,
  );
  const siteB = await site(
    people["owner-b"],
    teamB,
    `phase3-b-${crypto.randomUUID().slice(0, 6)}`,
  );
  assert.equal(
    (
      await people.viewer.client
        .from("team_sites")
        .select("id")
        .eq("team_id", teamA)
    ).data.length,
    1,
  );
  assert.equal(
    (
      await people.viewer.client
        .from("team_sites")
        .select("id")
        .eq("team_id", teamB)
    ).data.length,
    0,
  );
  const deniedViewSave = await people.viewer.client.rpc("save_site_draft", {
    target_team_id: teamA,
    target_site_id: siteA,
    expected_revision: 1,
    content: await snapshot(people.viewer.client, teamA, siteA),
  });
  assert(deniedViewSave.error);
  const png = await sharp({
    create: { width: 80, height: 80, channels: 3, background: "#164e63" },
  })
    .png()
    .toBuffer();
  const assetA = await upload(people.manager, teamA, siteA, png);
  const assetB = await upload(people["owner-b"], teamB, siteB, png);
  const draft = await snapshot(people.manager.client, teamA, siteA);
  draft.siteName = "Phase 3 edited";
  draft.pages[0].sections.push(
    {
      type: "richText",
      heading: "Story",
      blocks: [
        {
          type: "paragraph",
          children: [
            { text: "Accessible content", marks: ["bold"], href: "/contact" },
          ],
        },
      ],
    },
    {
      type: "newsList",
      heading: "News",
      items: [
        {
          title: "Update",
          summary: "Public news",
          publishedDate: "2026-09-23",
        },
      ],
    },
    {
      type: "eventsList",
      heading: "Events",
      items: [
        {
          title: "Open house",
          summary: "Public event",
          date: "2026-10-01",
          time: "18:00",
        },
      ],
    },
    { type: "image", alt: "Team color", path: assetA.path },
  );
  const saved = await people.manager.client.rpc("save_site_draft", {
    target_team_id: teamA,
    target_site_id: siteA,
    expected_revision: 1,
    content: draft,
  });
  assert.ifError(saved.error);
  const published = await people.manager.client.rpc("publish_site_revision", {
    target_team_id: teamA,
    target_site_id: siteA,
    expected_revision: saved.data,
    expected_version: 0,
  });
  assert.ifError(published.error);
  const rollback = await people.manager.client.rpc("publish_site_revision", {
    target_team_id: teamA,
    target_site_id: siteA,
    expected_revision: saved.data,
    expected_version: published.data,
    source_version: published.data,
  });
  assert.ifError(rollback.error);
  const publicSite = await createClient(API_URL, ANON_KEY).rpc(
    "get_public_site",
    { requested_slug: draft.slug },
  );
  assert.ifError(publicSite.error);
  assert.equal(publicSite.data.siteName, "Phase 3 edited");
  // Database recovery drill: export, remove, and restore an immutable publication.
  const publicationBackup = await admin
    .from("site_publications")
    .select("*")
    .eq("team_id", teamA)
    .eq("site_id", siteA)
    .eq("version", rollback.data)
    .single();
  assert.ifError(publicationBackup.error);
  assert.ifError(
    (await admin.from("team_sites").update({ published_version: null }).eq("id", siteA))
      .error,
  );
  assert.ifError(
    (await admin.from("site_publications").delete().eq("id", publicationBackup.data.id))
      .error,
  );
  assert.ifError(
    (await admin.from("site_publications").insert(publicationBackup.data)).error,
  );
  assert.ifError(
    (
      await admin
        .from("team_sites")
        .update({ published_version: rollback.data })
        .eq("id", siteA)
    ).error,
  );
  // Storage recovery drill: retain bytes externally, remove, and restore exactly.
  const storageBackup = await admin.storage
    .from("omnisite-assets")
    .download(assetA.path);
  assert.ifError(storageBackup.error);
  const storageBytes = Buffer.from(await storageBackup.data.arrayBuffer());
  assert.ifError(
    (await admin.storage.from("omnisite-assets").remove([assetA.path])).error,
  );
  assert.ifError(
    (
      await admin.storage.from("omnisite-assets").upload(assetA.path, storageBytes, {
        contentType: "image/webp",
        upsert: false,
      })
    ).error,
  );
  assert.ifError(
    (await admin.storage.from("omnisite-assets").download(assetA.path)).error,
  );
  const incompatibleVersion = rollback.data + 1;
  assert.ifError(
    (
      await admin.from("site_publications").insert({
        team_id: teamA,
        site_id: siteA,
        version: incompatibleVersion,
        snapshot: { ...draft, schemaVersion: 99 },
        published_by: people["owner-a"].id,
        source_revision: saved.data,
      })
    ).error,
  );
  assert.ifError(
    (
      await admin
        .from("team_sites")
        .update({ published_version: incompatibleVersion })
        .eq("id", siteA)
    ).error,
  );
  assert.equal(
    (
      await createClient(API_URL, ANON_KEY).rpc("get_public_site", {
        requested_slug: draft.slug,
      })
    ).data,
    null,
  );
  assert.ifError(
    (
      await admin
        .from("team_sites")
        .update({ published_version: rollback.data })
        .eq("id", siteA)
    ).error,
  );
  await authenticatedBrowserChecks(people["owner-a"]);
  const crossRead = await people["owner-b"].client
    .from("site_pages")
    .select("id")
    .eq("team_id", teamA);
  assert.equal(crossRead.data.length, 0);
  const crossPublish = await people["owner-b"].client.rpc(
    "publish_site_revision",
    {
      target_team_id: teamA,
      target_site_id: siteA,
      expected_revision: saved.data,
      expected_version: rollback.data,
    },
  );
  assert(crossPublish.error);
  const crossDomain = await admin.rpc("os_domain_operation", {
    actor: people["owner-b"].id,
    t: teamA,
    s: siteA,
    operation: "claim",
    hostname_input: "phase3.example.org",
    display_input: "phase3.example.org",
  });
  assert(crossDomain.error);
  const poisoned = structuredClone(draft);
  poisoned.pages[0].sections.push({
    type: "image",
    alt: "Cross team",
    path: assetB.path,
  });
  const crossAsset = await people.manager.client.rpc("save_site_draft", {
    target_team_id: teamA,
    target_site_id: siteA,
    expected_revision: saved.data,
    content: poisoned,
  });
  assert(crossAsset.error);
  await admin.from("team_sites").update({ enabled: false }).eq("id", siteA);
  assert.equal(
    (
      await createClient(API_URL, ANON_KEY).rpc("get_public_site", {
        requested_slug: draft.slug,
      })
    ).data,
    null,
  );
  await admin.from("team_sites").update({ enabled: true }).eq("id", siteA);
  await admin
    .from("team_module_entitlements")
    .update({ ends_at: new Date(Date.now() - 1000).toISOString() })
    .eq("team_id", teamA)
    .eq("module_key", "omnisite");
  assert.equal(
    (
      await people.manager.client.rpc("can_manage_omnisite", {
        target_team_id: teamA,
      })
    ).data,
    false,
  );
  await admin
    .from("team_module_entitlements")
    .update({ ends_at: null })
    .eq("team_id", teamA)
    .eq("module_key", "omnisite");
  await admin
    .from("team_memberships")
    .update({ status: "INACTIVE" })
    .eq("team_id", teamA)
    .eq("user_id", people.manager.id);
  assert.equal(
    (
      await people.manager.client.rpc("can_manage_omnisite", {
        target_team_id: teamA,
      })
    ).data,
    false,
  );
  await admin
    .from("team_memberships")
    .update({ status: "ACTIVE" })
    .eq("team_id", teamA)
    .eq("user_id", people.manager.id);
  await admin.from("teams").update({ status: "INACTIVE" }).eq("id", teamA);
  assert.equal(
    (
      await people["owner-a"].client.rpc("can_view_omnisite", {
        target_team_id: teamA,
      })
    ).data,
    false,
  );
  await admin.from("teams").update({ status: "ACTIVE" }).eq("id", teamA);
  assert.ifError(
    (await admin.storage.from("omnisite-assets").remove(objects)).error,
  );
  objects.length = 0;
  assert.ifError(
    (
      await admin.rpc("purge_test_team_data", {
        target_team_id: teamA,
        expected_team_name: teams[0].name,
      })
    ).error,
  );
  assert.equal(
    (await admin.from("site_pages").select("id").eq("team_id", teamA)).data
      .length,
    0,
  );
  assert.ifError(
    (
      await admin.rpc("delete_team_and_data", {
        target_team_id: teamB,
        expected_team_name: teams[1].name,
      })
    ).error,
  );
  assert.equal(
    (await admin.from("teams").select("id").eq("id", teamB)).data.length,
    0,
  );
  console.log(
    "PASS: four real identities, checkout/provisioning, template/site creation, VIEW/MANAGE, edit/upload/preview/publication/rollback, cross-team denial, authenticated responsive/accessibility UX, lifecycle and incompatible-snapshot states, database/Storage recovery, purge and hard delete.",
  );
} finally {
  if (objects.length)
    await admin.storage.from("omnisite-assets").remove(objects);
  for (const team of teams)
    await admin.from("teams").delete().eq("id", team.id);
  for (const person of Object.values(people))
    await admin.auth.admin.deleteUser(person.id);
}
