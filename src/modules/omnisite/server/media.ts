import "server-only";
import sharp from "sharp";
export async function validateImage(bytes: Buffer, claimedType: string) {
  if (!bytes.length || bytes.length > 2097152)
    throw new Error("Use an image under 2 MB.");
  const meta = await sharp(bytes, {
    limitInputPixels: 9000000,
    animated: true,
  }).metadata();
  const types = { png: "image/png", jpeg: "image/jpeg", webp: "image/webp" };
  if (
    !meta.format ||
    !(meta.format in types) ||
    types[meta.format as keyof typeof types] !== claimedType ||
    (meta.pages ?? 1) !== 1 ||
    !meta.width ||
    !meta.height ||
    meta.width < 16 ||
    meta.height < 16 ||
    meta.width > 3000 ||
    meta.height > 3000
  )
    throw new Error(
      "Use a static PNG, JPEG, or WebP between 16 and 3000 pixels.",
    );
  // Decode and re-encode: strip metadata and trailing/polyglot payloads.
  const clean = await sharp(bytes, { limitInputPixels: 9000000 })
    .rotate()
    .webp({ quality: 90 })
    .toBuffer();
  if (clean.length > 2097152)
    throw new Error("The processed image is too large.");
  return {
    bytes: clean,
    width: meta.width,
    height: meta.height,
    mime: "image/webp" as const,
  };
}
