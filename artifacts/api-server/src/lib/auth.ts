import { type Request, type Response, type NextFunction } from "express";
import { db, sessionsTable, usersTable, founderPassesTable, type User } from "@workspace/db";
import { eq, and, isNull, or } from "drizzle-orm";
import crypto from "crypto";
import { logger } from "./logger";
import { normalizeXHandle, parseDiscordIdentity } from "./identity";
export { requireDedicatedAdmin as requireAdmin } from "./admin-auth";

export type AuthedRequest = Request & { user: User };
export const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;
export const SESSION_REFRESH_WINDOW_MS = 24 * 60 * 60 * 1000;

export function hasVerifiedGithub(user: Pick<User, "githubUserId">): boolean {
  return Boolean(user.githubUserId);
}

export const GITHUB_MIN_ACCOUNT_AGE_DAYS = 180;
export const GITHUB_MIN_CONTRIBUTIONS = 10;
export const GITHUB_SNAPSHOT_MAX_AGE_DAYS = 7;

export function getGithubEligibilityFailure(user: Pick<User, "githubUserId" | "githubAccountCreatedAt" | "githubContributionCount" | "githubContributionWindowStartedAt" | "githubContributionsUpdatedAt">, now = new Date()): "not_connected" | "provider_unavailable" | "reconnect_required" | "account_too_new" | "insufficient_contributions" | null {
  if (!user.githubUserId) return "not_connected";
  if (!user.githubAccountCreatedAt || user.githubContributionCount == null || !user.githubContributionWindowStartedAt || !user.githubContributionsUpdatedAt) return "provider_unavailable";
  const minimumAgeMs = GITHUB_MIN_ACCOUNT_AGE_DAYS * 24 * 60 * 60 * 1000;
  const snapshotMaxAgeMs = GITHUB_SNAPSHOT_MAX_AGE_DAYS * 24 * 60 * 60 * 1000;
  if (now.getTime() - user.githubContributionsUpdatedAt.getTime() > snapshotMaxAgeMs) return "reconnect_required";
  const capturedWindowMs = user.githubContributionsUpdatedAt.getTime() - user.githubContributionWindowStartedAt.getTime();
  if (capturedWindowMs < minimumAgeMs - 60_000 || capturedWindowMs > minimumAgeMs + 24 * 60 * 60 * 1000) return "provider_unavailable";
  if (now.getTime() - user.githubAccountCreatedAt.getTime() < minimumAgeMs) return "account_too_new";
  if (user.githubContributionCount < GITHUB_MIN_CONTRIBUTIONS) return "insufficient_contributions";
  return null;
}

/** Store only a keyed digest of the browser token; the raw token remains in the HttpOnly cookie. */
export function hashSessionToken(token: string): string {
  const secret = process.env.SESSION_SECRET || "arc-pass-development-session-hash";
  return crypto.createHmac("sha256", secret).update(token).digest("hex");
}

export async function deleteSession(token: string): Promise<void> {
  const digest = hashSessionToken(token);
  // The raw-token branch is a one-time compatibility path for sessions created
  // before token hashing was introduced.
  await db.delete(sessionsTable).where(or(eq(sessionsTable.token, digest), eq(sessionsTable.token, token)));
}

export function shouldRefreshSession(expiresAt: Date, now = new Date()): boolean {
  return expiresAt.getTime() - now.getTime() <= SESSION_REFRESH_WINDOW_MS;
}

function setSessionCookie(res: Response, token: string, expiresAt: Date): void {
  res.cookie("arc_session", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    expires: expiresAt,
    path: "/",
  });
}

export async function getUserFromSession(req: Request, res?: Response): Promise<User | null> {
  const sessionToken = req.cookies?.["arc_session"] as string | undefined;
  if (!sessionToken) return null;

  const [session] = await db
    .select()
    .from(sessionsTable)
    .where(or(eq(sessionsTable.token, hashSessionToken(sessionToken)), eq(sessionsTable.token, sessionToken)));

  if (!session) return null;
  const now = new Date();
  if (session.expiresAt < now) {
    await db.delete(sessionsTable).where(eq(sessionsTable.id, session.id));
    return null;
  }
  if (session.token === sessionToken) {
    await db.update(sessionsTable).set({ token: hashSessionToken(sessionToken) }).where(eq(sessionsTable.id, session.id));
  }

  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, session.userId));

  if (user && res && shouldRefreshSession(session.expiresAt, now)) {
    const expiresAt = new Date(now.getTime() + SESSION_TTL_MS);
    await db.update(sessionsTable).set({ expiresAt }).where(eq(sessionsTable.id, session.id));
    setSessionCookie(res, sessionToken, expiresAt);
  }

  return user ?? null;
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  getUserFromSession(req, res)
    .then((user) => {
      if (!user) {
        res.status(401).json({ error: "Unauthenticated" });
        return;
      }
      (req as AuthedRequest).user = user;
      next();
    })
    .catch((err: unknown) => {
      logger.error({ err }, "Auth middleware error");
      res.status(500).json({ error: "Internal server error" });
    });
}

export async function createSession(userId: number, res: Response): Promise<void> {
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);

  await db.insert(sessionsTable).values({ userId, token: hashSessionToken(token), expiresAt });

  setSessionCookie(res, token, expiresAt);
}

/**
 * When a brand-new user logs in for the first time, checks whether an admin
 * already created a pre-signup Founder invite for this exact handle/platform
 * (userId still null on that row) and links it to the freshly created
 * identity. No-op if no matching invite exists.
 */
export async function linkPendingFounderInvite(userId: number, platform: "x" | "discord", handle: string, discriminator?: string | null): Promise<void> {
  const identity = platform === "x"
    ? { username: normalizeXHandle(handle), discriminator: null }
    : parseDiscordIdentity(handle, discriminator);
  const [pending] = await db
    .select()
    .from(founderPassesTable)
    .where(
      and(
        isNull(founderPassesTable.userId),
        eq(founderPassesTable.invitePlatform, platform),
        eq(founderPassesTable.inviteHandle, identity.username),
        platform === "discord" && identity.discriminator
          ? or(isNull(founderPassesTable.inviteDiscriminator), eq(founderPassesTable.inviteDiscriminator, identity.discriminator))
          : isNull(founderPassesTable.inviteDiscriminator),
      ),
    );

  if (!pending) return;

  await db.update(founderPassesTable).set({ userId }).where(eq(founderPassesTable.id, pending.id));
  logger.info({ userId, founderPassId: pending.id }, "Linked pending Founder invite to newly created identity");
}
