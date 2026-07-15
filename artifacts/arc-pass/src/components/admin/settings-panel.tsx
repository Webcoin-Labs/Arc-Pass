import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const INTEGRATIONS = [
  { name: "X OAuth", vars: "X_CLIENT_ID, X_CLIENT_SECRET, X_REDIRECT_URI", fallback: "Falls back to a demo identity when unset." },
  { name: "Discord OAuth", vars: "DISCORD_CLIENT_ID, DISCORD_CLIENT_SECRET, DISCORD_REDIRECT_URI", fallback: "Falls back to a demo identity when unset." },
  { name: "GitHub verification", vars: "Not currently active", fallback: "Coming soon. GitHub does not affect eligibility." },
  { name: "Gemini analysis", vars: "GEMINI_API_KEY", fallback: "Falls back to a deterministic heuristic summary when unset." },
  { name: "Onchain minting", vars: "CHAIN_RPC_URL, RELAYER_PRIVATE_KEY, FOUNDER_PASS_CONTRACT_ADDRESS, BUILDER_PASS_CONTRACT_ADDRESS", fallback: "Fails closed when configuration is incomplete." },
  { name: "Explorer / indexer", vars: "EXPLORER_API_URL, EXPLORER_API_KEY", fallback: "Verification is unavailable when configuration is incomplete." },
  { name: "Discord guild check", vars: "ARC_DISCORD_GUILD_ID", fallback: "Skipped (returns unknown) when unset." },
  { name: "Signed authorizations", vars: "MINT_SIGNING_KEY, OAUTH_STATE_SIGNING_KEY", fallback: "Uses an ephemeral key in dev — set a persistent key in production." },
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
