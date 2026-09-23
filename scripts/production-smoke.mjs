const origin = (process.env.PRODUCTION_SMOKE_URL || "https://omniteam-seven.vercel.app").replace(/\/$/, "");
const slug = process.env.PRODUCTION_SMOKE_SITE_SLUG;

async function check(path, expectedStatuses) {
  const response = await fetch(`${origin}${path}`, { redirect: "manual", signal: AbortSignal.timeout(15000) });
  if (!expectedStatuses.includes(response.status)) throw new Error(`${path} returned ${response.status}`);
  const type = response.headers.get("content-type") ?? "";
  if (response.status === 200 && !type.includes("text/html")) throw new Error(`${path} did not return HTML`);
  if (response.status === 200 && !response.headers.get("x-content-type-options")) throw new Error(`${path} is missing security headers`);
  console.log(JSON.stringify({ event: "production_smoke_check", path, status: response.status }));
}

await check("/", [200]);
await check("/platform", [200, 307, 308]);
await check("/platform/login", [200]);
await check("/sites/__omnisite-unknown__", [404]);
if (slug) await check(`/sites/${encodeURIComponent(slug)}`, [200]);
