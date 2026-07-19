import type { EligibilityQueryPlatform } from "@workspace/api-client-react";

const STORAGE_KEY = "arc-pass:pending-eligibility-identity";
const MAX_AGE_MS = 60 * 60 * 1_000;

export interface PendingEligibilityIdentity {
  platform: EligibilityQueryPlatform;
  identifier: string;
  discriminator?: string;
  checkedAt: number;
}

type IdentityProfile = {
  connections?: {
    x?: { connected?: boolean; username?: string | null };
    discord?: { connected?: boolean; username?: string | null; discriminator?: string | null };
  };
};

function normalizeIdentifier(value: string): string {
  return value.trim().replace(/^@+/, "").toLowerCase();
}

function normalizeDiscriminator(value: string | null | undefined): string | undefined {
  const normalized = (value ?? "").trim().replace(/^#+/, "");
  return /^\d{4}$/.test(normalized) && normalized !== "0" ? normalized : undefined;
}

export function savePendingEligibilityIdentity(input: Omit<PendingEligibilityIdentity, "checkedAt">): PendingEligibilityIdentity {
  const pending: PendingEligibilityIdentity = {
    platform: input.platform,
    identifier: normalizeIdentifier(input.identifier),
    ...(normalizeDiscriminator(input.discriminator) ? { discriminator: normalizeDiscriminator(input.discriminator) } : {}),
    checkedAt: Date.now(),
  };
  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(pending));
  } catch {
    // The claim page still works without lookup binding when storage is blocked.
  }
  return pending;
}

export function readPendingEligibilityIdentity(): PendingEligibilityIdentity | null {
  if (typeof window === "undefined") return null;
  try {
    const parsed = JSON.parse(window.sessionStorage.getItem(STORAGE_KEY) ?? "null") as Partial<PendingEligibilityIdentity> | null;
    if (!parsed || (parsed.platform !== "x" && parsed.platform !== "discord") || typeof parsed.identifier !== "string" || typeof parsed.checkedAt !== "number") return null;
    if (Date.now() - parsed.checkedAt > MAX_AGE_MS) {
      window.sessionStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return {
      platform: parsed.platform,
      identifier: normalizeIdentifier(parsed.identifier),
      ...(normalizeDiscriminator(parsed.discriminator) ? { discriminator: normalizeDiscriminator(parsed.discriminator) } : {}),
      checkedAt: parsed.checkedAt,
    };
  } catch {
    return null;
  }
}

export function clearPendingEligibilityIdentity(): void {
  try {
    window.sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // Nothing else is required when browser storage is unavailable.
  }
}

export function pendingIdentityLabel(pending: PendingEligibilityIdentity): string {
  if (pending.platform === "x") return `@${pending.identifier}`;
  return pending.discriminator ? `${pending.identifier}#${pending.discriminator}` : pending.identifier;
}

export function pendingIdentityMatches(profile: IdentityProfile | null | undefined, pending: PendingEligibilityIdentity | null): boolean {
  if (!pending) return Boolean(profile?.connections?.x?.connected || profile?.connections?.discord?.connected);
  const connection = pending.platform === "x" ? profile?.connections?.x : profile?.connections?.discord;
  if (!connection?.connected || normalizeIdentifier(connection.username ?? "") !== pending.identifier) return false;
  if (pending.platform === "discord" && pending.discriminator) {
    return normalizeDiscriminator(profile?.connections?.discord?.discriminator) === pending.discriminator;
  }
  return true;
}

export function pendingProviderIsConnected(profile: IdentityProfile | null | undefined, pending: PendingEligibilityIdentity): boolean {
  return Boolean(pending.platform === "x" ? profile?.connections?.x?.connected : profile?.connections?.discord?.connected);
}

export function identityOAuthHref(provider: "x" | "discord", returnTo: string, pending?: PendingEligibilityIdentity | null): string {
  const query = new URLSearchParams({ returnTo });
  if (pending?.platform === provider) {
    query.set("expectedUsername", pending.identifier);
    if (pending.discriminator) query.set("expectedDiscriminator", pending.discriminator);
  }
  return `/api/auth/${provider}?${query.toString()}`;
}
