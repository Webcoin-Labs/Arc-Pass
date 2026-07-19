import { GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import type { RequestHandler } from "express";
import multer from "multer";
import path from "path";
import { promises as fs } from "fs";
import os from "os";
import { randomBytes } from "crypto";

const UPLOADS_DIR = process.env.UPLOADS_DIR?.trim() || path.join(os.tmpdir(), "arc-pass-uploads");
const PUBLIC_PATH_PREFIX = "/uploads";
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;
const ALLOWED_MIME_TYPES = new Set(["image/png", "image/webp", "image/jpeg"]);
const GENERATED_IMAGE_KEY = /^arc-pass\/\d{4}\/\d{2}\/[a-f0-9]{40}\.(?:png|webp|jpg)$/;

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

export function uploadedImageKeyFromPath(requestPath: string): string | null {
  const withoutQuery = requestPath.split("?", 1)[0] ?? "";
  const candidate = withoutQuery.replace(/^\/+/, "").replace(/^uploads\//, "");
  return GENERATED_IMAGE_KEY.test(candidate) ? candidate : null;
}

export function normalizeUploadedImageUrl(value: string | null | undefined, publicUrl = r2Configuration.publicUrl): string | null | undefined {
  if (!value || value.startsWith(`${PUBLIC_PATH_PREFIX}/`) || !publicUrl) return value;

  try {
    const configuredBase = new URL(`${publicUrl.replace(/\/+$/, "")}/`);
    const candidate = new URL(value);
    if (candidate.origin !== configuredBase.origin || !candidate.pathname.startsWith(configuredBase.pathname)) return value;

    const objectKey = uploadedImageKeyFromPath(candidate.pathname.slice(configuredBase.pathname.length));
    return objectKey ? `${PUBLIC_PATH_PREFIX}/${objectKey}` : value;
  } catch {
    return value;
  }
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
    return `${PUBLIC_PATH_PREFIX}/${objectKey}`;
  }

  const localPath = path.join(UPLOADS_DIR, ...objectKey.split("/"));
  await fs.mkdir(path.dirname(localPath), { recursive: true });
  await fs.writeFile(localPath, file.buffer, { flag: "wx" });
  return `${PUBLIC_PATH_PREFIX}/${objectKey}`;
}

export const serveUploadedImage: RequestHandler = async (req, res, next) => {
  if (!cloudflareR2Configured) {
    next();
    return;
  }

  const objectKey = uploadedImageKeyFromPath(req.path);
  if (!objectKey) {
    next();
    return;
  }

  try {
    const object = await getR2Client().send(new GetObjectCommand({
      Bucket: r2Configuration.bucket,
      Key: objectKey,
    }));
    if (!object.Body) {
      res.sendStatus(404);
      return;
    }

    const body = Buffer.from(await object.Body.transformToByteArray());
    res.setHeader("Content-Type", object.ContentType ?? "application/octet-stream");
    res.setHeader("Cache-Control", object.CacheControl ?? "public, max-age=31536000, immutable");
    if (object.ETag) res.setHeader("ETag", object.ETag);
    if (object.LastModified) res.setHeader("Last-Modified", object.LastModified.toUTCString());
    res.send(body);
  } catch (error) {
    const storageError = error as { name?: string; $metadata?: { httpStatusCode?: number } };
    if (storageError.name === "NoSuchKey" || storageError.$metadata?.httpStatusCode === 404) {
      res.sendStatus(404);
      return;
    }
    next(error);
  }
};

export const uploadsStaticDir = UPLOADS_DIR;
export const uploadsPublicPathPrefix = PUBLIC_PATH_PREFIX;
