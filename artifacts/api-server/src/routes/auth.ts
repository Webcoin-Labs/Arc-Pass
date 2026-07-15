import { Router, type IRouter, type Response } from "express";
import { db, usersTable, sessionsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { getUserFromSession, createSession, linkPendingFounderInvite } from "../lib/auth";
import { logger } from "../lib/logger";
import { signOAuthState, verifyOAuthState, createPkcePair } from "../lib/oauth/provider";
import { isXOAuthConfigured, buildXAuthorizeUrl, exchangeXCode } from "../lib/oauth/x";
import { isDiscordOAuthConfigured, buildDiscordAuthorizeUrl, exchangeDiscordCode } from "../lib/oauth/discord";
import { isGithubOAuthConfigured, buildGithubAuthorizeUrl, exchangeGithubCode } from "../lib/oauth/github";
import type { OAuthProfile } from "../lib/oauth/types";
import { configuration } from "../lib/env";
import { grantDevelopmentTestEntitlements } from "../lib/dev-test-identities";

const router: IRouter = Router();

function frontendUrl(path = "/"): string {
  const base = process.env.FRONTEND_URL || "/";
  return `${base.replace(/\/$/, "")}${path}`;
}

function safeReturnTo(req: import("express").Request): string {
  const value = typeof req.query.returnTo === "string" ? req.query.returnTo : "/dashboard";
  return value.startsWith("/") && !value.startsWith("//") ? value : "/dashboard";
}

type Provider = "x" | "discord" | "github";

/**
 * Applies a resolved OAuth profile: links it to the current session (link
 * intent) or finds/creates an identity and signs the caller in (login
 * intent). GitHub never logs a user in on its own — the route layer only
 * ever calls this in "link" mode for GitHub, enforced below.
 */
async function completeOAuth(params: {
  provider: Provider;
  profile: OAuthProfile;
  intent: "login" | "link";
  linkUserId: number | null;
  currentUserId: number | null;
  res: Response;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const { provider, profile, intent, linkUserId, currentUserId, res } = params;

  if (intent === "link") {
    if (!linkUserId || linkUserId !== currentUserId) {
      return { ok: false, error: "session_mismatch" };
    }

    const stableIdColumn = provider === "x" ? usersTable.xUserId : provider === "discord" ? usersTable.discordUserId : usersTable.githubUserId;
    const [conflict] = await db.select().from(usersTable).where(eq(stableIdColumn, profile.providerUserId));
    if (conflict && conflict.id !== linkUserId) {
      return { ok: false, error: `${provider}_already_linked` };
    }

    const patch =
      provider === "x"
        ? { xUserId: profile.providerUserId, xUsername: profile.username }
        : provider === "discord"
          ? { discordUserId: profile.providerUserId, discordUsername: profile.username, discordAvatarUrl: profile.avatarUrl }
          : { githubUserId: profile.providerUserId, githubUsername: profile.username };

    await db.update(usersTable).set(patch).where(eq(usersTable.id, linkUserId));
    if (provider !== "github") {
      await linkPendingFounderInvite(linkUserId, provider, profile.username);
    }
    if (provider === "x") {
      await grantDevelopmentTestEntitlements(linkUserId, profile.username);
    }
    return { ok: true };
  }

  // login intent — X and Discord only; GitHub is never a login method (routes
  // above only ever call this branch with provider !== "github").
  if (provider === "github") {
    return { ok: false, error: "github_login_not_supported" };
  }

  const stableIdColumn = provider === "x" ? usersTable.xUserId : usersTable.discordUserId;
  const [existing] = await db.select().from(usersTable).where(eq(stableIdColumn, profile.providerUserId));

  let userId: number;
  if (existing) {
    userId = existing.id;
    const profilePatch =
      provider === "x"
        ? { username: profile.username, displayName: profile.displayName, avatarUrl: profile.avatarUrl, xUsername: profile.username }
        : { username: profile.username, displayName: profile.displayName, avatarUrl: profile.avatarUrl, discordUsername: profile.username, discordAvatarUrl: profile.avatarUrl };
    await db.update(usersTable).set(profilePatch).where(eq(usersTable.id, userId));
  } else {
    const [created] = await db
      .insert(usersTable)
      .values({
        username: profile.username,
        displayName: profile.displayName,
        avatarUrl: profile.avatarUrl,
        provider,
        providerId: profile.providerUserId,
        ...(provider === "x"
          ? { xUserId: profile.providerUserId, xUsername: profile.username }
          : { discordUserId: profile.providerUserId, discordUsername: profile.username, discordAvatarUrl: profile.avatarUrl }),
      })
      .returning();
    userId = created.id;
  }

  await linkPendingFounderInvite(userId, provider, profile.username);
  if (provider === "x") {
    await grantDevelopmentTestEntitlements(userId, profile.username);
  }

  await createSession(userId, res);
  return { ok: true };
}

// ---- Mock fallback (used only when the provider's env vars aren't configured) ----

async function mockOAuth(provider: Provider, req: import("express").Request, res: Response): Promise<void> {
  const currentUser = await getUserFromSession(req);
  const intent: "login" | "link" = currentUser ? "link" : "login";

  if (provider === "github" && intent === "login") {
    res.redirect(frontendUrl("/?authError=login_required_before_github"));
    return;
  }

  const demoProfile: OAuthProfile = {
    providerUserId: `${provider}_demo_001`,
    username: provider === "x" ? "demo_founder" : provider === "discord" ? "demo_builder" : "demo_builder_gh",
    displayName: provider === "x" ? "Demo Founder" : provider === "discord" ? "Demo Builder" : "Demo Builder",
    avatarUrl: null,
  };

  const result = await completeOAuth({
    provider,
    profile: demoProfile,
    intent,
    linkUserId: currentUser?.id ?? null,
    currentUserId: currentUser?.id ?? null,
    res,
  });

  if (!result.ok) {
    logger.warn({ error: result.error }, "Mock OAuth link failed");
    res.redirect(frontendUrl(`/?authError=${result.error}`));
    return;
  }

  res.redirect(frontendUrl());
}

// ---- X ----

router.get("/auth/x", async (req, res): Promise<void> => {
  try {
    const currentUser = await getUserFromSession(req);

    if (!isXOAuthConfigured() && configuration.enableDevMocks) {
      await mockOAuth("x", req, res);
      return;
    }
    if (!isXOAuthConfigured()) { res.redirect(frontendUrl("/?authError=x_unavailable")); return; }

    const { verifier, challenge } = createPkcePair();
    const state = await signOAuthState({
      intent: currentUser ? "link" : "login",
      linkUserId: currentUser?.id,
      returnTo: safeReturnTo(req),
      codeVerifier: verifier,
    });
    res.redirect(buildXAuthorizeUrl(state, challenge));
  } catch (err) {
    req.log.error({ err }, "X OAuth redirect error");
    res.redirect(frontendUrl("/?authError=x"));
  }
});

router.get("/auth/x/callback", async (req, res): Promise<void> => {
  try {
    const code = req.query.code as string | undefined;
    const stateParam = req.query.state as string | undefined;
    if (!code || !stateParam) throw new Error("Missing code or state");

    const oauthState = await verifyOAuthState(stateParam);
    const profile = await exchangeXCode(code, oauthState.codeVerifier ?? "");
    const currentUser = await getUserFromSession(req);

    const result = await completeOAuth({
      provider: "x",
      profile,
      intent: oauthState.intent,
      linkUserId: oauthState.linkUserId ?? null,
      currentUserId: currentUser?.id ?? null,
      res,
    });

    if (!result.ok) {
      res.redirect(frontendUrl(`${oauthState.returnTo}?authError=${result.error}`));
      return;
    }
    res.redirect(frontendUrl(oauthState.returnTo));
  } catch (err) {
    req.log.error({ err }, "X OAuth callback error");
    res.redirect(frontendUrl("/?authError=x"));
  }
});

// ---- Discord ----

router.get("/auth/discord", async (req, res): Promise<void> => {
  try {
    const currentUser = await getUserFromSession(req);

    if (!isDiscordOAuthConfigured() && configuration.enableDevMocks) {
      await mockOAuth("discord", req, res);
      return;
    }
    if (!isDiscordOAuthConfigured()) { res.redirect(frontendUrl("/?authError=discord_unavailable")); return; }

    const state = await signOAuthState({
      intent: currentUser ? "link" : "login",
      linkUserId: currentUser?.id,
      returnTo: safeReturnTo(req),
    });
    res.redirect(buildDiscordAuthorizeUrl(state));
  } catch (err) {
    req.log.error({ err }, "Discord OAuth redirect error");
    res.redirect(frontendUrl("/?authError=discord"));
  }
});

router.get("/auth/discord/callback", async (req, res): Promise<void> => {
  try {
    const code = req.query.code as string | undefined;
    const stateParam = req.query.state as string | undefined;
    if (!code || !stateParam) throw new Error("Missing code or state");

    const oauthState = await verifyOAuthState(stateParam);
    const { profile } = await exchangeDiscordCode(code);
    const currentUser = await getUserFromSession(req);

    const result = await completeOAuth({
      provider: "discord",
      profile,
      intent: oauthState.intent,
      linkUserId: oauthState.linkUserId ?? null,
      currentUserId: currentUser?.id ?? null,
      res,
    });

    if (!result.ok) {
      res.redirect(frontendUrl(`${oauthState.returnTo}?authError=${result.error}`));
      return;
    }
    res.redirect(frontendUrl(oauthState.returnTo));
  } catch (err) {
    req.log.error({ err }, "Discord OAuth callback error");
    res.redirect(frontendUrl("/?authError=discord"));
  }
});

// ---- GitHub (link-only — never a login method) ----

router.get("/auth/github", async (req, res): Promise<void> => {
  try {
    const currentUser = await getUserFromSession(req);
    if (!currentUser) {
      res.redirect(frontendUrl("/?authError=login_required_before_github"));
      return;
    }

    if (!isGithubOAuthConfigured() && configuration.enableDevMocks) {
      await mockOAuth("github", req, res);
      return;
    }
    if (!isGithubOAuthConfigured()) { res.redirect(frontendUrl("/?authError=github_unavailable")); return; }

    const state = await signOAuthState({ intent: "link", linkUserId: currentUser.id, returnTo: "/" });
    res.redirect(buildGithubAuthorizeUrl(state));
  } catch (err) {
    req.log.error({ err }, "GitHub OAuth redirect error");
    res.redirect(frontendUrl("/?authError=github"));
  }
});

router.get("/auth/github/callback", async (req, res): Promise<void> => {
  try {
    const code = req.query.code as string | undefined;
    const stateParam = req.query.state as string | undefined;
    if (!code || !stateParam) throw new Error("Missing code or state");

    const oauthState = await verifyOAuthState(stateParam);
    const profile = await exchangeGithubCode(code);
    const currentUser = await getUserFromSession(req);

    const result = await completeOAuth({
      provider: "github",
      profile,
      intent: "link",
      linkUserId: oauthState.linkUserId ?? null,
      currentUserId: currentUser?.id ?? null,
      res,
    });

    if (!result.ok) {
      res.redirect(frontendUrl(`${oauthState.returnTo}?authError=${result.error}`));
      return;
    }
    res.redirect(frontendUrl(oauthState.returnTo));
  } catch (err) {
    req.log.error({ err }, "GitHub OAuth callback error");
    res.redirect(frontendUrl("/?authError=github"));
  }
});

// ---- Session ----

router.get("/auth/me", async (req, res): Promise<void> => {
  try {
    const user = await getUserFromSession(req);
    if (!user) {
      res.status(401).json({ error: "Unauthenticated" });
      return;
    }
    res.json({
      id: user.id,
      username: user.username,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
      provider: user.provider,
      providerId: user.providerId,
      isAdmin: user.isAdmin,
      createdAt: user.createdAt,
    });
  } catch (err) {
    req.log.error({ err }, "Get me error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/auth/logout", async (req, res): Promise<void> => {
  try {
    const sessionToken = req.cookies?.["arc_session"] as string | undefined;
    if (sessionToken) {
      await db.delete(sessionsTable).where(eq(sessionsTable.token, sessionToken));
    }
    res.clearCookie("arc_session", { path: "/" });
    res.json({ success: true });
  } catch (err) {
    req.log.error({ err }, "Logout error");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
