const isProduction = process.env.NODE_ENV === "production";

function configured(name: string): boolean {
  return Boolean(process.env[name]?.trim());
}

function assertCompleteGroup(label: string, names: string[]): void {
  const present = names.filter(configured);
  if (present.length > 0 && present.length !== names.length) {
    const missing = names.filter((name) => !configured(name));
    throw new Error(`${label} configuration is incomplete. Missing: ${missing.join(", ")}`);
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
const devAdminBootstrapEmail = process.env.DEV_ADMIN_BOOTSTRAP_EMAIL?.trim().toLowerCase() ?? "";

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
    testIdentityHandlesConfigured: devEligibleXHandles.length > 0,
    adminBootstrapEnabled: enableDevAdminBootstrap,
    adminBootstrapEmailConfigured: Boolean(devAdminBootstrapEmail),
  });
  if (isProduction && configured("DEV_DATABASE_URL")) {
    throw new Error("DEV_DATABASE_URL is forbidden in production");
  }
  if (enableDevTestIdentities && devEligibleXHandles.length === 0) {
    throw new Error("ENABLE_DEV_TEST_IDENTITIES=true requires DEV_ELIGIBLE_X_HANDLES");
  }
  if (enableDevAdminBootstrap && !devAdminBootstrapEmail) {
    throw new Error("ENABLE_DEV_ADMIN_BOOTSTRAP=true requires DEV_ADMIN_BOOTSTRAP_EMAIL");
  }
  assertCompleteGroup("X OAuth", ["X_CLIENT_ID", "X_CLIENT_SECRET", "X_REDIRECT_URI"]);
  assertCompleteGroup("Discord OAuth", ["DISCORD_CLIENT_ID", "DISCORD_CLIENT_SECRET", "DISCORD_REDIRECT_URI"]);
  assertCompleteGroup("chain minting", ["CHAIN_RPC_URL", "RELAYER_PRIVATE_KEY", "FOUNDER_PASS_CONTRACT_ADDRESS", "BUILDER_PASS_CONTRACT_ADDRESS"]);
  assertCompleteGroup("activity provider", ["EXPLORER_API_URL", "EXPLORER_API_KEY"]);
  assertCompleteGroup("Typeform webhook", ["TYPEFORM_FORM_ID", "TYPEFORM_API_TOKEN", "TYPEFORM_WEBHOOK_SECRET"]);
  if (isProduction) {
    for (const name of ["DATABASE_URL", "SESSION_SECRET", "APP_URL", "OAUTH_STATE_SIGNING_KEY", "MINT_SIGNING_KEY"]) {
      if (!configured(name)) throw new Error(`${name} is required in production`);
    }
  }
}

export const configuration = {
  isProduction,
  enableDevMocks,
  enableDevTestIdentities,
  devEligibleXHandles: new Set(devEligibleXHandles),
  enableDevAdminBootstrap,
  devAdminBootstrapEmail,
  appUrl: process.env.APP_URL || process.env.FRONTEND_URL || "http://localhost:5173",
  mintingConfigured: ["CHAIN_RPC_URL", "RELAYER_PRIVATE_KEY", "FOUNDER_PASS_CONTRACT_ADDRESS", "BUILDER_PASS_CONTRACT_ADDRESS"].every(configured),
  activityProviderConfigured: ["EXPLORER_API_URL", "EXPLORER_API_KEY"].every(configured),
};
