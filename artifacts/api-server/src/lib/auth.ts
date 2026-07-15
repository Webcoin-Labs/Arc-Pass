import { type Request, type Response, type NextFunction } from "express";
import { db, sessionsTable, usersTable, founderPassesTable, type User } from "@workspace/db";
import { eq, and, isNull } from "drizzle-orm";
import crypto from "crypto";
import { logger } from "./logger";
export { requireDedicatedAdmin as requireAdmin } from "./admin-auth";

export type AuthedRequest = Request & { user: User };

export async function getUserFromSession(req: Request): Promise<User | null> {
  const sessionToken = req.cookies?.["arc_session"] as string | undefined;
  if (!sessionToken) return null;

  const [session] = await db
    .select()
    .from(sessionsTable)
    .where(eq(sessionsTable.token, sessionToken));

  if (!session) return null;
  if (session.expiresAt < new Date()) return null;

  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, session.userId));

  return user ?? null;
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  getUserFromSession(req)
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
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

  await db.insert(sessionsTable).values({ userId, token, expiresAt });

  res.cookie("arc_session", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    expires: expiresAt,
    path: "/",
  });
}

/**
 * When a brand-new user logs in for the first time, checks whether an admin
 * already created a pre-signup Founder invite for this exact handle/platform
 * (userId still null on that row) and links it to the freshly created
 * identity. No-op if no matching invite exists.
 */
export async function linkPendingFounderInvite(userId: number, platform: "x" | "discord", handle: string): Promise<void> {
  const [pending] = await db
    .select()
    .from(founderPassesTable)
    .where(
      and(
        isNull(founderPassesTable.userId),
        eq(founderPassesTable.invitePlatform, platform),
        eq(founderPassesTable.inviteHandle, handle.toLowerCase()),
      ),
    );

  if (!pending) return;

  await db.update(founderPassesTable).set({ userId }).where(eq(founderPassesTable.id, pending.id));
  logger.info({ userId, founderPassId: pending.id }, "Linked pending Founder invite to newly created identity");
}
