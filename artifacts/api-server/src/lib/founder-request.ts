import { createHmac } from "node:crypto";
import { normalizeXHandle } from "./identity";

export const FOUNDER_REQUEST_MAX_WORDS = 500;
export const FOUNDER_REQUEST_IP_LIMIT = 3;
export const FOUNDER_REQUEST_IP_WINDOW_MS = 24 * 60 * 60 * 1000;

export class FounderRequestValidationError extends Error {}

export function countWords(value: string): number {
  return value.trim().split(/\s+/).filter(Boolean).length;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateFounderRequest(input: unknown): { xUsername: string; email: string; description: string } {
  if (!input || typeof input !== "object") throw new FounderRequestValidationError("Enter your X username and application.");
  const record = input as Record<string, unknown>;
  const rawXUsername = typeof record.xUsername === "string" ? record.xUsername : "";
  const xUsername = normalizeXHandle(rawXUsername);
  const email = typeof record.email === "string" ? record.email.trim().toLowerCase() : "";
  const description = typeof record.description === "string" ? record.description.trim() : "";

  if (!/^[a-z0-9_]{1,15}$/.test(xUsername)) {
    throw new FounderRequestValidationError("Enter a valid X username without the @ symbol.");
  }
  if (!email || email.length > 254 || !EMAIL_PATTERN.test(email)) {
    throw new FounderRequestValidationError("Enter a valid email address.");
  }
  if (!description) throw new FounderRequestValidationError("Tell us briefly why you qualify for a Founder Pass.");
  if (description.length > 6_000 || countWords(description) > FOUNDER_REQUEST_MAX_WORDS) {
    throw new FounderRequestValidationError(`Keep your application to ${FOUNDER_REQUEST_MAX_WORDS} words or fewer.`);
  }

  return { xUsername, email, description };
}

/**
 * Store a keyed fingerprint rather than a raw IP address. The input cannot be
 * recovered without the server-side secret, which is never returned or logged.
 */
export function fingerprintRequesterIp(ip: string, secret: string): string {
  return createHmac("sha256", secret).update(ip).digest("hex");
}
