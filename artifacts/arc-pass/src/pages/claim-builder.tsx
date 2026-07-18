import { useRef, useState } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { ArrowRight, CheckCircle2, Download, ExternalLink, Eye, FastForward, Github, Lock, RotateCcw, Share2, ShieldAlert, WalletCards } from "lucide-react";
import { SiX } from "react-icons/si";
import { DiscordIcon } from "@/components/discord-icon";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import {
  useGetMe,
  useGetUserProfile,
  useListUserWallets,
  useListMyPasses,
  useGetBuilderSupply,
  useVerifyBuilder,
  useClaimBuilderPass,
  useMintBuilderPass,
  getGetMeQueryKey,
  getGetUserProfileQueryKey,
  getListUserWalletsQueryKey,
  getListMyPassesQueryKey,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { BuilderPassCard } from "@/components/builder-pass-card";
import { WalletManager } from "@/components/wallet-manager";
import { VerificationStepper } from "@/components/verification-stepper";
import { AnalysisProgress } from "@/components/analysis-progress";
import { MintModal, type MintParams } from "@/components/mint-modal";
import { MintSuccess } from "@/components/mint-success";
import { Skeleton } from "@/components/ui/skeleton";
import { downloadNodeAsPng, shareNodeOnX } from "@/lib/export-image";
import { formatDate } from "@/lib/format";

const STEP_LABELS = ["Verify identity", "Connect GitHub", "Verify wallets", "Analyse activity", "Review pass", "Record onchain"];
const ANALYSIS_MESSAGES = [
  "Checking verified wallet history",
  "Reviewing contract deployments",
  "Calculating your Onchain Builder tier",
  "Preparing the verification record",
];

const BUILDER_TIER_GUIDE = [
  { name: "Bronze", threshold: 2, emblem: "/tiers/bronze.png", tone: "#d18a56" },
  { name: "Silver", threshold: 10, emblem: "/tiers/silver.png", tone: "#b6c5d8" },
  { name: "Gold", threshold: 50, emblem: "/tiers/gold.png", tone: "#f0bd4e" },
  { name: "Platinum", threshold: 100, emblem: "/tiers/platinum.png", tone: "#7de0dc" },
  { name: "Diamond", threshold: 1000, emblem: "/tiers/diamond.png", tone: "#9eb4ff" },
] as const;

export default function ClaimBuilderPage() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { data: user, isLoading: userLoading } = useGetMe({ query: { retry: false, queryKey: getGetMeQueryKey() } });
  const { data: profile } = useGetUserProfile({ query: { enabled: !!user, queryKey: getGetUserProfileQueryKey() } });
  const { data: wallets = [], isLoading: walletsLoading } = useListUserWallets({ query: { enabled: !!user, queryKey: getListUserWalletsQueryKey() } });
  const { data: passes, isLoading: passesLoading } = useListMyPasses({ query: { enabled: !!user, queryKey: getListMyPassesQueryKey() } });
  const { data: supply } = useGetBuilderSupply();

  const verifyBuilder = useVerifyBuilder();
  const claimPass = useClaimBuilderPass();
  const mintPass = useMintBuilderPass();

  const [mintOpen, setMintOpen] = useState(false);
  const [revealState, setRevealState] = useState<"idle" | "ready" | "revealing" | "revealed">("idle");
  const reduceMotion = useReducedMotion();
  const cardRef = useRef<HTMLDivElement>(null);

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/passes/me"] });
    queryClient.invalidateQueries({ queryKey: ["/api/users/me"] });
  };

  const handleDownload = () => {
    if (cardRef.current) void downloadNodeAsPng(cardRef.current, "arc-pass-builder.png");
  };

  if (userLoading || (!!user && passesLoading)) {
    return (
      <div className="mx-auto flex w-full max-w-xl flex-1 flex-col items-center justify-center gap-6 px-3 py-8 sm:p-6">
        <Skeleton className="h-11 w-full" />
        <Skeleton className="h-[360px] w-full max-w-[520px] rounded-[22px] sm:aspect-[1.58/1] sm:h-auto sm:rounded-[28px]" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center p-6 text-center">
        <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-muted">
          <Lock className="h-6 w-6 text-muted-foreground" />
        </div>
        <h1 className="text-xl font-semibold">Verify your identity to continue</h1>
        <p className="mt-2 max-w-sm text-sm text-muted-foreground">Sign in with X or Discord to verify your social identity.</p>
        <div className="mt-6 flex w-full max-w-xs flex-col gap-3">
          <Button variant="outline" size="lg" className="h-12 gap-2" asChild>
            <a href="/api/auth/discord">
              <DiscordIcon className="h-4 w-5 text-[#5865F2]" /> Continue with Discord
            </a>
          </Button>
          <Button variant="outline" size="lg" className="h-12 gap-2" asChild>
            <a href="/api/auth/x">
              <SiX className="h-4 w-4" /> Continue with X
            </a>
          </Button>
        </div>
      </div>
    );
  }

  const socialConnected = !!profile?.connections.discord.connected || !!profile?.connections.x.connected;
  const githubConnected = !!profile?.connections.github.connected;
  // Prefer the dashboard query because it is invalidated after claiming and
  // minting. The verification response is only a fallback while that query
  // is refreshing; otherwise it can leave the page showing the old locked
  // state after a successful claim.
  const builderPass = passes?.builder ?? verifyBuilder.data?.builderPass;
  const github = profile?.connections.github;
  const githubAgeDays = github?.accountCreatedAt
    ? Math.max(0, Math.floor((Date.now() - new Date(github.accountCreatedAt).getTime()) / 86_400_000))
    : null;
  const qualifyingTransactions = builderPass?.qualifyingTransactionCount ?? null;
  const nextTier = typeof qualifyingTransactions === "number"
    ? BUILDER_TIER_GUIDE.find((tier) => tier.threshold > qualifyingTransactions) ?? null
    : null;
  const remainingForNextTier = nextTier && typeof qualifyingTransactions === "number"
    ? Math.max(nextTier.threshold - qualifyingTransactions, 0)
    : null;

  const developmentTestIdentity = profile?.isDevelopmentTestIdentity === true;
  const step = !socialConnected ? 1 : !githubConnected ? 2 : wallets.length === 0 && !developmentTestIdentity ? 3 : !builderPass ? 4 : builderPass.claimStatus === "locked" ? 5 : 6;

  const handleVerify = () => {
    verifyBuilder.mutate(undefined, {
      onSuccess: invalidateAll,
      onError: (err: unknown) => toast.error(err instanceof Error ? err.message : "Verification failed"),
    });
  };

  const handleClaim = () => {
    claimPass.mutate(undefined, {
      onSuccess: () => {
        setRevealState("ready");
        void invalidateAll();
      },
      onError: (err: unknown) => toast.error(err instanceof Error ? err.message : "Couldn't claim your pass"),
    });
  };

  const handleMint = (params: MintParams) => {
    mintPass.mutate(
      { data: { mintMethod: params.mintMethod, walletAddress: params.walletAddress, network: params.network } },
      {
        onSuccess: () => {
          invalidateAll();
          setMintOpen(false);
        },
        onError: (err: unknown) => toast.error(err instanceof Error ? err.message : "Minting failed"),
      },
    );
  };

  const handleShare = () => {
    if (builderPass && cardRef.current) void shareNodeOnX({ node: cardRef.current, passType: "builder", passId: builderPass.id, minted: builderPass.claimStatus === "minted", returnTo: "/claim/builder" });
  };

  const revealPass = () => {
    setRevealState("revealing");
    window.setTimeout(() => setRevealState("revealed"), reduceMotion ? 0 : 900);
  };

  const skipReveal = () => setRevealState("revealed");

  return (
    <div className="flex flex-1 flex-col items-center px-3 py-10 sm:px-6 sm:py-12">
      <div className="mb-10 w-full max-w-md">
        <VerificationStepper steps={STEP_LABELS} currentStep={Math.min(step, 6)} />
      </div>

      <div className="w-full max-w-3xl">
        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div key="s1" initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 16 }} className="mx-auto max-w-md text-center">
              <h1 className="text-2xl font-bold">Verify a social identity</h1>
              <p className="mt-2 text-muted-foreground">X or Discord is sufficient. You can connect the second account later.</p>
              <Button size="lg" className="mt-8 h-12 w-full gap-2" asChild>
                <a href="/api/auth/discord">
                  <DiscordIcon className="h-4 w-5" /> Connect Discord
                </a>
              </Button>
              <Button size="lg" variant="outline" className="mt-3 h-12 w-full gap-2" asChild>
                <a href="/api/auth/x"><SiX className="h-4 w-4" /> Connect X</a>
              </Button>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div key="github" initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 16 }} className="mx-auto max-w-md text-center">
              <Github className="mx-auto h-12 w-12" aria-hidden="true" />
              <h1 className="mt-5 text-2xl font-bold">Connect GitHub</h1>
              <p className="mt-2 max-w-lg text-sm leading-6 text-pretty text-muted-foreground">Builder review requires a GitHub account at least 180 days old with 10 or more contributions during the previous 180 days.</p>
              <p className="mt-2 text-muted-foreground">Verify ownership of your developer identity before Arc Pass analyses wallets or allows a claim.</p>
              <Button size="lg" className="mt-8 h-12 w-full gap-2" asChild>
                <a href="/api/auth/github?returnTo=%2Fclaim%2Fbuilder"><Github className="h-4 w-4" aria-hidden="true" /> Connect GitHub</a>
              </Button>
            </motion.div>
          )}

          {(step === 3 || step === 4) && !verifyBuilder.isPending && (
            <motion.div key="wallets" initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 16 }} className="mx-auto max-w-md">
              <div className="mb-6 text-center">
                <h1 className="text-2xl font-bold">Connect and verify a wallet</h1>
                <p className="mt-2 text-muted-foreground">Each wallet must sign a one-time server challenge before its public activity can be analysed.</p>
              </div>
              {walletsLoading ? (
                <Skeleton className="h-32 w-full rounded-xl" />
              ) : (
                <>
                  <WalletManager wallets={wallets} />
                  <Button size="lg" className="mt-6 h-12 w-full" disabled={wallets.length === 0} onClick={handleVerify}>
                    Start Analysis <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </>
              )}
            </motion.div>
          )}

          {verifyBuilder.isPending && (
            <motion.div key="analyzing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-center py-16">
              <AnalysisProgress messages={ANALYSIS_MESSAGES} active />
            </motion.div>
          )}

          {step === 5 && !verifyBuilder.isPending && builderPass && (
            <motion.div key="s5" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col items-center gap-8 md:flex-row md:items-start">
              <BuilderPassCard
                ref={cardRef}
                data={{ ...builderPass, discordAvatarUrl: profile?.avatarUrl, discordUsername: profile?.connections.discord.username, discordDiscriminator: profile?.connections.discord.discriminator }}
                className="max-w-[520px] md:max-w-[420px]"
              />
              <div className="flex-1 space-y-5 text-left">
                <div>
                  <h2 className="text-2xl font-bold">Here's your pass.</h2>
                  <p className="mt-1 text-muted-foreground">
                    {builderPass.eligibilityStatus === "eligible"
                      ? `You've been assigned ${builderPass.currentTier?.name ?? "a"} tier.`
                      : "No qualifying contract deployment was found for this profile yet."}
                  </p>
                </div>
                {verifyBuilder.data?.summary && (
                  <ul className="space-y-1.5 rounded-xl border bg-card p-4 text-sm text-muted-foreground">
                    {verifyBuilder.data.summary.map((line, i) => (
                      <li key={i}>{line}</li>
                    ))}
                  </ul>
                )}
                <div className="flex flex-col gap-3 sm:flex-row">
                  <Button
                    className="h-12 flex-1"
                    disabled={builderPass.eligibilityStatus !== "eligible" || claimPass.isPending}
                    onClick={handleClaim}
                  >
                    {claimPass.isPending ? "Claiming…" : "Claim Your Pass"}
                  </Button>
                </div>
              </div>
            </motion.div>
          )}

          {step === 6 && builderPass && builderPass.claimStatus !== "minted" && (
            <motion.div key="s6" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col items-center gap-8 text-center">
              <motion.div
                className="w-full max-w-[520px]"
                animate={revealState === "revealing" && !reduceMotion ? { scale: [0.985, 1.025, 1], rotateY: [0, -5, 0], filter: ["brightness(.65)", "brightness(1.25)", "brightness(1)"] } : undefined}
                transition={{ duration: 0.9, ease: "easeOut" }}
              >
                <BuilderPassCard
                  ref={cardRef}
                  data={{ ...builderPass, discordAvatarUrl: profile?.avatarUrl, discordUsername: profile?.connections.discord.username, discordDiscriminator: profile?.connections.discord.discriminator }}
                  concealed={revealState === "ready" || revealState === "revealing"}
                  className="max-w-[520px]"
                />
              </motion.div>
              <div>
                <h2 className="text-2xl font-bold">Added to your inventory</h2>
                <p className="mt-2 max-w-sm text-muted-foreground">Your Builder Pass is claimed to inventory but not yet minted onchain.</p>
              </div>
              {revealState === "ready" ? (
                <Button size="lg" className="h-12 w-full max-w-xs" onClick={revealPass}><Eye className="mr-2 h-4 w-4" /> Reveal your pass</Button>
              ) : revealState === "revealing" ? (
                <Button variant="outline" size="lg" className="h-12 w-full max-w-xs" onClick={skipReveal}><FastForward className="mr-2 h-4 w-4" /> Skip reveal</Button>
              ) : (
                <div className="grid w-full max-w-xl gap-3 sm:grid-cols-3">
                  <Button variant="outline" size="lg" className="h-12" onClick={handleDownload}><Download className="mr-2 h-4 w-4" /> Download</Button>
                  <Button variant="outline" size="lg" className="h-12" onClick={handleShare}><Share2 className="mr-2 h-4 w-4" /> Share on X</Button>
                  <Button size="lg" className="h-12" disabled={supply?.remainingClaims === 0} onClick={() => setMintOpen(true)}>
                    {supply?.remainingClaims === 0 ? "Wave 1 full" : "Mint Onchain"} <ExternalLink className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              )}
            </motion.div>
          )}

          {builderPass?.claimStatus === "minted" && (
            <motion.div key="minted" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center gap-10 md:flex-row md:items-start">
              <BuilderPassCard
                ref={cardRef}
                data={{ ...builderPass, discordAvatarUrl: profile?.avatarUrl, discordUsername: profile?.connections.discord.username, discordDiscriminator: profile?.connections.discord.discriminator }}
                className="max-w-[520px] md:max-w-[420px]"
              />
              <MintSuccess
                tokenId={builderPass.tokenId}
                destinationWallet={builderPass.destinationWallet}
                network={builderPass.network}
                transactionHash={builderPass.transactionHash}
                issuedAt={builderPass.initiallyIssuedAt}
                 onViewPass={() => setLocation(`/pass/builder/${builderPass.id}`)}
                 onDownload={handleDownload}
                 onShare={handleShare}
                 className="w-full max-w-sm flex-1"
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <section className="mt-14 w-full max-w-5xl rounded-3xl border bg-card p-4 shadow-sm sm:p-6" aria-labelledby="builder-tier-guide-title">
        <div className="max-w-2xl">
          <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-primary">Verified Arc activity</p>
          <h2 id="builder-tier-guide-title" className="mt-2 text-2xl font-semibold">Builder tier guide</h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">Your highest tier is calculated from qualifying transactions on ownership-verified wallets. Contract deployments appear as a separate proof signal on the card.</p>
        </div>
        <div className="mt-6 grid gap-2 sm:grid-cols-5">
          {BUILDER_TIER_GUIDE.map((tier) => (
            <div key={tier.name} className="flex min-h-20 items-center gap-3 rounded-2xl border p-3 sm:flex-col sm:items-start" style={{ borderColor: `${tier.tone}55`, background: `linear-gradient(145deg, ${tier.tone}18, transparent)` }}>
              <img src={tier.emblem} alt="" className="size-9 object-contain" />
              <div><p className="text-sm font-semibold">{tier.name}</p><p className="mt-0.5 font-mono text-[10px] text-muted-foreground">{tier.threshold.toLocaleString()}+ transactions</p></div>
            </div>
          ))}
        </div>
        <div className="mt-6 grid gap-3 rounded-2xl border bg-background/55 p-4 sm:grid-cols-3">
          <div><p className="text-xs text-muted-foreground">Current progress</p><p className="mt-1 text-lg font-semibold">{typeof qualifyingTransactions === "number" ? `${qualifyingTransactions.toLocaleString()} qualifying transactions` : "Arc activity not verified"}</p></div>
          <div><p className="text-xs text-muted-foreground">Current tier</p><p className="mt-1 text-lg font-semibold">{builderPass?.currentTier?.name ?? "Not assigned"}</p></div>
          <div><p className="text-xs text-muted-foreground">Next tier</p><p className="mt-1 text-lg font-semibold">{nextTier && remainingForNextTier !== null ? `${nextTier.name} · ${remainingForNextTier.toLocaleString()} remaining` : builderPass?.currentTier?.name === "Diamond" ? "Highest tier reached" : "Verify activity to calculate"}</p></div>
        </div>
      </section>

      <section className="mt-5 w-full max-w-5xl rounded-3xl border bg-card p-4 shadow-sm sm:p-6" aria-labelledby="builder-evidence-title">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-primary">Authenticated evidence</p>
            <h2 id="builder-evidence-title" className="mt-2 text-2xl font-semibold">Builder verification signals</h2>
          </div>
          <p className="text-xs text-muted-foreground">No manually entered GitHub username can satisfy these checks.</p>
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <EvidenceCard
            icon={Github}
            title="GitHub account age"
            value={githubAgeDays === null ? (githubConnected ? "GitHub data unavailable" : "GitHub not connected") : `${githubAgeDays.toLocaleString()} days`}
            state={githubAgeDays === null ? "unavailable" : githubAgeDays >= 180 ? "pass" : "fail"}
            detail="Minimum: 180 days"
          />
          <EvidenceCard
            icon={Github}
            title="GitHub contributions"
            value={github?.contributionCount == null ? (githubConnected ? "GitHub data unavailable" : "GitHub not connected") : `${github.contributionCount.toLocaleString()} contributions`}
            state={github?.contributionCount == null ? "unavailable" : github.contributionCount >= 10 ? "pass" : "fail"}
            detail={github?.contributionWindowStartedAt ? `Window: ${formatDate(github.contributionWindowStartedAt)} to today` : "Previous 180 days · minimum 10"}
          />
          <EvidenceCard icon={WalletCards} title="Wallet ownership" value={wallets.length > 0 ? `${wallets.length} ownership-verified wallet${wallets.length === 1 ? "" : "s"}` : "Wallet ownership not verified"} state={wallets.length > 0 ? "pass" : "action"} detail="A connection alone is not ownership proof" />
          <EvidenceCard icon={ShieldAlert} title="Arc activity" value={typeof qualifyingTransactions === "number" ? `${qualifyingTransactions.toLocaleString()} qualifying transactions` : "Verification not completed"} state={typeof qualifyingTransactions === "number" ? (qualifyingTransactions >= 2 ? "pass" : "fail") : "unavailable"} detail={typeof builderPass?.validContractCount === "number" ? `${builderPass.validContractCount.toLocaleString()} verified contract deployments` : "Real RPC/indexer data required"} />
        </div>
        {builderPass && <p className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-full border px-4 text-xs text-muted-foreground"><RotateCcw className="size-3.5" aria-hidden="true" /> Re-verification {builderPass.nextVerificationAt ? `available ${formatDate(builderPass.nextVerificationAt)}` : "available after the initial verification"}</p>}
      </section>

      {builderPass && builderPass.claimStatus !== "locked" && supply && (
        <section className="mt-5 w-full max-w-5xl rounded-2xl border bg-card p-4" aria-label="Wave 1 onchain mint allocation">
          <div className="flex flex-wrap items-center justify-between gap-2 text-sm"><strong>Wave 1 onchain mints: {supply.totalMinted.toLocaleString()} / {supply.phaseClaimLimit.toLocaleString()}</strong><span className="text-muted-foreground">{supply.remainingClaims.toLocaleString()} mint slots remain</span></div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary" style={{ width: `${Math.min(100, (supply.totalMinted / supply.phaseClaimLimit) * 100)}%` }} /></div>
        </section>
      )}

      <MintModal open={mintOpen} onOpenChange={setMintOpen} network="arc" onMint={handleMint} isPending={mintPass.isPending} />
    </div>
  );
}

function EvidenceCard({
  icon: Icon,
  title,
  value,
  detail,
  state,
}: {
  icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean | "true" | "false" }>;
  title: string;
  value: string;
  detail: string;
  state: "pass" | "fail" | "action" | "unavailable";
}) {
  const stateLabel = state === "pass" ? "Requirement met" : state === "fail" ? "Requirement not met" : state === "action" ? "Action required" : "Verification unavailable";
  return (
    <article className="rounded-2xl border bg-background/55 p-4">
      <div className="flex items-start justify-between gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary"><Icon className="size-4" aria-hidden="true" /></span>
        <span className={state === "pass" ? "inline-flex items-center gap-1 text-xs font-semibold text-success" : state === "fail" ? "inline-flex items-center gap-1 text-xs font-semibold text-destructive" : "inline-flex items-center gap-1 text-xs font-semibold text-amber-600 dark:text-amber-300"}>
          {state === "pass" ? <CheckCircle2 className="size-3.5" aria-hidden="true" /> : <ShieldAlert className="size-3.5" aria-hidden="true" />}
          {stateLabel}
        </span>
      </div>
      <p className="mt-4 text-xs text-muted-foreground">{title}</p>
      <p className="mt-1 text-base font-semibold">{value}</p>
      <p className="mt-1 text-xs leading-5 text-muted-foreground">{detail}</p>
    </article>
  );
}
