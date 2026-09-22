import { afterEach, describe, expect, it, vi } from "vitest";
const { rpc, create } = vi.hoisted(() => ({ rpc: vi.fn(), create: vi.fn() }));
vi.mock("@supabase/supabase-js", () => ({ createClient: create }));
import { resolveHostname, publicClient } from "./resolver";
afterEach(() => {
  vi.unstubAllEnvs();
  vi.clearAllMocks();
});
function setup() {
  vi.stubEnv("NODE_ENV", "production");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://sample.supabase.co");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "test");
  vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://app.platform.org");
  vi.stubEnv("OMNISITE_ROOT_DOMAIN", "sites.platform.org");
  vi.stubEnv("OMNISITE_MANAGED_DOMAINS_READY", "true");
  create.mockReturnValue({ rpc });
}
describe("shared hostname resolver and cache isolation", () => {
  it("routes managed hosts by exact slug and rejects nested/reserved names", async () => {
    setup();
    expect(await resolveHostname("team-a.sites.platform.org")).toEqual({
      kind: "site",
      host: "team-a.sites.platform.org",
      slug: "team-a",
    });
    expect(await resolveHostname("team-b.sites.platform.org")).toMatchObject({
      slug: "team-b",
    });
    expect(await resolveHostname("admin.sites.platform.org")).toBeNull();
    expect(await resolveHostname("a.b.sites.platform.org")).toBeNull();
    expect(rpc).not.toHaveBeenCalled();
  });
  it("fails closed until wildcard hosting is explicitly enabled", async () => {
    setup();
    vi.stubEnv("OMNISITE_MANAGED_DOMAINS_READY", "false");
    expect(await resolveHostname("team.sites.platform.org")).toBeNull();
  });
  it("uses exact normalized custom-host lookups and handles unknown hosts", async () => {
    setup();
    rpc
      .mockResolvedValueOnce({ data: "team-a", error: null })
      .mockResolvedValueOnce({ data: null, error: null });
    expect(await resolveHostname("WWW.Club.org.")).toMatchObject({
      slug: "team-a",
      host: "www.club.org",
    });
    expect(rpc).toHaveBeenCalledWith("resolve_site_hostname", {
      requested_host: "www.club.org",
    });
    expect(await resolveHostname("unknown.org")).toBeNull();
  });
  it("rejects poisoned host headers before making database requests", async () => {
    setup();
    expect(await resolveHostname("app.platform.org,evil.org")).toBeNull();
    expect(await resolveHostname("app.platform.org:443")).toBeNull();
    expect(rpc).not.toHaveBeenCalled();
  });
  it("accepts a port only for an explicitly configured local app host", async () => {
    setup();
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "http://127.0.0.1:3100");
    expect(await resolveHostname("127.0.0.1:3100")).toEqual({
      kind: "platform",
      host: "127.0.0.1",
    });
    expect(await resolveHostname("localhost:3100")).toBeNull();
  });
  it("explicitly disables shared fetch caching", async () => {
    setup();
    const fetcher = vi.fn().mockResolvedValue(new Response("{}"));
    vi.stubGlobal("fetch", fetcher);
    publicClient();
    const options = create.mock.calls.at(-1)?.[2];
    await options.global.fetch(
      "https://sample.supabase.co/rest/v1/rpc/get_public_site",
      { method: "POST", body: '{"requested_slug":"team-a"}' },
    );
    expect(fetcher).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        cache: "no-store",
        body: '{"requested_slug":"team-a"}',
      }),
    );
    vi.unstubAllGlobals();
  });
});
