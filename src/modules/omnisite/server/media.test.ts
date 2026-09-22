import { expect, it } from "vitest";
import sharp from "sharp";
import { validateImage } from "./media";
it("decodes, strips trailing payload, and re-encodes valid images", async () => {
  const png = await sharp({
    create: { width: 64, height: 64, channels: 3, background: "#164e63" },
  })
    .png()
    .toBuffer();
  const r = await validateImage(
    Buffer.concat([png, Buffer.from("<script>alert(1)</script>")]),
    "image/png",
  );
  expect(r.mime).toBe("image/webp");
  expect((await sharp(r.bytes).metadata()).format).toBe("webp");
  expect(r.bytes.toString().includes("<script>")).toBe(false);
  await expect(validateImage(png, "image/jpeg")).rejects.toThrow();
});
it("rejects SVG, invalid bytes, excessive sizes and dimensions", async () => {
  await expect(
    validateImage(Buffer.from('<svg onload="alert(1)"></svg>'), "image/png"),
  ).rejects.toThrow();
  await expect(
    validateImage(Buffer.alloc(2097153), "image/png"),
  ).rejects.toThrow();
  const tiny = await sharp({
    create: { width: 1, height: 1, channels: 3, background: "#fff" },
  })
    .png()
    .toBuffer();
  await expect(validateImage(tiny, "image/png")).rejects.toThrow();
});
