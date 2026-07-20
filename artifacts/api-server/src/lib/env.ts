const isProduction = process.env.NODE_ENV === "production";

function configured(name: string): boolean {
  return Boolean(process.env[name]?.trim());
}

function warnIncompleteGroup(label: string, names: string[]): void {
  const present = names.filter(configured);
  if (present.length > 0 && present.length !== names.length) {
    const missing = names.filter((name) => !configured(name));
    console.warn(`${label} configuration is incomplete and will be unavailable. Missing: ${missing.join(", ")}`);
  }
}

export const enableDevMocks = process.env.ENABLE_DEV_MOCKS === "true";
const enableDevTestIdentities = process.env.ENABLE_DEV_TEST_IDENTITIES === "true";
const enableDevAdminBootstrap = process.env.ENABLE_DEV_ADMIN_BOOTSTRAP === "true";

function commaSeparatedValues(name: string): string[] {
  return (process.env[name] ?? "")
    .split(",")
    .map((value) => value.trim().toLowerCase().replace(/^@/, ""))
    .filter(Boolean);
}

const devEligibleXHandles = commaSeparatedValues("DEV_ELIGIBLE_X_HANDLES");
const devEligibleDiscordHandles = commaSeparatedValues("DEV_ELIGIBLE_DISCORD_HANDLES");
const devAdminBootstrapEmail = process.env.DEV_ADMIN_BOOTSTRAP_EMAIL?.trim().toLowerCase() ?? "";
const builderPhaseName = process.env.BUILDER_PHASE_NAME?.trim() || "Wave 1";
const builderPhaseClaimLimit = Number(process.env.BUILDER_PHASE_CLAIM_LIMIT || "2499");

export function assertMockPolicy(nodeEnv: string | undefined, enabled: boolean): void {
  if (nodeEnv === "production" && enabled) throw new Error("ENABLE_DEV_MOCKS=true is forbidden in production");
}

export function assertDevelopmentFixturePolicy(
  nodeEnv: string | undefined,
  options: {
    testIdentitiesEnabled: boolean;
    testIdentityHandlesConfigured: boolean;
    adminBootstrapEnabled: boolean;
    adminBootstrapEmailConfigured: boolean;
  },
): void {
  if (nodeEnv !== "production") return;
  if (options.testIdentitiesEnabled || options.testIdentityHandlesConfigured) {
    throw new Error("Development test identities are forbidden in production");
  }
  if (options.adminBootstrapEnabled || options.adminBootstrapEmailConfigured) {
    throw new Error("Development admin bootstrap is forbidden in production");
  }
}

export function validateEnvironment(): void {
  assertMockPolicy(process.env.NODE_ENV, enableDevMocks);
  assertDevelopmentFixturePolicy(process.env.NODE_ENV, {
    testIdentitiesEnabled: enableDevTestIdentities,
    testIdentityHandlesConfigured: devEligibleXHandles.length > 0 || devEligibleDiscordHandles.length > 0,
    adminBootstrapEnabled: enableDevAdminBootstrap,
    adminBootstrapEmailConfigured: Boolean(devAdminBootstrapEmail),
  });
  if (isProduction && configured("DEV_DATABASE_URL")) {
    throw new Error("DEV_DATABASE_URL is forbidden in production");
  }
  if (enableDevTestIdentities && devEligibleXHandles.length === 0 && devEligibleDiscordHandles.length === 0) {
    throw new Error("ENABLE_DEV_TEST_IDENTITIES=true requires at least one development test handle");
  }
  if (enableDevAdminBootstrap && !devAdminBootstrapEmail) {
    throw new Error("ENABLE_DEV_ADMIN_BOOTSTRAP=true requires DEV_ADMIN_BOOTSTRAP_EMAIL");
  }
  if (!Number.isSafeInteger(builderPhaseClaimLimit) || builderPhaseClaimLimit <= 0) {
    throw new Error("BUILDER_PHASE_CLAIM_LIMIT must be a positive integer");
  }
  if (configured("DB_POOL_MAX")) {
    const poolMax = Number(process.env.DB_POOL_MAX);
    if (!Number.isSafeInteger(poolMax) || poolMax <= 0 || poolMax > 20) throw new Error("DB_POOL_MAX must be an integer between 1 and 20");
  }
  if (configured("ARC_CHAIN_ID")) {
    const chainId = Number(process.env.ARC_CHAIN_ID);
    if (!Number.isSafeInteger(chainId) || chainId <= 0) {
      throw new Error("ARC_CHAIN_ID must be a positive integer");
    }
  }
  warnIncompleteGroup("X OAuth", ["X_CLIENT_ID", "X_CLIENT_SECRET", "X_REDIRECT_URI"]);
  warnIncompleteGroup("Discord OAuth", ["DISCORD_CLIENT_ID", "DISCORD_CLIENT_SECRET", "DISCORD_REDIRECT_URI"]);
  warnIncompleteGroup("GitHub OAuth", ["GITHUB_CLIENT_ID", "GITHUB_CLIENT_SECRET", "GITHUB_REDIRECT_URI"]);
  warnIncompleteGroup("chain minting", ["CHAIN_RPC_URL", "ARC_CHAIN_ID", "RELAYER_PRIVATE_KEY", "FOUNDER_PASS_CONTRACT_ADDRESS", "BUILDER_PASS_CONTRACT_ADDRESS"]);
  if (configured("EXPLORER_API_URL") && !configured("EXPLORER_API_KEY")) {
    try {
      const hostname = new URL(process.env.EXPLORER_API_URL!).hostname.toLowerCase();
      const publicBlockscout = hostname === "arcscan.app"
        || hostname.endsWith(".arcscan.app")
        || hostname === "blockscout.com"
        || hostname.endsWith(".blockscout.com");
      if (!publicBlockscout) console.warn("Custom activity provider is missing EXPLORER_API_KEY and will be unavailable.");
    } catch {
      console.warn("Custom activity provider URL is invalid and will be unavailable.");
    }
  }
  warnIncompleteGroup("Cloudflare R2", ["CLOUDFLARE_R2_ENDPOINT", "CLOUDFLARE_R2_ACCESS_KEY_ID", "CLOUDFLARE_R2_SECRET_ACCESS_KEY", "CLOUDFLARE_R2_BUCKET", "CLOUDFLARE_R2_PUBLIC_URL"]);
  if (isProduction) {
    for (const name of ["DATABASE_URL", "SESSION_SECRET", "APP_URL", "OAUTH_STATE_SIGNING_KEY", "MINT_SIGNING_KEY"]) {
      if (!configured(name)) throw new Error(`${name} is required in production`);
    }
    try {
      if (new URL(process.env.APP_URL!).protocol !== "https:") throw new Error("APP_URL must use HTTPS in production");
    } catch (error) {
      if (error instanceof Error && error.message === "APP_URL must use HTTPS in production") throw error;
      throw new Error("APP_URL must be a valid HTTPS origin in production");
    }
    if (process.env.SESSION_SECRET!.length < 32) throw new Error("SESSION_SECRET must be at least 32 characters in production");
    for (const name of ["OAUTH_STATE_SIGNING_KEY", "MINT_SIGNING_KEY"]) {
      let decoded: Buffer;
      try { decoded = Buffer.from(process.env[name]!, "base64"); } catch { throw new Error(`${name} must be base64 in production`); }
      if (decoded.length < 32) throw new Error(`${name} must decode to at least 32 bytes in production`);
    }
    if (configured("CLOUDFLARE_R2_PUBLIC_URL")) {
      try {
        if (new URL(process.env.CLOUDFLARE_R2_PUBLIC_URL!).protocol !== "https:") throw new Error("CLOUDFLARE_R2_PUBLIC_URL must use HTTPS in production");
      } catch (error) {
        if (error instanceof Error && error.message === "CLOUDFLARE_R2_PUBLIC_URL must use HTTPS in production") throw error;
        throw new Error("CLOUDFLARE_R2_PUBLIC_URL must be a valid HTTPS URL in production");
      }
    }
  }
}

export const configuration = {
  isProduction,
  enableDevMocks,
  enableDevTestIdentities,
  devEligibleXHandles: new Set(devEligibleXHandles),
  devEligibleDiscordHandles: new Set(devEligibleDiscordHandles),
  enableDevAdminBootstrap,
  devAdminBootstrapEmail,
  builderPhaseName,
  builderPhaseClaimLimit,
  appUrl: process.env.APP_URL || process.env.FRONTEND_URL || "http://localhost:5173",
  mintingConfigured: ["CHAIN_RPC_URL", "ARC_CHAIN_ID", "RELAYER_PRIVATE_KEY", "FOUNDER_PASS_CONTRACT_ADDRESS", "BUILDER_PASS_CONTRACT_ADDRESS"].every(configured),
  // Builder activity defaults to the public Arcscan Blockscout endpoint. A
  // custom provider may still require EXPLORER_API_KEY at request time.
  activityProviderConfigured: true,
  cloudflareR2Configured: ["CLOUDFLARE_R2_ENDPOINT", "CLOUDFLARE_R2_ACCESS_KEY_ID", "CLOUDFLARE_R2_SECRET_ACCESS_KEY", "CLOUDFLARE_R2_BUCKET", "CLOUDFLARE_R2_PUBLIC_URL"].every(configured),
  emailConfigured: configured("RESEND_API_KEY"),
};
