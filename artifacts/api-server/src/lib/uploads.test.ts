import test from "node:test";
import assert from "node:assert/strict";
import sharp from "sharp";
import { normalizeUploadedImageUrl, optimizeUploadedImage, uploadedImageKeyFromPath } from "./uploads";

test("uploaded image paths only accept generated Arc Pass object keys", () => {
  const key = "arc-pass/2026/07/2f225e5b09514281c177881b6593ed2b1a58e344.jpg";

  assert.equal(uploadedImageKeyFromPath(`/uploads/${key}`), key);
  assert.equal(uploadedImageKeyFromPath(`/${key}`), key);
  assert.equal(uploadedImageKeyFromPath("/uploads/../../private.txt"), null);
  assert.equal(uploadedImageKeyFromPath("/uploads/arc-pass/2026/07/logo.svg"), null);
});

test("legacy R2 public URLs are normalized to the same-origin upload route", () => {
  const publicUrl = "https://assets.arc.webcoinlabs.com";
  const key = "arc-pass/2026/07/2f225e5b09514281c177881b6593ed2b1a58e344.jpg";

  assert.equal(normalizeUploadedImageUrl(`${publicUrl}/${key}`, publicUrl), `/uploads/${key}`);
  assert.equal(normalizeUploadedImageUrl(`/uploads/${key}`, publicUrl), `/uploads/${key}`);
  assert.equal(normalizeUploadedImageUrl("https://example.com/logo.png", publicUrl), "https://example.com/logo.png");
  assert.equal(normalizeUploadedImageUrl(null, publicUrl), null);
});

test("converts admin image uploads to metadata-free WebP", async () => {
  const png = await sharp({
    create: {
      width: 64,
      height: 64,
      channels: 4,
      background: { r: 25, g: 90, b: 210, alpha: 0.7 },
    },
  }).png().withMetadata({ orientation: 6 }).toBuffer();

  const output = await optimizeUploadedImage(png);
  const metadata = await sharp(output).metadata();

  assert.equal(metadata.format, "webp");
  assert.equal(metadata.orientation, undefined);
  assert.ok((metadata.width ?? 0) <= 2048);
  assert.ok((metadata.height ?? 0) <= 2048);
});
