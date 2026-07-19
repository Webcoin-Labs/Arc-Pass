import { normalizeXHandle, parseDiscordIdentity } from "../identity";
import type { OAuthProfile } from "./types";

export type ExpectedOAuthProvider = "x" | "discord";

export interface ExpectedOAuthIdentity {
  provider: ExpectedOAuthProvider;
  username: string;
  discriminator: string | null;
}

export function sanitizeReturnTo(value: unknown, fallback = "/dashboard"): string {
  if (typeof value !== "string" || !value.startsWith("/")) return fallback;
  try {
    const base = new URL("https://arc-pass.local");
    const parsed = new URL(value, base);
    if (parsed.origin !== base.origin) return fallback;
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return fallback;
  }
}

export function appendReturnToQuery(path: string, key: string, value: string): string {
  const parsed = new URL(sanitizeReturnTo(path), "https://arc-pass.local");
  parsed.searchParams.set(key, value);
  return `${parsed.pathname}${parsed.search}${parsed.hash}`;
}

export function normalizeExpectedIdentity(
  provider: ExpectedOAuthProvider,
  username: unknown,
  discriminator?: unknown,
): ExpectedOAuthIdentity | null {
  if (typeof username !== "string" || !username.trim()) return null;
  if (provider === "x") {
    const normalized = normalizeXHandle(username);
    return normalized ? { provider, username: normalized, discriminator: null } : null;
  }
  const normalized = parseDiscordIdentity(
    username,
    typeof discriminator === "string" ? discriminator : null,
  );
  return normalized.username ? { provider, ...normalized } : null;
}

export function expectedIdentityMatches(expected: ExpectedOAuthIdentity | null | undefined, profile: OAuthProfile): boolean {
  if (!expected) return true;
  const actual = normalizeExpectedIdentity(expected.provider, profile.username, profile.discriminator);
  if (!actual || actual.username !== expected.username) return false;
  return !expected.discriminator || actual.discriminator === expected.discriminator;
}
