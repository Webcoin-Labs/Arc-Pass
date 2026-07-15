import multer from "multer";
import path from "path";
import fs from "fs";
import { randomBytes } from "crypto";

// Local-disk storage adapter — works out of the box with no external
// credentials. Swap for an S3/R2/Cloudinary-backed implementation in
// production by pointing UPLOADS_DIR at a mounted volume or replacing this
// module's storage engine; nothing else in the app needs to change since
// routes only depend on the `url` this module returns.
const UPLOADS_DIR = process.env.UPLOADS_DIR ?? path.resolve(process.cwd(), "uploads");
const PUBLIC_PATH_PREFIX = "/uploads";
const MAX_FILE_SIZE_BYTES = 2 * 1024 * 1024; // 2MB — plenty for a logo/emblem

if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
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
