import multer from "multer";
import path from "path";
import fs from "fs";
import os from "os";
import { randomBytes } from "crypto";
import { logger } from "./logger";

// Local-disk storage adapter — works out of the box with no external
// credentials. Swap for an S3/R2/Cloudinary-backed implementation in
// production by pointing UPLOADS_DIR at a mounted volume or replacing this
// module's storage engine; nothing else in the app needs to change since
// routes only depend on the `url` this module returns.
//
// Defaults to the OS temp dir rather than a project-relative folder because
// serverless runtimes (Vercel, Lambda) ship a read-only deployment bundle —
// only os.tmpdir() is guaranteed writable there. It's still ephemeral (does
// not survive across invocations/deploys), so uploaded logos won't persist
// on a serverless host until UPLOADS_DIR points at real persistent/object
// storage — this only guarantees the app doesn't crash on boot.
const UPLOADS_DIR = process.env.UPLOADS_DIR ?? path.join(os.tmpdir(), "arc-pass-uploads");
const PUBLIC_PATH_PREFIX = "/uploads";
const MAX_FILE_SIZE_BYTES = 2 * 1024 * 1024; // 2MB — plenty for a logo/emblem

try {
  if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  }
} catch (err) {
  // Never let a read-only filesystem take the whole API down at import
  // time — company-logo upload just won't work until UPLOADS_DIR is fixed.
  logger.error({ err, UPLOADS_DIR }, "Could not create uploads directory — image uploads will fail until this is fixed");
}

const ALLOWED_MIME_TYPES = new Set(["image/png", "image/webp", "image/jpeg", "image/svg+xml"]);

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOADS_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${randomBytes(16).toString("hex")}${ext}`);
  },
});

export const imageUpload = multer({
  storage,
  limits: { fileSize: MAX_FILE_SIZE_BYTES },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
      cb(new Error("Unsupported file type — use PNG, WebP, JPEG, or SVG"));
      return;
    }
    cb(null, true);
  },
});

export function publicUploadUrl(filename: string): string {
  return `${PUBLIC_PATH_PREFIX}/${filename}`;
}

export const uploadsStaticDir = UPLOADS_DIR;
export const uploadsPublicPathPrefix = PUBLIC_PATH_PREFIX;
