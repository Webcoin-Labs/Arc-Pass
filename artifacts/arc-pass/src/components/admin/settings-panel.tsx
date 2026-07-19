import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const INTEGRATIONS = [
  { name: "X OAuth", vars: "X_CLIENT_ID, X_CLIENT_SECRET, X_REDIRECT_URI", fallback: "Required for X identity checks; no synthetic production identity is created when unset." },
  { name: "Discord OAuth", vars: "DISCORD_CLIENT_ID, DISCORD_CLIENT_SECRET, DISCORD_REDIRECT_URI", fallback: "Required for Discord identity checks; guild membership is supporting evidence only." },
  { name: "GitHub verification", vars: "GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET, GITHUB_REDIRECT_URI", fallback: "Active for Builder verification. Founder claims remain invite-only and do not require GitHub." },
  { name: "Gemini support and analysis", vars: "GEMINI_API_KEY, GEMINI_SUPPORT_MODEL / GEMINI_ANALYSIS_MODEL (optional)", fallback: "Optional qualitative enrichment and the public chat helper only. AI never grants eligibility, sets a tier, proves a wallet, claims, or mints." },
  { name: "Onchain minting", vars: "CHAIN_RPC_URL, ARC_CHAIN_ID, RELAYER_PRIVATE_KEY, FOUNDER_PASS_CONTRACT_ADDRESS, BUILDER_PASS_CONTRACT_ADDRESS", fallback: "Fails closed when configuration is incomplete." },
  { name: "Explorer / indexer", vars: "EXPLORER_API_URL (optional), EXPLORER_API_KEY (custom providers only)", fallback: "Builder activity uses Arcscan by default; custom providers need both values." },
  { name: "Discord guild membership", vars: "ARC_DISCORD_GUILD_ID", fallback: "Optional supporting signal only; shows member status and join date." },
  { name: "Production media storage", vars: "CLOUDFLARE_R2_ENDPOINT, CLOUDFLARE_R2_ACCESS_KEY_ID, CLOUDFLARE_R2_SECRET_ACCESS_KEY, CLOUDFLARE_R2_BUCKET, CLOUDFLARE_R2_PUBLIC_URL", fallback: "Required in production because local Railway disk is ephemeral." },
  { name: "Signed authorizations", vars: "MINT_SIGNING_KEY, OAUTH_STATE_SIGNING_KEY", fallback: "Uses an ephemeral key in dev; set a persistent key in production." },
];

export function SettingsPanel() {
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Integration status is configured entirely through environment variables — see <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">.env.example</code> at
        the repo root. Nothing here is editable from the UI for security reasons.
      </p>
      {INTEGRATIONS.map((integration) => (
        <Card key={integration.name}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">{integration.name}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-mono text-xs text-muted-foreground">{integration.vars}</p>
            <p className="mt-1.5 text-xs text-muted-foreground">{integration.fallback}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
