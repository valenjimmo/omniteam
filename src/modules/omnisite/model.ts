import { z } from "zod";

export const reservedSlugs = new Set([
  "api",
  "app",
  "admin",
  "support",
  "auth",
  "mail",
  "status",
  "assets",
  "cdn",
  "www",
  "sites",
  "omnisite",
  "platform",
  "robots",
  "sitemap",
  "login",
  "_next",
]);
export const slugSchema = z
  .string()
  .min(1)
  .max(63)
  .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/)
  .refine((s) => !reservedSlugs.has(s), "This address is reserved.");
export const color = z.string().regex(/^#[0-9a-fA-F]{6}$/);
export const themeSchema = z
  .object({
    primary: color,
    secondary: color,
    accent: color,
    surface: z.enum(["light", "dark"]),
  })
  .strict();
export function isSafeLink(value: string) {
  if (
    /[\s\\\x00-\x1f\x7f]/.test(value) ||
    /%(?:0[0-9a-f]|1[0-9a-f]|7f|5c|2f)/i.test(value)
  )
    return false;
  if (/^\/(?!\/)[a-z0-9/-]*(?:#[a-z0-9-]+)?$/i.test(value)) return true;
  try {
    const u = new URL(value);
    return (
      u.protocol === "https:" && !!u.hostname && !u.username && !u.password
    );
  } catch {
    return false;
  }
}
const safeLink = z
  .string()
  .max(500)
  .refine(isSafeLink, "Use an HTTPS link or a local page path.");
export const objectPath = z
  .string()
  .max(250)
  .regex(
    /^[0-9a-f-]{36}\/(?:[0-9a-f-]{36}\/)?[0-9a-f-]{36}\.(?:png|jpg|webp)$/,
  );
export const sectionSchema = z.discriminatedUnion("type", [
  z
    .object({
      type: z.literal("hero"),
      hidden: z.boolean().optional(),
      heading: z.string().min(1).max(160),
      text: z.string().max(1000),
    })
    .strict(),
  // Plain text is intentionally the constrained rich-text representation in this milestone.
  z
    .object({
      type: z.literal("richText"),
      hidden: z.boolean().optional(),
      heading: z.string().max(160),
      text: z.string().max(5000),
    })
    .strict(),
  z
    .object({
      type: z.literal("image"),
      hidden: z.boolean().optional(),
      alt: z.string().min(1).max(160),
      path: objectPath,
    })
    .strict(),
  z
    .object({
      type: z.literal("cta"),
      hidden: z.boolean().optional(),
      heading: z.string().max(160),
      label: z.string().min(1).max(80),
      href: safeLink,
    })
    .strict(),
  z
    .object({
      type: z.literal("cards"),
      hidden: z.boolean().optional(),
      heading: z.string().max(160),
      items: z
        .array(
          z
            .object({
              title: z.string().min(1).max(100),
              text: z.string().max(400),
            })
            .strict(),
        )
        .min(1)
        .max(8),
    })
    .strict(),
]);
export const pageSchema = z
  .object({
    slug: slugSchema,
    title: z.string().min(1).max(120),
    seoDescription: z.string().max(300).default(""),
    navOrder: z.number().int().min(0).max(1000),
    visible: z.boolean().default(true),
    sections: z.array(sectionSchema).max(30),
  })
  .strict();
export const pagesSchema = z
  .array(pageSchema)
  .min(1)
  .max(50)
  .superRefine((pages, ctx) => {
    if (!pages.some((p) => p.slug === "home" && p.visible))
      ctx.addIssue({ code: "custom", message: "Keep a visible Home page." });
    if (new Set(pages.map((p) => p.slug)).size !== pages.length)
      ctx.addIssue({
        code: "custom",
        message: "Each page needs a unique address.",
      });
    for (const p of pages)
      if (p.sections.filter((s) => s.type === "hero" && !s.hidden).length > 1)
        ctx.addIssue({
          code: "custom",
          message: "Use at most one hero per page.",
        });
  });
export const settingsSchema = z
  .object({
    typography: z.enum(["sans", "serif", "humanist"]).default("sans"),
    faviconPath: objectPath.nullable().default(null),
    socialImagePath: objectPath.nullable().default(null),
    seoTitle: z.string().max(120).default(""),
    seoDescription: z.string().max(300).default(""),
  })
  .strict();
export const snapshotSchema = z
  .object({
    schemaVersion: z.union([z.literal(1), z.literal(2)]),
    teamId: z.string().uuid(),
    siteId: z.string().uuid(),
    slug: slugSchema,
    siteName: z.string().min(1).max(120),
    layout: z.enum(["classic", "bold", "minimal"]),
    theme: themeSchema,
    logoPath: objectPath.nullable(),
    settings: settingsSchema.default({
      typography: "sans",
      faviconPath: null,
      socialImagePath: null,
      seoTitle: "",
      seoDescription: "",
    }),
    pages: pagesSchema,
  })
  .strict()
  .superRefine((site, ctx) => {
    for (const path of assetPaths(site))
      if (!path.startsWith(`${site.teamId}/`))
        ctx.addIssue({
          code: "custom",
          message: "Asset belongs to a different team.",
        });
  });
export const templateSchema = z
  .object({
    name: z.string().min(1).max(120),
    layout_key: z.enum(["classic", "bold", "minimal"]),
    default_theme: themeSchema,
    starter_pages: pagesSchema,
    status: z.enum(["DRAFT", "PUBLISHED", "RETIRED"]),
  })
  .strict()
  .refine(
    (t) =>
      t.starter_pages.every((p) => p.sections.every((s) => s.type !== "image")),
    "Shared templates use safe sample text; tenant media cannot be shared.",
  );
export type SiteSnapshot = z.infer<typeof snapshotSchema>;
export type SitePage = z.infer<typeof pageSchema>;
export type SiteSection = z.infer<typeof sectionSchema>;
export type SiteTheme = z.infer<typeof themeSchema>;
export const DEFAULT_THEME: SiteTheme = {
  primary: "#164e63",
  secondary: "#0e7490",
  accent: "#f59e0b",
  surface: "light",
};
export const DEFAULT_SETTINGS = settingsSchema.parse({});
export function assetPaths(site: {
  logoPath: string | null;
  settings?: { faviconPath: string | null; socialImagePath: string | null };
  pages: SitePage[];
}) {
  return [
    ...new Set(
      [
        site.logoPath,
        site.settings?.faviconPath,
        site.settings?.socialImagePath,
        ...site.pages.flatMap((p) =>
          p.sections.flatMap((s) => (s.type === "image" ? [s.path] : [])),
        ),
      ].filter((s): s is string => !!s),
    ),
  ];
}
function luminance(hex: string) {
  const values = [1, 3, 5]
    .map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((n) => (n <= 0.04045 ? n / 12.92 : ((n + 0.055) / 1.055) ** 2.4));
  return 0.2126 * values[0] + 0.7152 * values[1] + 0.0722 * values[2];
}
export function contrastText(background: string) {
  const l = luminance(background);
  return 1.05 / (l + 0.05) >= (l + 0.05) / 0.05 ? "#ffffff" : "#000000";
}
export function mediaUrl(slug: string, path: string, preview = false) {
  return `/api/omnisite/media?slug=${encodeURIComponent(slug)}&path=${encodeURIComponent(preview ? path : path.split("/").pop()!)}${preview ? "&preview=1" : ""}`;
}
// Public projection carries opaque media handles, never tenant/site IDs or Storage keys.
export const mediaHandle = z.string().regex(/^[0-9a-f-]{36}\.(png|jpg|webp)$/);
const publicSectionSchema = z.discriminatedUnion("type", [
  sectionSchema.options[0],
  sectionSchema.options[1],
  z
    .object({
      type: z.literal("image"),
      hidden: z.boolean().optional(),
      alt: z.string().min(1).max(160),
      path: mediaHandle,
    })
    .strict(),
  sectionSchema.options[3],
  sectionSchema.options[4],
]);
export const publicSnapshotSchema = z
  .object({
    schemaVersion: z.union([z.literal(1), z.literal(2)]),
    slug: slugSchema,
    siteName: z.string().min(1).max(120),
    layout: z.enum(["classic", "bold", "minimal"]),
    theme: themeSchema,
    logoPath: mediaHandle.nullable(),
    settings: settingsSchema.extend({
      faviconPath: mediaHandle.nullable(),
      socialImagePath: mediaHandle.nullable(),
    }),
    pages: z
      .array(
        pageSchema.extend({ sections: z.array(publicSectionSchema).max(30) }),
      )
      .min(1)
      .max(50),
  })
  .strict();
export type DisplaySnapshot = Omit<SiteSnapshot, "teamId" | "siteId">;
