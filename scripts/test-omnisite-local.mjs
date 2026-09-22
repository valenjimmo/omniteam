// Real local-Supabase integration test. Requires `supabase start` and a built/running app.
import assert from "node:assert/strict";
import sharp from "sharp";
import { createClient } from "@supabase/supabase-js";

const apiUrl = process.env.API_URL;
const anonKey = process.env.ANON_KEY;
const serviceKey = process.env.SERVICE_ROLE_KEY;
const appUrl = process.env.OMNISITE_TEST_APP_URL ?? "http://127.0.0.1:3100";
if (!apiUrl || !anonKey || !serviceKey) {
  throw new Error("API_URL, ANON_KEY, and SERVICE_ROLE_KEY are required");
}

async function assertStatus(response, expected) {
  if (response.status !== expected) {
    throw new Error(
      `Expected HTTP ${expected}, received ${response.status}: ${await response.text()}`,
    );
  }
}

const admin = createClient(apiUrl, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const email = `omnisite-local-${crypto.randomUUID()}@example.test`;
const password = `Local-${crypto.randomUUID()}-Aa1!`;
const created = await admin.auth.admin.createUser({
  email,
  password,
  email_confirm: true,
  user_metadata: { first_name: "Local", last_name: "Tester" },
});
assert.ifError(created.error);
const userId = created.data.user.id;

const client = createClient(apiUrl, anonKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const signedIn = await client.auth.signInWithPassword({ email, password });
assert.ifError(signedIn.error);
const token = signedIn.data.session.access_token;

let teamId;
let siteId;
let objectPaths = [];
try {
  const organization = await admin
    .from("organizations")
    .insert({ name: "OmniSite local integration" })
    .select("id")
    .single();
  assert.ifError(organization.error);
  const team = await admin
    .from("teams")
    .insert({
      organization_id: organization.data.id,
      name: "Local Integration Team",
      is_test_team: true,
    })
    .select("id")
    .single();
  assert.ifError(team.error);
  teamId = team.data.id;
  assert.ifError(
    (
      await admin.from("team_memberships").insert({
        team_id: teamId,
        user_id: userId,
        role: "OWNER",
        status: "ACTIVE",
      })
    ).error,
  );
  assert.ifError(
    (
      await admin
        .from("team_module_entitlements")
        .insert({ team_id: teamId, module_key: "omnisite" })
    ).error,
  );
  const template = await client
    .from("site_templates")
    .select("id")
    .eq("status", "PUBLISHED")
    .limit(1)
    .single();
  assert.ifError(template.error);
  const createdSite = await client.rpc("create_team_site", {
    target_team_id: teamId,
    selected_template_id: template.data.id,
    requested_slug: `local-${crypto.randomUUID().slice(0, 8)}`,
    requested_name: "Local Integration Team",
  });
  assert.ifError(createdSite.error);
  siteId = createdSite.data;

  const siteRow = await client
    .from("team_sites")
    .select("*")
    .eq("id", siteId)
    .single();
  const pages = await client
    .from("site_pages")
    .select("*")
    .eq("site_id", siteId)
    .order("nav_order");
  assert.ifError(siteRow.error);
  assert.ifError(pages.error);
  const snapshot = {
    schemaVersion: 3,
    teamId,
    siteId,
    slug: siteRow.data.slug,
    siteName: siteRow.data.site_name,
    layout: siteRow.data.layout_key,
    theme: siteRow.data.theme,
    logoPath: null,
    settings: siteRow.data.settings,
    pages: pages.data.map((page) => ({
      slug: page.slug,
      title: page.title,
      seoDescription: page.seo_description,
      navOrder: page.nav_order,
      visible: page.visible,
      sections: page.sections,
    })),
  };

  const concurrentSaves = await Promise.all([
    createClient(apiUrl, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { headers: { Authorization: `Bearer ${token}` } },
    }).rpc("save_site_draft", {
      target_team_id: teamId,
      target_site_id: siteId,
      expected_revision: 1,
      content: { ...snapshot, siteName: "Concurrent save A" },
    }),
    createClient(apiUrl, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { headers: { Authorization: `Bearer ${token}` } },
    }).rpc("save_site_draft", {
      target_team_id: teamId,
      target_site_id: siteId,
      expected_revision: 1,
      content: { ...snapshot, siteName: "Concurrent save B" },
    }),
  ]);
  assert.equal(concurrentSaves.filter((result) => !result.error).length, 1);
  assert.equal(concurrentSaves.filter((result) => result.error).length, 1);

  const concurrentPublishes = await Promise.all([
    createClient(apiUrl, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { headers: { Authorization: `Bearer ${token}` } },
    }).rpc("publish_site_revision", {
      target_team_id: teamId,
      target_site_id: siteId,
      expected_revision: 2,
      expected_version: 0,
    }),
    createClient(apiUrl, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { headers: { Authorization: `Bearer ${token}` } },
    }).rpc("publish_site_revision", {
      target_team_id: teamId,
      target_site_id: siteId,
      expected_revision: 2,
      expected_version: 0,
    }),
  ]);
  assert.equal(concurrentPublishes.filter((result) => !result.error).length, 1);
  assert.equal(concurrentPublishes.filter((result) => result.error).length, 1);

  const png = await sharp({
    create: {
      width: 96,
      height: 96,
      channels: 3,
      background: "#164e63",
    },
  })
    .png()
    .toBuffer();
  const upload = await fetch(
    `${appUrl}/api/omnisite/media?teamId=${teamId}&siteId=${siteId}`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "image/png",
        "X-File-Extension": "png",
      },
      body: png,
    },
  );
  await assertStatus(upload, 200);
  const uploaded = await upload.json();
  objectPaths.push(uploaded.path);

  const directAuthenticatedWrite = await client.storage
    .from("omnisite-assets")
    .upload(`${teamId}/${siteId}/${crypto.randomUUID()}.webp`, png);
  assert(
    directAuthenticatedWrite.error,
    "browser Storage writes must be denied",
  );
  const directAnonymousRead = await createClient(apiUrl, anonKey, {
    auth: { persistSession: false },
  })
    .storage.from("omnisite-assets")
    .download(uploaded.path);
  assert(directAnonymousRead.error, "anonymous private Storage read must fail");

  const previewUrl = `${appUrl}/api/omnisite/media?slug=${siteRow.data.slug}&path=${encodeURIComponent(uploaded.path)}&preview=1`;
  const unauthorizedPreview = await fetch(previewUrl);
  assert.equal(unauthorizedPreview.status, 404);
  const authorizedPreview = await fetch(previewUrl, {
    headers: { Authorization: `Bearer ${token}` },
  });
  assert.equal(authorizedPreview.status, 200);
  assert.equal(authorizedPreview.headers.get("content-type"), "image/webp");

  const publicBeforeReference = await fetch(
    `${appUrl}/api/omnisite/media?slug=${siteRow.data.slug}&path=${encodeURIComponent(uploaded.path.split("/").at(-1))}`,
  );
  assert.equal(publicBeforeReference.status, 404);

  const current = await client
    .from("team_sites")
    .select("draft_revision,published_version,site_name")
    .eq("id", siteId)
    .single();
  const draftPages = structuredClone(snapshot.pages);
  draftPages[0].sections.push(
    {
      type: "richText",
      heading: "Our story",
      blocks: [
        {
          type: "paragraph",
          children: [
            { text: "Join the team", marks: ["bold"], href: "/contact" },
          ],
        },
      ],
    },
    {
      type: "newsList",
      heading: "News",
      items: [
        {
          title: "Season update",
          summary: "Registration is open.",
          publishedDate: "2026-09-22",
        },
      ],
    },
    {
      type: "eventsList",
      heading: "Events",
      items: [
        {
          title: "Open house",
          summary: "Meet the coaches.",
          date: "2026-10-01",
          time: "18:00",
          location: "Community pool",
        },
      ],
    },
  );
  draftPages[0].sections.push({
    type: "image",
    alt: "Local integration image",
    path: uploaded.path,
  });
  const savedImage = await client.rpc("save_site_draft", {
    target_team_id: teamId,
    target_site_id: siteId,
    expected_revision: current.data.draft_revision,
    content: {
      ...snapshot,
      siteName: current.data.site_name,
      pages: draftPages,
    },
  });
  assert.ifError(savedImage.error);
  const publishedImage = await client.rpc("publish_site_revision", {
    target_team_id: teamId,
    target_site_id: siteId,
    expected_revision: savedImage.data,
    expected_version: current.data.published_version,
  });
  assert.ifError(publishedImage.error);
  const handle = uploaded.path.split("/").at(-1);
  const publicImage = await fetch(
    `${appUrl}/api/omnisite/media?slug=${siteRow.data.slug}&path=${encodeURIComponent(handle)}`,
  );
  await assertStatus(publicImage, 200);

  const deleteReferenced = await fetch(
    `${appUrl}/api/omnisite/media?teamId=${teamId}&siteId=${siteId}&assetId=${uploaded.assetId}`,
    { method: "DELETE", headers: { Authorization: `Bearer ${token}` } },
  );
  assert.equal(deleteReferenced.status, 400);

  const secondUpload = await fetch(
    `${appUrl}/api/omnisite/media?teamId=${teamId}&siteId=${siteId}`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "image/png",
        "X-File-Extension": "png",
      },
      body: png,
    },
  );
  await assertStatus(secondUpload, 200);
  const unused = await secondUpload.json();
  objectPaths.push(unused.path);
  const deleteUnused = await fetch(
    `${appUrl}/api/omnisite/media?teamId=${teamId}&siteId=${siteId}&assetId=${unused.assetId}`,
    { method: "DELETE", headers: { Authorization: `Bearer ${token}` } },
  );
  await assertStatus(deleteUnused, 200);
  objectPaths = objectPaths.filter((path) => path !== unused.path);
  assert(
    (await admin.storage.from("omnisite-assets").download(unused.path)).error,
    "deleted unused object must not remain in Storage",
  );

  const abandonedId = crypto.randomUUID();
  const abandonedPath = `${teamId}/${siteId}/${abandonedId}.webp`;
  assert.ifError(
    (
      await admin.storage
        .from("omnisite-assets")
        .upload(abandonedPath, png, { contentType: "image/webp" })
    ).error,
  );
  assert.ifError(
    (
      await admin.from("site_assets").insert({
        id: abandonedId,
        team_id: teamId,
        site_id: siteId,
        object_path: abandonedPath,
        mime_type: "image/webp",
        bytes: png.length,
        state: "PENDING",
        created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      })
    ).error,
  );
  const reconciled = await fetch(
    `${appUrl}/api/omnisite/media?teamId=${teamId}&siteId=${siteId}`,
    { method: "PATCH", headers: { Authorization: `Bearer ${token}` } },
  );
  await assertStatus(reconciled, 200);
  assert.equal((await reconciled.json()).data.removed, 1);
  assert(
    (await admin.storage.from("omnisite-assets").download(abandonedPath)).error,
    "reconciled object must not remain in Storage",
  );

  const blockedPurge = await admin.rpc("clear_team_records", {
    target_team_id: teamId,
    include_account_access: false,
  });
  assert(blockedPurge.error, "purge must stop while Storage bytes remain");
  assert.ifError(
    (await admin.storage.from("omnisite-assets").remove(objectPaths)).error,
  );
  objectPaths = [];
  assert.ifError(
    (
      await admin.rpc("clear_team_records", {
        target_team_id: teamId,
        include_account_access: false,
      })
    ).error,
  );
  assert.equal(
    (await admin.from("team_sites").select("id").eq("team_id", teamId)).data
      .length,
    0,
  );
  assert((await admin.auth.admin.getUserById(userId)).data.user);
  assert(
    (await admin.from("site_templates").select("id")).data.length >= 3,
    "shared templates must survive tenant purge",
  );

  assert.ifError((await admin.from("teams").delete().eq("id", teamId)).error);
  assert.equal(
    (await admin.from("teams").select("id").eq("id", teamId)).data.length,
    0,
  );
  assert((await admin.auth.admin.getUserById(userId)).data.user);
  console.log(
    "PASS: real local Auth/RLS concurrency, private Storage, controlled preview/public media, deletion, stale-media reconciliation, purge, hard-delete, template preservation, and Auth-user preservation.",
  );
} finally {
  if (objectPaths.length) {
    await admin.storage.from("omnisite-assets").remove(objectPaths);
  }
  if (teamId) await admin.from("teams").delete().eq("id", teamId);
  await admin.auth.admin.deleteUser(userId);
}
