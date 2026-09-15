import { z } from "zod";

export const color = z.string().regex(/^#[0-9a-fA-F]{6}$/);
export const themeSchema = z.object({ primary: color, secondary: color, accent: color,
  surface: z.enum(["light", "dark"]) }).strict();
const safeLink = z.string().max(500).refine((value) => value.startsWith("/") && !value.startsWith("//") || /^https:\/\//i.test(value));
export const sectionSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("hero"), heading: z.string().max(160), text: z.string().max(1000) }).strict(),
  z.object({ type: z.literal("richText"), heading: z.string().max(160), text: z.string().max(5000) }).strict(),
  z.object({ type: z.literal("image"), alt: z.string().max(160), url: safeLink }).strict(),
  z.object({ type: z.literal("cta"), heading: z.string().max(160), label: z.string().max(80), href: safeLink }).strict(),
  z.object({ type: z.literal("cards"), heading: z.string().max(160), items: z.array(z.object({ title: z.string().max(100), text: z.string().max(400) }).strict()).max(8) }).strict(),
]);
export const pageSchema = z.object({ slug: z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/).max(63),
  title: z.string().min(1).max(120), seoDescription: z.string().max(300).default(""),
  navOrder: z.number().int().min(0).max(1000), visible: z.boolean().default(true),
  sections: z.array(sectionSchema).max(30) }).strict();
export const snapshotSchema = z.object({ schemaVersion: z.literal(1), teamId: z.string().uuid(), siteId: z.string().uuid(),
  slug: z.string(), siteName: z.string(), layout: z.enum(["classic", "bold", "minimal"]),
  theme: themeSchema, logoPath: z.string().nullable(), pages: z.array(pageSchema).max(50) }).strict();
export type SiteSnapshot = z.infer<typeof snapshotSchema>;
export type SitePage = z.infer<typeof pageSchema>;
export type SiteSection = z.infer<typeof sectionSchema>;
export type SiteTheme = z.infer<typeof themeSchema>;
export const DEFAULT_THEME: SiteTheme = { primary: "#164e63", secondary: "#0e7490", accent: "#f59e0b", surface: "light" };

function luminance(hex: string) {
  const values = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((n) => n <= .04045 ? n / 12.92 : ((n + .055) / 1.055) ** 2.4);
  return .2126 * values[0] + .7152 * values[1] + .0722 * values[2];
}
export function contrastText(background: string) {
  const l = luminance(background);
  return (1.05 / (l + .05)) >= ((l + .05) / .05) ? "#ffffff" : "#000000";
}
export function logoPublicUrl(baseUrl: string, path: string | null) {
  return path ? `${baseUrl}/storage/v1/object/public/omnisite-assets/${path.split("/").map(encodeURIComponent).join("/")}` : null;
}
