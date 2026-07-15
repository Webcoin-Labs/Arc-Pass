import type { Request, Response, NextFunction } from "express";
import { promisify } from "util";
import { scrypt, timingSafeEqual, randomBytes, createHash } from "crypto";
import { db, adminUsersTable, adminSessionsTable, adminAuditLogTable, type AdminUser } from "@workspace/db";
import { and, eq, gt } from "drizzle-orm";

const scryptAsync = promisify(scrypt);
export type AdminRequest = Request & { admin: AdminUser };

function tokenHash(token: string): string { return createHash("sha256").update(token).digest("hex"); }

export async function verifyAdminPassword(password: string, encoded: string): Promise<boolean> {
  const [algorithm, saltHex, expectedHex] = encoded.split("$");
  if (algorithm !== "scrypt" || !saltHex || !expectedHex) return false;
  const actual = await scryptAsync(password, Buffer.from(saltHex, "hex"), Buffer.from(expectedHex, "hex").length) as Buffer;
  const expected = Buffer.from(expectedHex, "hex");
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export async function hashAdminPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const derived = await scryptAsync(password, salt, 64) as Buffer;
  return `scrypt$${salt.toString("hex")}$${derived.toString("hex")}`;
}

export async function getAdmin(req: Request): Promise<AdminUser | null> {
  const token = req.cookies?.arc_admin_session as string | undefined;
  if (!token) return null;
  const [row] = await db.select({ admin: adminUsersTable }).from(adminSessionsTable)
    .innerJoin(adminUsersTable, eq(adminSessionsTable.adminUserId, adminUsersTable.id))
    .where(and(eq(adminSessionsTable.tokenHash, tokenHash(token)), gt(adminSessionsTable.expiresAt, new Date()), eq(adminUsersTable.isActive, true)));
  return row?.admin ?? null;
}

export function requireDedicatedAdmin(req: Request, res: Response, next: NextFunction): void {
  getAdmin(req).then((admin) => {
    if (!admin) { res.status(401).json({ error: "Administrator authentication required." }); return; }
    (req as AdminRequest).admin = admin;
    next();
  }).catch(next);
}

export async function createAdminSession(admin: AdminUser, res: Response): Promise<void> {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + 8 * 60 * 60 * 1000);
  await db.insert(adminSessionsTable).values({ adminUserId: admin.id, tokenHash: tokenHash(token), expiresAt });
  res.cookie("arc_admin_session", token, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "strict", path: "/", expires: expiresAt });
}

export async function auditAdmin(req: AdminRequest, action: string, entityType: string, entityId?: string, metadata?: unknown): Promise<void> {
  await db.insert(adminAuditLogTable).values({ adminUserId: req.admin.id, action, entityType, entityId, metadata, ipAddress: req.ip });
}

export { tokenHash };
