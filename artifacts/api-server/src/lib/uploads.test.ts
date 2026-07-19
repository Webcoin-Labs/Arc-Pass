import test from "node:test";
import assert from "node:assert/strict";
import { normalizeUploadedImageUrl, uploadedImageKeyFromPath } from "./uploads";

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
