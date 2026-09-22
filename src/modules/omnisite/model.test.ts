import { describe, expect, it } from "vitest";
import {
  DEFAULT_THEME,
  DEFAULT_SETTINGS,
  contrastText,
  pageSchema,
  snapshotSchema,
  sectionSchema,
  templateSchema,
  slugSchema,
  mediaUrl,
  isSafeLink,
} from "./model";
const home = {
  slug: "home",
  title: "Home",
  seoDescription: "",
  navOrder: 0,
  visible: true,
  sections: [{ type: "hero", heading: "Welcome", text: "Swim together" }],
};
const base = {
  schemaVersion: 3,
  teamId: "00000000-0000-4000-8000-000000000001",
  siteId: "00000000-0000-4000-8000-000000000002",
  slug: "team",
  siteName: "Team",
  layout: "classic",
  theme: DEFAULT_THEME,
  settings: DEFAULT_SETTINGS,
  logoPath: null,
  pages: [home],
};
describe("OmniSite hostile content boundaries", () => {
  it("accepts bounded pages and chooses readable text", () => {
    expect(pageSchema.safeParse(home).success).toBe(true);
    expect(contrastText("#000000")).toBe("#ffffff");
    expect(contrastText("#ffffff")).toBe("#000000");
  });
  it.each([
    "javascript:alert(1)",
    "data:text/html,test",
    "//evil.org",
    "/\\evil.org",
    "https://user:pass@evil.org",
    "https://evil.org\n/path",
    "/%2f/evil.org",
    "/api?redirect=https://evil.org",
  ])("rejects unsafe link %s", (href) => expect(isSafeLink(href)).toBe(false));
  it.each(["/contact", "https://example.org/contact#join"])(
    "allows safe link %s",
    (href) => expect(isSafeLink(href)).toBe(true),
  );
  it.each(["api", "www", "admin", "robots", "auth", "../home", "Home", "a/b"])(
    "rejects reserved or unsafe slug %s",
    (s) => expect(slugSchema.safeParse(s).success).toBe(false),
  );
  it("rejects arbitrary properties for every section", () => {
    const sections = [
      home.sections[0],
      { type: "richText", heading: "H", text: "T" },
      {
        type: "image",
        alt: "Pool",
        path: `${base.teamId}/${base.siteId}/00000000-0000-4000-8000-000000000003.webp`,
      },
      { type: "cta", heading: "H", label: "Go", href: "/contact" },
      { type: "cards", heading: "H", items: [{ title: "T", text: "D" }] },
      {
        type: "newsList",
        heading: "News",
        items: [
          { title: "Update", summary: "Details", publishedDate: "2026-09-22" },
        ],
      },
      {
        type: "eventsList",
        heading: "Events",
        items: [
          { title: "Meetup", summary: "Public details", date: "2026-10-01" },
        ],
      },
    ];
    for (const s of sections) {
      expect(sectionSchema.safeParse(s).success).toBe(true);
      expect(
        sectionSchema.safeParse({ ...s, onClick: "alert(1)" }).success,
      ).toBe(false);
    }
  });
  it("accepts only explicit rich-text marks and safe links", () => {
    const section = {
      type: "richText",
      heading: "Story",
      blocks: [
        {
          type: "paragraph",
          children: [{ text: "Join us", marks: ["bold"], href: "/contact" }],
        },
      ],
    };
    expect(sectionSchema.safeParse(section).success).toBe(true);
    expect(
      sectionSchema.safeParse({
        ...section,
        blocks: [
          { type: "paragraph", children: [{ text: "Bad", marks: ["script"] }] },
        ],
      }).success,
    ).toBe(false);
    expect(
      sectionSchema.safeParse({
        ...section,
        blocks: [
          {
            type: "paragraph",
            children: [{ text: "Bad", marks: [], href: "javascript:alert(1)" }],
          },
        ],
      }).success,
    ).toBe(false);
    expect(
      sectionSchema.safeParse({
        ...section,
        blocks: [
          {
            type: "paragraph",
            children: [{ text: "<script>alert(1)</script>", marks: [] }],
          },
        ],
      }).success,
    ).toBe(true);
  });
  it("validates news and event dates and links", () => {
    expect(
      sectionSchema.safeParse({
        type: "newsList",
        heading: "News",
        items: [{ title: "Update", summary: "", publishedDate: "2026-02-30" }],
      }).success,
    ).toBe(false);
    expect(
      sectionSchema.safeParse({
        type: "eventsList",
        heading: "Events",
        items: [
          { title: "Meet", summary: "", date: "2026-09-22", time: "25:00" },
        ],
      }).success,
    ).toBe(false);
    expect(
      sectionSchema.safeParse({
        type: "eventsList",
        heading: "Events",
        items: [
          {
            title: "Meet",
            summary: "",
            date: "2026-09-22",
            href: "http://example.com",
          },
        ],
      }).success,
    ).toBe(false);
  });
  it("rejects remote images, empty alt, oversized text, and schema downgrade", () => {
    expect(
      sectionSchema.safeParse({
        type: "image",
        alt: "Pool",
        url: "https://evil.org/a.png",
      }).success,
    ).toBe(false);
    expect(
      sectionSchema.safeParse({
        type: "richText",
        heading: "H",
        text: "x".repeat(5001),
      }).success,
    ).toBe(false);
    expect(
      snapshotSchema.safeParse({ ...base, schemaVersion: 0 }).success,
    ).toBe(false);
    expect(
      snapshotSchema.safeParse({ ...base, schemaVersion: 99 }).success,
    ).toBe(false);
  });
  it("supports safe v1 snapshots, rejects cross-tenant images and duplicate pages", () => {
    expect(
      snapshotSchema.safeParse({ ...base, schemaVersion: 1 }).success,
    ).toBe(true);
    expect(
      snapshotSchema.safeParse({
        ...base,
        logoPath: `00000000-0000-4000-8000-000000000099/${base.siteId}.webp`,
      }).success,
    ).toBe(false);
    expect(
      snapshotSchema.safeParse({ ...base, pages: [home, home] }).success,
    ).toBe(false);
    expect(
      snapshotSchema.safeParse({
        ...base,
        pages: [{ ...home, visible: false }],
      }).success,
    ).toBe(false);
  });
  it("keeps template content separate and rejects tenant asset references", () => {
    const t = {
      name: "Sample",
      layout_key: "classic",
      status: "PUBLISHED",
      default_theme: DEFAULT_THEME,
      starter_pages: [home],
    };
    expect(templateSchema.safeParse(t).success).toBe(true);
    expect(
      templateSchema.safeParse({
        ...t,
        starter_pages: [
          {
            ...home,
            sections: [
              {
                type: "image",
                alt: "Image",
                path: `${base.teamId}/${base.siteId}.webp`,
              },
            ],
          },
        ],
      }).success,
    ).toBe(false);
  });
  it("uses controlled media delivery instead of public Storage", () => {
    expect(mediaUrl("team", "a/b.webp", true)).toBe(
      "/api/omnisite/media?slug=team&path=a%2Fb.webp&preview=1",
    );
  });
});
