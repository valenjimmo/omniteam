import { beforeEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  access: vi.fn(),
  rpc: vi.fn(),
  adminRpc: vi.fn(),
  verify: vi.fn(),
  ready: vi.fn(),
  single: vi.fn(),
}));
vi.mock("./access", async () => {
  const original = await vi.importActual<typeof import("./access")>("./access");
  return {
    ...original,
    siteAccess: mocks.access,
    createSupabaseAdminClient: () => ({ rpc: mocks.adminRpc }),
  };
});
vi.mock("./domains", () => ({
  verifyDomain: mocks.verify,
  manualProvider: { ready: mocks.ready },
}));
import { POST } from "@/app/api/omnisite/route";
const teamId = "30000000-0000-4000-8000-000000000001",
  siteId = "40000000-0000-4000-8000-000000000001";
const send = (body: unknown) =>
  POST(
    new Request("https://app.example.org/api/omnisite", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
  );
beforeEach(() => {
  vi.clearAllMocks();
  const chain = { select: () => chain, eq: () => chain, single: mocks.single };
  mocks.access.mockResolvedValue({
    client: { rpc: mocks.rpc, from: () => chain },
    userId: "10000000-0000-4000-8000-000000000001",
  });
  mocks.rpc.mockResolvedValue({ data: 2, error: null });
  mocks.adminRpc.mockResolvedValue({ data: "ok", error: null });
});
it("rejects mass assignment and malformed IDs before authorization", async () => {
  const r = await send({
    action: "enabled",
    teamId,
    siteId,
    enabled: true,
    role: "OWNER",
  });
  expect(r.status).toBe(400);
  expect(mocks.access).not.toHaveBeenCalled();
  expect(mocks.rpc).not.toHaveBeenCalled();
});
it("denies writes when server authorization fails", async () => {
  mocks.access.mockRejectedValue(new Error("Access denied"));
  const r = await send({ action: "enabled", teamId, siteId, enabled: true });
  expect(r.status).toBe(403);
  expect(mocks.rpc).not.toHaveBeenCalled();
});
it("passes exact revisions to atomic publish and preserves conflicts", async () => {
  mocks.rpc.mockResolvedValue({
    error: { message: "Website changed. Reload before publishing." },
  });
  const r = await send({
    action: "publish",
    teamId,
    siteId,
    revision: 4,
    version: 2,
  });
  expect(r.status).toBe(409);
  expect(mocks.rpc).toHaveBeenCalledWith("publish_site_revision", {
    target_team_id: teamId,
    target_site_id: siteId,
    expected_revision: 4,
    expected_version: 2,
    source_version: null,
  });
});
it("does not accept browser-reported DNS verification", async () => {
  const r = await send({
    action: "domain",
    teamId,
    siteId,
    operation: "verify",
    verified: true,
  });
  expect(r.status).toBe(400);
  expect(mocks.adminRpc).not.toHaveBeenCalled();
});
it("records failed server-side DNS check without activating", async () => {
  mocks.single.mockResolvedValue({
    data: { hostname: "www.club.org", verification_token: "token" },
    error: null,
  });
  mocks.verify.mockResolvedValue(false);
  mocks.ready.mockResolvedValue(true);
  const r = await send({
    action: "domain",
    teamId,
    siteId,
    operation: "activate",
    domainId: siteId,
  });
  expect(r.status).toBe(200);
  expect(mocks.verify).toHaveBeenCalledWith("www.club.org", "token");
  expect(mocks.adminRpc).toHaveBeenCalledTimes(1);
  expect(mocks.adminRpc).toHaveBeenCalledWith(
    "os_domain_operation",
    expect.objectContaining({ operation: "failed", t: teamId, s: siteId }),
  );
});
it("bounds request bodies", async () => {
  const r = await POST(
    new Request("https://app.example.org/api/omnisite", {
      method: "POST",
      body: " ".repeat(500001),
    }),
  );
  expect(r.status).toBe(400);
  expect(mocks.access).not.toHaveBeenCalled();
});
