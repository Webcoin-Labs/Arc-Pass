import { createHmac } from "node:crypto";
import { normalizeXHandle } from "./identity";

export const FOUNDER_REQUEST_MAX_WORDS = 500;
export const FOUNDER_REQUEST_IP_LIMIT = 3;
export const FOUNDER_REQUEST_IP_WINDOW_MS = 24 * 60 * 60 * 1000;

export class FounderRequestValidationError extends Error {}

export function countWords(value: string): number {
  return value.trim().split(/\s+/).filter(Boolean).length;
}

export function validateFounderRequest(input: unknown): { xUsername: string; description: string } {
  if (!input || typeof input !== "object") throw new FounderRequestValidationError("Enter your X username and application.");
  const record = input as Record<string, unknown>;
  const rawXUsername = typeof record.xUsername === "string" ? record.xUsername : "";
  const xUsername = normalizeXHandle(rawXUsername);
  const description = typeof record.description === "string" ? record.description.trim() : "";

  if (!/^[a-z0-9_]{1,15}$/.test(xUsername)) {
    throw new FounderRequestValidationError("Enter a valid X username without the @ symbol.");
  }
  if (!description) throw new FounderRequestValidationError("Tell us briefly why you qualify for a Founder Pass.");
  if (description.length > 6_000 || countWords(description) > FOUNDER_REQUEST_MAX_WORDS) {
    throw new FounderRequestValidationError(`Keep your application to ${FOUNDER_REQUEST_MAX_WORDS} words or fewer.`);
  }

  return { xUsername, description };
}

/**
 * Store a keyed fingerprint rather than a raw IP address. The input cannot be
 * recovered without the server-side secret, which is never returned or logged.
 */
export function fingerprintRequesterIp(ip: string, secret: string): string {
  return createHmac("sha256", secret).update(ip).digest("hex");
}
