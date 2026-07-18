export function normalizeXHandle(value: string): string {
  return value.trim().replace(/^@+/, "").toLowerCase();
}

export function normalizeDiscordDiscriminator(value: string | null | undefined): string | null {
  const normalized = (value ?? "").trim().replace(/^#+/, "");
  return /^\d{4}$/.test(normalized) && normalized !== "0" ? normalized : null;
}

export function parseDiscordIdentity(value: string, discriminator?: string | null): { username: string; discriminator: string | null } {
  const trimmed = value.trim().replace(/^@+/, "");
  const legacy = trimmed.match(/^(.*)#(\d{4})$/);
  const username = (legacy?.[1] ?? trimmed).trim().toLowerCase();
  return {
    username,
    discriminator: normalizeDiscordDiscriminator(discriminator ?? legacy?.[2]),
  };
}

export function displayDiscordIdentity(username: string | null | undefined, discriminator: string | null | undefined): string | null {
  if (!username) return null;
  return discriminator ? `${username}#${discriminator}` : username;
}
