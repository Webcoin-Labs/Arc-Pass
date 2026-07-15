import { Router, type IRouter } from "express";
import { db, adminUsersTable, adminSessionsTable, adminAuditLogTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { createAdminSession, getAdmin, hashAdminPassword, tokenHash, verifyAdminPassword } from "../lib/admin-auth";
import { configuration } from "../lib/env";

const router: IRouter = Router();

router.post("/admin/auth/login", async (req, res): Promise<void> => {
  const email = typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : "";
  const password = typeof req.body?.password === "string" ? req.body.password : "";
  if (!email || !password || password.length > 256) { res.status(400).json({ error: "Email and password are required." }); return; }
  let [admin] = await db.select().from(adminUsersTable).where(eq(adminUsersTable.email, email));
  if (!admin && configuration.enableDevAdminBootstrap && email === configuration.devAdminBootstrapEmail) {
    const [existingAdmin] = await db.select({ id: adminUsersTable.id }).from(adminUsersTable).limit(1);
    if (!existingAdmin) {
      if (password.length < 12) {
        res.status(400).json({ error: "The first local administrator password must be at least 12 characters." });
        return;
      }
      const passwordHash = await hashAdminPassword(password);
      [admin] = await db.insert(adminUsersTable).values({ email, passwordHash, role: "super_admin" }).returning();
    }
  }
  if (!admin && email === process.env.ADMIN_BOOTSTRAP_EMAIL?.toLowerCase() && process.env.ADMIN_BOOTSTRAP_PASSWORD_HASH) {
    [admin] = await db.insert(adminUsersTable).values({ email, passwordHash: process.env.ADMIN_BOOTSTRAP_PASSWORD_HASH, role: "super_admin" }).returning();
  }
  if (!admin || !admin.isActive || (admin.lockedUntil && admin.lockedUntil > new Date())) {
    res.status(401).json({ error: "Invalid credentials or account temporarily locked." }); return;
  }
  const valid = await verifyAdminPassword(password, admin.passwordHash);
  if (!valid) {
    const failures = admin.failedLoginCount + 1;
    await db.update(adminUsersTable).set({ failedLoginCount: failures, lockedUntil: failures >= 5 ? new Date(Date.now() + 15 * 60_000) : null }).where(eq(adminUsersTable.id, admin.id));
    res.status(401).json({ error: "Invalid credentials or account temporarily locked." }); return;
  }
  await db.update(adminUsersTable).set({ failedLoginCount: 0, lockedUntil: null, lastLoginAt: new Date() }).where(eq(adminUsersTable.id, admin.id));
  await createAdminSession(admin, res);
  await db.insert(adminAuditLogTable).values({ adminUserId: admin.id, action: "admin.login", entityType: "admin_session", ipAddress: req.ip });
  res.json({ id: admin.id, email: admin.email, role: admin.role });
});

router.get("/admin/auth/session", async (req, res): Promise<void> => {
  const admin = await getAdmin(req);
  if (!admin) { res.status(401).json({ error: "Unauthenticated" }); return; }
  res.json({ id: admin.id, email: admin.email, role: admin.role });
});

router.post("/admin/auth/logout", async (req, res): Promise<void> => {
  const token = req.cookies?.arc_admin_session as string | undefined;
  if (token) await db.delete(adminSessionsTable).where(eq(adminSessionsTable.tokenHash, tokenHash(token)));
  res.clearCookie("arc_admin_session", { path: "/" });
  res.json({ success: true });
});

export default router;
