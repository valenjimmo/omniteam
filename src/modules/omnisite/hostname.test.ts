import { describe, expect, it } from "vitest";
import {
  addressMode,
  claimHostname,
  normalizeHostname,
  requestHostname,
} from "./hostname";
describe("hostname boundary", () => {
  it("normalizes case, one trailing dot, and IDNA", () => {
    expect(normalizeHostname("WWW.Example.org.")).toBe("www.example.org");
    expect(normalizeHostname("bücher.de")).toBe("xn--bcher-kva.de");
  });
  it.each([
    "https://example.org",
    "example.org:443",
    "example.org/path",
    "*.example.org",
    "localhost",
    "127.0.0.1",
    "[::1]",
    "example.local",
    "co.uk",
    "com",
    "example.org..",
    "example.org,evil.org",
    "example.org@evil.org",
    " example.org",
    "example.org%00",
    "foo.internal",
    "foo.github.io",
  ])("rejects %s", (host) => expect(() => normalizeHostname(host)).toThrow());
  it("distinguishes exact app hosts, one-level managed subdomains and custom names", () => {
    expect(
      addressMode("app.example.org", "sites.example.org", ["app.example.org"])
        .kind,
    ).toBe("platform");
    expect(
      addressMode("team.sites.example.org", "sites.example.org", []),
    ).toEqual({ kind: "managed", slug: "team" });
    expect(
      addressMode("a.b.sites.example.org", "sites.example.org", []).kind,
    ).toBe("unavailable");
    expect(
      addressMode("admin.sites.example.org", "sites.example.org", []).kind,
    ).toBe("unavailable");
    expect(addressMode("www.club.org", "sites.example.org", []).kind).toBe(
      "custom",
    );
  });
  it("blocks platform claims and keeps IDNA lookalikes distinct", () => {
    expect(() =>
      claimHostname("team.sites.example.org", "sites.example.org", []),
    ).toThrow();
    expect(() =>
      claimHostname("app.example.org", undefined, ["app.example.org"]),
    ).toThrow();
    expect(claimHostname("www.club.org", undefined, [])).toBe("www.club.org");
    expect(normalizeHostname("аpple.com")).not.toBe("apple.com");
  });
  it("rejects multiple host headers and limits localhost exception", () => {
    expect(() => requestHostname("example.org,evil.org")).toThrow();
    expect(requestHostname("localhost:3000", true)).toBe("localhost");
    expect(() => requestHostname("localhost:3000")).toThrow();
  });
});
