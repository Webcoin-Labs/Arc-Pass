import { readProviderEnv } from "./provider";
import type { OAuthProfile } from "./types";

export function isDiscordOAuthConfigured(): boolean {
  return readProviderEnv("DISCORD") !== null;
}

export function buildDiscordAuthorizeUrl(state: string): string {
  const config = readProviderEnv("DISCORD");
  if (!config) throw new Error("Discord OAuth is not configured");

  const url = new URL("https://discord.com/api/oauth2/authorize");
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", config.clientId);
  url.searchParams.set("redirect_uri", config.redirectUri);
  // Needed for the current-user guild-member endpoint. Membership is a
  // supporting signal only and never grants eligibility by itself.
  url.searchParams.set("scope", "identify guilds.members.read");
  url.searchParams.set("state", state);

  return url.toString();
}

export async function exchangeDiscordCode(code: string): Promise<{ profile: OAuthProfile; accessToken: string }> {
  const config = readProviderEnv("DISCORD");
  if (!config) throw new Error("Discord OAuth is not configured");

  const tokenResponse = await fetch("https://discord.com/api/oauth2/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: config.redirectUri,
      client_id: config.clientId,
      client_secret: config.clientSecret,
    }),
  });

  if (!tokenResponse.ok) {
    throw new Error(`Discord token exchange failed: ${tokenResponse.status}`);
  }

  const { access_token: accessToken } = (await tokenResponse.json()) as { access_token: string };

  const profileResponse = await fetch("https://discord.com/api/users/@me", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!profileResponse.ok) {
    throw new Error(`Discord profile fetch failed: ${profileResponse.status}`);
  }

  const profile = (await profileResponse.json()) as { id: string; username: string; global_name?: string; avatar?: string };

  return {
    accessToken,
    profile: {
      providerUserId: profile.id,
      username: profile.username,
      displayName: profile.global_name ?? profile.username,
      avatarUrl: profile.avatar ? `https://cdn.discordapp.com/avatars/${profile.id}/${profile.avatar}.png?size=256` : null,
    },
  };
}

export interface ArcGuildMembershipSnapshot {
  member: boolean | null;
  joinedAt: string | null;
  roleIds: string[];
  roleNames: string[];
  primaryRoles: Array<{ id: string; name: string | null; hasRole: boolean | null }>;
}

function configuredPrimaryRoleIds(): string[] {
  return (process.env.ARC_DISCORD_PRIMARY_ROLE_IDS ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean)
    .slice(0, 2);
}

function withPrimaryRoleState(
  primaryRoleIds: string[],
  roleNamesById: Map<string, string>,
  assignedRoleIds: string[] | null,
): Array<{ id: string; name: string | null; hasRole: boolean | null }> {
  return primaryRoleIds.map((id) => ({
    id,
    name: roleNamesById.get(id) ?? null,
    hasRole: assignedRoleIds === null ? null : assignedRoleIds.includes(id),
  }));
}

/**
 * Reads the current user's membership in the configured Arc guild. Discord
 * returns role IDs on the OAuth endpoint; role names are resolved only when a
 * bot token is configured and the bot can read that guild's roles.
 *
 * This is intentionally best-effort. A provider outage or missing scope
 * yields `member: null`, not a false membership claim.
 */
export async function getArcGuildMembership(accessToken: string): Promise<ArcGuildMembershipSnapshot> {
  const guildId = process.env.ARC_DISCORD_GUILD_ID;
  const primaryRoleIds = configuredPrimaryRoleIds();
  if (!guildId) return { member: null, joinedAt: null, roleIds: [], roleNames: [], primaryRoles: withPrimaryRoleState(primaryRoleIds, new Map(), null) };

  let response: Response;
  try {
    response = await fetch(`https://discord.com/api/v10/users/@me/guilds/${guildId}/member`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      signal: AbortSignal.timeout(10_000),
    });
  } catch {
    return { member: null, joinedAt: null, roleIds: [], roleNames: [], primaryRoles: withPrimaryRoleState(primaryRoleIds, new Map(), null) };
  }

  const botToken = process.env.DISCORD_BOT_TOKEN?.trim();
  const roleNamesById = new Map<string, string>();
  if (botToken && primaryRoleIds.length > 0) {
    try {
      const rolesResponse = await fetch(`https://discord.com/api/v10/guilds/${guildId}/roles`, {
        headers: { Authorization: `Bot ${botToken}` },
        signal: AbortSignal.timeout(10_000),
      });
      if (rolesResponse.ok) {
        const roles = (await rolesResponse.json()) as Array<{ id?: string; name?: string }>;
        for (const role of roles) {
          if (role.id && role.name) roleNamesById.set(role.id, role.name);
        }
      }
    } catch {
      // Role labels are optional; membership state remains useful if this fails.
    }
  }

  if (response.status === 404) return { member: false, joinedAt: null, roleIds: [], roleNames: [], primaryRoles: withPrimaryRoleState(primaryRoleIds, roleNamesById, []) };
  if (!response.ok) return { member: null, joinedAt: null, roleIds: [], roleNames: [], primaryRoles: withPrimaryRoleState(primaryRoleIds, roleNamesById, null) };

  const member = (await response.json()) as { joined_at?: string; roles?: unknown };
  const roleIds = Array.isArray(member.roles) ? member.roles.filter((role): role is string => typeof role === "string") : [];
  let roleNames: string[] = [];

  if (botToken && roleIds.length > 0 && roleNamesById.size === 0) {
    try {
      const rolesResponse = await fetch(`https://discord.com/api/v10/guilds/${guildId}/roles`, {
        headers: { Authorization: `Bot ${botToken}` },
        signal: AbortSignal.timeout(10_000),
      });
      if (rolesResponse.ok) {
        const roles = (await rolesResponse.json()) as Array<{ id?: string; name?: string }>;
        for (const role of roles) {
          if (role.id && role.name) roleNamesById.set(role.id, role.name);
        }
      }
    } catch {
      // Keep membership status even when the optional role catalog is unavailable.
    }
  }
  roleNames = roleIds.map((roleId) => roleNamesById.get(roleId)).filter((name): name is string => Boolean(name));

  return { member: true, joinedAt: member.joined_at ?? null, roleIds, roleNames, primaryRoles: withPrimaryRoleState(primaryRoleIds, roleNamesById, roleIds) };
}

/** Backwards-compatible boolean helper for callers that only need status. */
export async function checkArcGuildMembership(accessToken: string): Promise<boolean | null> {
  return (await getArcGuildMembership(accessToken)).member;
}
