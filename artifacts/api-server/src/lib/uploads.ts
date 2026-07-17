import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import multer from "multer";
import path from "path";
import { promises as fs } from "fs";
import os from "os";
import { randomBytes } from "crypto";

const UPLOADS_DIR = process.env.UPLOADS_DIR?.trim() || path.join(os.tmpdir(), "arc-pass-uploads");
const PUBLIC_PATH_PREFIX = "/uploads";
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;
const ALLOWED_MIME_TYPES = new Set(["image/png", "image/webp", "image/jpeg"]);

const r2Configuration = {
  endpoint: process.env.CLOUDFLARE_R2_ENDPOINT?.trim() ?? "",
  accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY_ID?.trim() ?? "",
  secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY?.trim() ?? "",
  bucket: process.env.CLOUDFLARE_R2_BUCKET?.trim() ?? "",
  publicUrl: process.env.CLOUDFLARE_R2_PUBLIC_URL?.trim().replace(/\/+$/, "") ?? "",
};

export const cloudflareR2Configured = Object.values(r2Configuration).every(Boolean);

let r2Client: S3Client | null = null;

function getR2Client(): S3Client {
  if (!cloudflareR2Configured) throw new Error("Cloudflare R2 is not configured");
  r2Client ??= new S3Client({
    region: "auto",
    endpoint: r2Configuration.endpoint,
    credentials: {
      accessKeyId: r2Configuration.accessKeyId,
      secretAccessKey: r2Configuration.secretAccessKey,
    },
  });
  return r2Client;
}

type DetectedImage = { contentType: "image/png" | "image/webp" | "image/jpeg"; extension: "png" | "webp" | "jpg" };

function detectImage(buffer: Buffer): DetectedImage | null {
  if (buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
    return { contentType: "image/png", extension: "png" };
  }
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return { contentType: "image/jpeg", extension: "jpg" };
  }
  if (buffer.length >= 12 && buffer.subarray(0, 4).toString("ascii") === "RIFF" && buffer.subarray(8, 12).toString("ascii") === "WEBP") {
    return { contentType: "image/webp", extension: "webp" };
  }
  return null;
}

function createObjectKey(extension: DetectedImage["extension"]): string {
  const now = new Date();
  const month = String(now.getUTCMonth() + 1).padStart(2, "0");
  return `arc-pass/${now.getUTCFullYear()}/${month}/${randomBytes(20).toString("hex")}.${extension}`;
}

export const imageUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE_BYTES, files: 1 },
  fileFilter: (_req, file, callback) => {
    if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
      const error = new Error("Unsupported file type — use PNG, WebP, or JPEG") as Error & { status?: number };
      error.status = 400;
      callback(error);
      return;
    }
    callback(null, true);
  },
});

export async function persistUploadedImage(file: Express.Multer.File): Promise<string> {
  const detected = detectImage(file.buffer);
  if (!detected) {
    const error = new Error("The uploaded file is not a valid PNG, WebP, or JPEG image") as Error & { status?: number };
    error.status = 400;
    throw error;
  }

  const objectKey = createObjectKey(detected.extension);
  if (cloudflareR2Configured) {
    await getR2Client().send(new PutObjectCommand({
      Bucket: r2Configuration.bucket,
      Key: objectKey,
      Body: file.buffer,
      ContentType: detected.contentType,
      CacheControl: "public, max-age=31536000, immutable",
    }));
    return `${r2Configuration.publicUrl}/${objectKey}`;
  }

  const localPath = path.join(UPLOADS_DIR, ...objectKey.split("/"));
  await fs.mkdir(path.dirname(localPath), { recursive: true });
  await fs.writeFile(localPath, file.buffer, { flag: "wx" });
  return `${PUBLIC_PATH_PREFIX}/${objectKey}`;
}

export const uploadsStaticDir = UPLOADS_DIR;
export const uploadsPublicPathPrefix = PUBLIC_PATH_PREFIX;
