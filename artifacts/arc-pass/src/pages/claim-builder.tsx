import { useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { ArrowRight, CheckCircle2, Download, ExternalLink, Eye, FastForward, Github, LayoutDashboard, RotateCcw, ShieldAlert, WalletCards } from "lucide-react";
import { SiX } from "react-icons/si";
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
import { BuilderPassCard, BuilderPassRank } from "@/components/builder-pass-card";
import { WalletManager } from "@/components/wallet-manager";
import { VerificationStepper } from "@/components/verification-stepper";
import { AnalysisProgress } from "@/components/analysis-progress";
import { TierRevealCeremony } from "@/components/tier-reveal-ceremony";
import { MintModal, type MintParams } from "@/components/mint-modal";
import { MintSuccess } from "@/components/mint-success";
import { Skeleton } from "@/components/ui/skeleton";
import { DiscordIcon } from "@/components/discord-icon";
import { downloadNodeAsPng, shareNodeOnX } from "@/lib/export-image";
import { formatDate } from "@/lib/format";
import { IdentityVerificationGate } from "@/components/identity-verification-gate";
import { ConfettiBurst } from "@/components/confetti-burst";
import { ShareReminder } from "@/components/share-reminder";
import { identityOAuthHref, pendingIdentityMatches, readPendingEligibilityIdentity } from "@/lib/pending-eligibility";

const STEP_LABELS = ["Verify identity", "Connect GitHub", "Verify wallets", "Analyse activity", "Review pass", "Record onchain"];
const ANALYSIS_MESSAGES = [
  "Checking verified wallet history",
  "Reviewing contract deployments",
  "Calculating your Onchain Builder tier",
  "Preparing the verification record",
];

const IDENTITY_ACK_KEY = "arc-pass:identity-step-acknowledged";

const BUILDER_TIER_GUIDE = [
  { name: "Bronze", arcThreshold: 2, githubThreshold: 10, githubAge: "180d", emblem: "/tiers/bronze.png", tone: "#d18a56" },
  { name: "Silver", arcThreshold: 10, githubThreshold: 250, githubAge: "1y", emblem: "/tiers/silver.png", tone: "#b6c5d8" },
  { name: "Gold", arcThreshold: 50, githubThreshold: 750, githubAge: "2y", emblem: "/tiers/gold.png", tone: "#f0bd4e" },
  { name: "Platinum", arcThreshold: 100, githubThreshold: 1_500, githubAge: "3y", emblem: "/tiers/platinum.png", tone: "#7de0dc" },
  { name: "Diamond", arcThreshold: 1_000, githubThreshold: 3_000, githubAge: "4y", emblem: "/tiers/diamond.png", tone: "#9eb4ff" },
] as const;

export default function ClaimBuilderPage() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { data: user, isLoading: userLoading } = useGetMe({ query: { retry: false, queryKey: getGetMeQueryKey() } });
  const { data: profile, isLoading: profileLoading } = useGetUserProfile({ query: { enabled: !!user, queryKey: getGetUserProfileQueryKey() } });
  const { data: wallets = [], isLoading: walletsLoading } = useListUserWallets({ query: { enabled: !!user, queryKey: getListUserWalletsQueryKey() } });
  const { data: passes, isLoading: passesLoading } = useListMyPasses({ query: { enabled: !!user, queryKey: getListMyPassesQueryKey() } });
  const { data: supply } = useGetBuilderSupply();

  const verifyBuilder = useVerifyBuilder();
  const claimPass = useClaimBuilderPass();
  const mintPass = useMintBuilderPass();

  const [mintOpen, setMintOpen] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [tierRevealPassId, setTierRevealPassId] = useState<number | null>(null);
  const [revealState, setRevealState] = useState<"idle" | "ready" | "revealing" | "revealed">("idle");
  const [confettiBurst, setConfettiBurst] = useState(0);
  const [identityAcknowledged, setIdentityAcknowledged] = useState(() => {
    try { return window.sessionStorage.getItem(IDENTITY_ACK_KEY) === "1"; } catch { return false; }
  });
  const reduceMotion = useReducedMotion();
  const cardRef = useRef<HTMLDivElement>(null);
  const pendingIdentity = readPendingEligibilityIdentity();

  useEffect(() => {
    if (!confettiBurst) return;
    const timer = window.setTimeout(() => setConfettiBurst(0), 3200);
    return () => window.clearTimeout(timer);
  }, [confettiBurst]);

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/passes/me"] });
    queryClient.invalidateQueries({ queryKey: ["/api/users/me"] });
  };

  const handleDownload = () => {
    if (cardRef.current) void downloadNodeAsPng(cardRef.current, "arc-pass-builder.png");
  };

  if (userLoading || (!!user && (passesLoading || profileLoading))) {
    return (
      <div className="mx-auto flex w-full max-w-xl flex-1 flex-col items-center justify-center gap-6 px-3 py-8 sm:p-6">
        <Skeleton className="h-11 w-full" />
        <Skeleton className="h-[430px] w-full max-w-[720px] rounded-[22px] sm:h-[400px] sm:rounded-[28px]" />
      </div>
    );
  }

  if (!user || !pendingIdentityMatches(profile, pendingIdentity)) {
    return <IdentityVerificationGate authenticated={!!user} profile={profile} pending={pendingIdentity} returnTo="/claim/builder" builderJourney />;
  }

  const discordConnection = profile?.connections.discord;
  const xConnection = profile?.connections.x;
  const discordExtra = (discordConnection ?? {}) as { arcMember?: boolean | null; arcJoinedAt?: string | null };
  const discordConnected = !!discordConnection?.connected;
  const xConnected = !!xConnection?.connected;
  const socialConnected = discordConnected || xConnected;
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
  const currentTierIndex = BUILDER_TIER_GUIDE.findIndex((tier) => tier.name === builderPass?.currentTier?.name);
  const nextTier = currentTierIndex >= 0 ? (BUILDER_TIER_GUIDE[currentTierIndex + 1] ?? null) : BUILDER_TIER_GUIDE[0];

  const arcMember = discordExtra.arcMember ?? builderPass?.discordCommunityMember ?? null;
  const arcJoinedAt = discordExtra.arcJoinedAt ?? builderPass?.discordCommunityJoinedAt ?? null;
  const membershipLine = arcMember === true
    ? `Arc Discord member${arcJoinedAt ? ` since ${formatDate(arcJoinedAt)}` : ""}`
    : arcMember === false
      ? "Not in the Arc Discord yet"
      : "Membership confirmed during verification";

  // Wrapped stats ship ahead of the regenerated API client types.
  const wrappedStats = (builderPass ?? {}) as { firstTransactionAt?: string | null };

  const developmentTestIdentity = profile?.isDevelopmentTestIdentity === true;
  // Both providers connected (or GitHub already linked from an earlier visit)
  // means the identity step has clearly been completed — no need to re-ask.
  const identityDone = socialConnected && (identityAcknowledged || (discordConnected && xConnected) || githubConnected);
  const step = !identityDone ? 1 : !githubConnected ? 2 : wallets.length === 0 && !developmentTestIdentity ? 3 : !builderPass ? 4 : builderPass.claimStatus === "locked" ? 5 : 6;

  const continueFromIdentity = () => {
    try { window.sessionStorage.setItem(IDENTITY_ACK_KEY, "1"); } catch { /* flow works without persistence */ }
    setIdentityAcknowledged(true);
  };

  const handleVerify = () => {
    verifyBuilder.mutate(undefined, {
      onSuccess: (result) => {
        setTierRevealPassId(result.builderPass.id);
        invalidateAll();
      },
      onError: (err: unknown) => toast.error(err instanceof Error ? err.message : "Verification failed"),
    });
  };

  const handleClaim = () => {
    claimPass.mutate(undefined, {
      onSuccess: () => {
        setRevealState("ready");
        setConfettiBurst((value) => value + 1);
        void invalidateAll();
      },
      onError: (err: unknown) => toast.error(err instanceof Error ? err.message : "Couldn't claim your pass"),
    });
  };

  const handleMint = async (params: MintParams) => {
    await mintPass.mutateAsync({ data: { mintMethod: params.mintMethod, walletAddress: params.walletAddress, network: params.network } });
    invalidateAll();
    setMintOpen(false);
    setConfettiBurst((value) => value + 1);
  };

  const sharePass = async () => {
    if (!builderPass || !cardRef.current || isSharing) return;
    setIsSharing(true);
    try {
      const mode = await shareNodeOnX({ node: cardRef.current, passType: "builder", passId: builderPass.id, minted: builderPass.claimStatus === "minted", returnTo: "/claim/builder" });
      if (mode === "fallback") toast.info("X opened with your verified pass link. Attach the downloaded pass image if your browser saved one.");
    } finally {
      setIsSharing(false);
    }
  };

  const handleShare = async () => {
    try {
      await sharePass();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "The X share flow could not be opened.");
    }
  };

  const revealPass = () => {
    setRevealState("revealing");
    window.setTimeout(() => setRevealState("revealed"), reduceMotion ? 0 : 900);
  };

  const skipReveal = () => setRevealState("revealed");
  const showTierCeremony = step === 5 && !!builderPass && tierRevealPassId === builderPass.id;
  const displayedStep = showTierCeremony ? 4 : Math.min(step, 6);

  return (
    <div className="flex flex-1 flex-col items-center px-3 py-10 sm:px-6 sm:py-12">
      <ConfettiBurst burst={confettiBurst} reduceMotion={reduceMotion} />

      {builderPass && (
        <ArcWrapped
          firstTransactionAt={wrappedStats.firstTransactionAt ?? null}
          qualifyingTransactions={builderPass.qualifyingTransactionCount ?? null}
          activityScore={builderPass.activityScore ?? null}
          tierName={builderPass.currentTier?.name ?? null}
          reduceMotion={reduceMotion}
        />
      )}

      <div className={builderPass ? "mb-10 mt-8 w-full max-w-5xl" : "mb-10 w-full max-w-5xl"}>
        <VerificationStepper steps={STEP_LABELS} currentStep={displayedStep} />
      </div>

      <div className="w-full max-w-6xl">
        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div key="identity" initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 16 }} className="mx-auto max-w-lg">
              <div className="text-center">
                <h1 className="text-2xl font-bold">Verify your social identity</h1>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">Discord or X anchors your builder identity. One is required — connecting both strengthens the verified record.</p>
              </div>

              <div className="mt-7 space-y-3">
                <IdentityProviderCard
                  icon={<DiscordIcon className="h-5 w-6 text-[#5865F2]" />}
                  label="Discord"
                  connected={discordConnected}
                  identity={discordConnection?.displayIdentity ?? discordConnection?.username ?? null}
                  detail={discordConnected ? membershipLine : "Connect Discord to record community membership"}
                  connectHref={identityOAuthHref("discord", "/claim/builder", pendingIdentity)}
                />
                <IdentityProviderCard
                  icon={<SiX className="size-4" />}
                  label="X"
                  connected={xConnected}
                  identity={xConnection?.username ? `@${xConnection.username}` : null}
                  detail={xConnected ? "Public identity anchor for eligibility lookups" : "Connect X to see your identity signals"}
                  connectHref={identityOAuthHref("x", "/claim/builder", pendingIdentity)}
                />
              </div>

              <Button size="lg" className="mt-6 h-12 w-full" disabled={!socialConnected} onClick={continueFromIdentity}>
                Continue <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              {!socialConnected && <p className="mt-2 text-center text-xs text-muted-foreground">Connect at least one account to continue.</p>}
            </motion.div>
          )}

          {step === 2 && (
            <motion.div key="github" initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 16 }} className="mx-auto max-w-md text-center">
              <Github className="mx-auto h-12 w-12" aria-hidden="true" />
              <h1 className="mt-5 text-2xl font-bold">Connect GitHub</h1>
              <p className="mt-2 max-w-lg text-sm leading-6 text-pretty text-muted-foreground">Authenticate GitHub so Arc Pass can verify your account age and previous 180 days of contributions. GitHub history or verified Arc activity can qualify you for a tier.</p>
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

          {showTierCeremony && builderPass && (
            <TierRevealCeremony
              passId={builderPass.id}
              tiers={BUILDER_TIER_GUIDE}
              awardedTierName={builderPass.currentTier?.name ?? null}
              activityScore={builderPass.activityScore ?? null}
              qualifyingTransactions={builderPass.qualifyingTransactionCount ?? null}
              githubContributions={profile?.connections.github.contributionCount ?? null}
              reduceMotion={reduceMotion}
              onContinue={() => {
                setTierRevealPassId(null);
                setConfettiBurst((value) => value + 1);
              }}
            />
          )}

          {step === 5 && !verifyBuilder.isPending && builderPass && !showTierCeremony && (
            <motion.div key="s5" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col items-center gap-8 lg:flex-row lg:items-start">
              <div className="w-full max-w-[720px]">
                <BuilderPassCard
                  ref={cardRef}
                  data={{ ...builderPass, discordAvatarUrl: profile?.avatarUrl, discordUsername: profile?.connections.discord.username, discordDiscriminator: profile?.connections.discord.discriminator }}
                  className="max-w-[720px]"
                />
                <BuilderPassRank data={builderPass} />
              </div>
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
                className="w-full max-w-[720px]"
                animate={revealState === "revealing" && !reduceMotion ? { scale: [0.985, 1.025, 1], rotateY: [0, -5, 0], filter: ["brightness(.65)", "brightness(1.25)", "brightness(1)"] } : undefined}
                transition={{ duration: 0.9, ease: "easeOut" }}
              >
                <BuilderPassCard
                  ref={cardRef}
                  data={{ ...builderPass, discordAvatarUrl: profile?.avatarUrl, discordUsername: profile?.connections.discord.username, discordDiscriminator: profile?.connections.discord.discriminator }}
                  concealed={revealState === "ready" || revealState === "revealing"}
                  className="max-w-[720px]"
                />
                <BuilderPassRank data={builderPass} concealed={revealState === "ready" || revealState === "revealing"} />
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
                <div className="w-full max-w-xl space-y-3">
                  <div className="grid gap-3 sm:grid-cols-3">
                    <Button variant="outline" size="lg" className="h-12" onClick={handleDownload}><Download className="mr-2 h-4 w-4" /> Download</Button>
                    <Button variant="outline" size="lg" className="h-12" disabled={isSharing} onClick={() => void handleShare()}><SiX className="mr-2 h-4 w-4" /> {isSharing ? "Opening X…" : "Share on X"}</Button>
                    <Button size="lg" className="h-12" disabled={supply?.remainingClaims === 0} onClick={() => setMintOpen(true)}>
                      {supply?.remainingClaims === 0 ? "Wave 1 full" : "Mint Onchain"} <ExternalLink className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                  <Button variant="ghost" size="lg" className="h-11 w-full" onClick={() => setLocation("/dashboard")}>
                    <LayoutDashboard className="mr-2 h-4 w-4" /> Continue to dashboard
                  </Button>
                </div>
              )}
            </motion.div>
          )}

          {builderPass?.claimStatus === "minted" && (
            <motion.div key="minted" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center gap-10 lg:flex-row lg:items-start">
              <div className="w-full max-w-[720px]">
                <BuilderPassCard
                  ref={cardRef}
                  data={{ ...builderPass, discordAvatarUrl: profile?.avatarUrl, discordUsername: profile?.connections.discord.username, discordDiscriminator: profile?.connections.discord.discriminator }}
                  className="max-w-[720px]"
                />
                <BuilderPassRank data={builderPass} />
              </div>
              <div className="w-full max-w-sm flex-1 space-y-3">
                <MintSuccess
                  tokenId={builderPass.tokenId}
                  contractAddress={builderPass.contractAddress}
                  destinationWallet={builderPass.destinationWallet}
                  network={builderPass.network}
                  transactionHash={builderPass.transactionHash}
                  issuedAt={builderPass.initiallyIssuedAt}
                  onViewPass={() => setLocation(`/pass/builder/${builderPass.id}`)}
                  onDownload={handleDownload}
                  onShare={handleShare}
                  className="w-full"
                />
                <Button variant="outline" size="lg" className="h-12 w-full" onClick={() => setLocation("/dashboard")}>
                  <LayoutDashboard className="mr-2 h-4 w-4" /> Continue to dashboard
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {builderPass && (
        <ShareReminder
          passType="builder"
          passId={builderPass.id}
          claimed={builderPass.claimStatus === "minted" || (builderPass.claimStatus === "claimed" && revealState === "revealed")}
          onShare={sharePass}
        />
      )}

      <section className="mt-14 w-full max-w-5xl rounded-3xl border bg-card p-4 shadow-sm sm:p-6" aria-labelledby="builder-evidence-title">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-primary">Authenticated evidence</p>
            <h2 id="builder-evidence-title" className="mt-2 text-2xl font-semibold">Builder verification signals</h2>
          </div>
          <p className="text-xs text-muted-foreground">No manually entered username can satisfy these checks.</p>
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <EvidenceCard
            icon={DiscordIcon}
            title="Discord identity"
            value={discordConnected ? (discordConnection?.displayIdentity ?? discordConnection?.username ?? "Connected") : "Discord not connected"}
            state={discordConnected ? "pass" : "action"}
            detail={discordConnected ? membershipLine : "Connect Discord to record community membership"}
            action={discordConnected ? undefined : { label: "Connect Discord", href: identityOAuthHref("discord", "/claim/builder", pendingIdentity) }}
          />
          <EvidenceCard
            icon={SiX}
            title="X identity"
            value={xConnected ? `@${xConnection?.username ?? ""}` : "X not connected"}
            state={xConnected ? "pass" : "action"}
            detail={xConnected ? "Public identity anchor for eligibility lookups" : "Connect X to see your identity metrics"}
            action={xConnected ? undefined : { label: "Connect X", href: identityOAuthHref("x", "/claim/builder", pendingIdentity) }}
          />
          <EvidenceCard
            icon={Github}
            title="GitHub account age"
            value={githubAgeDays === null ? (githubConnected ? "GitHub data unavailable" : "GitHub not connected") : `${githubAgeDays.toLocaleString()} days`}
            state={githubAgeDays === null ? "unavailable" : "pass"}
            detail="Older accounts can unlock higher GitHub-based tiers"
          />
          <EvidenceCard
            icon={Github}
            title="GitHub contributions"
            value={github?.contributionCount == null ? (githubConnected ? "GitHub data unavailable" : "GitHub not connected") : `${github.contributionCount.toLocaleString()} contributions`}
            state={github?.contributionCount == null ? "unavailable" : "pass"}
            detail={github?.contributionWindowStartedAt ? `Window: ${formatDate(github.contributionWindowStartedAt)} to today` : "Previous 180 days"}
          />
          <EvidenceCard icon={WalletCards} title="Wallet ownership" value={wallets.length > 0 ? `${wallets.length} ownership-verified wallet${wallets.length === 1 ? "" : "s"}` : "Wallet ownership not verified"} state={wallets.length > 0 ? "pass" : "action"} detail="A connection alone is not ownership proof" />
          <EvidenceCard icon={ShieldAlert} title="Arc activity" value={typeof qualifyingTransactions === "number" ? `${qualifyingTransactions.toLocaleString()} qualifying transactions` : "Verification not completed"} state={typeof qualifyingTransactions === "number" ? (qualifyingTransactions >= 2 ? "pass" : "fail") : "unavailable"} detail={typeof builderPass?.validContractCount === "number" ? `${builderPass.validContractCount.toLocaleString()} verified contract deployments` : "Real RPC/indexer data required"} />
        </div>
        {builderPass && <p className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-full border px-4 text-xs text-muted-foreground"><RotateCcw className="size-3.5" aria-hidden="true" /> Re-verification {builderPass.nextVerificationAt ? `available ${formatDate(builderPass.nextVerificationAt)}` : "available after the initial verification"}</p>}
      </section>

      <section className="mt-5 w-full max-w-5xl rounded-3xl border bg-card p-4 shadow-sm sm:p-6" aria-labelledby="builder-tier-guide-title">
        <div className="max-w-2xl">
          <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-primary">Verified builder signals</p>
          <h2 id="builder-tier-guide-title" className="mt-2 text-2xl font-semibold">Builder tier guide</h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">The higher verified result wins: qualifying Arc transactions, or GitHub contributions combined with account age. Contract deployments remain a separate proof signal.</p>
        </div>
        <div className="mt-6 grid gap-2 sm:grid-cols-5">
          {BUILDER_TIER_GUIDE.map((tier) => (
            <div key={tier.name} className="flex min-h-20 items-center gap-3 rounded-2xl border p-3 sm:flex-col sm:items-start" style={{ borderColor: `${tier.tone}55`, background: `linear-gradient(145deg, ${tier.tone}18, transparent)` }}>
              <img src={tier.emblem} alt="" className="size-9 object-contain" />
              <div><p className="text-sm font-semibold">{tier.name}</p><p className="mt-0.5 font-mono text-[10px] leading-4 text-muted-foreground">{tier.arcThreshold.toLocaleString()}+ Arc tx<br />OR {tier.githubThreshold.toLocaleString()}+ GitHub · {tier.githubAge}</p></div>
            </div>
          ))}
        </div>
        <div className="mt-6 grid gap-3 rounded-2xl border bg-background/55 p-4 sm:grid-cols-3">
          <div><p className="text-xs text-muted-foreground">Verified signals</p><p className="mt-1 text-lg font-semibold">{typeof qualifyingTransactions === "number" ? `${qualifyingTransactions.toLocaleString()} Arc · ${(github?.contributionCount ?? 0).toLocaleString()} GitHub` : "Activity not verified"}</p></div>
          <div><p className="text-xs text-muted-foreground">Current tier</p><p className="mt-1 text-lg font-semibold">{builderPass?.currentTier?.name ?? "Not assigned"}</p></div>
          <div><p className="text-xs text-muted-foreground">Next tier</p><p className="mt-1 text-sm font-semibold leading-6">{nextTier ? `${nextTier.name}: ${nextTier.arcThreshold.toLocaleString()}+ Arc tx OR ${nextTier.githubThreshold.toLocaleString()}+ GitHub / ${nextTier.githubAge}` : builderPass?.currentTier?.name === "Diamond" ? "Highest tier reached" : "Verify activity to calculate"}</p></div>
        </div>
      </section>

      {builderPass && builderPass.claimStatus !== "locked" && supply && (
        <section className="mt-5 w-full max-w-5xl rounded-2xl border bg-card p-4" aria-label="Wave 1 onchain mint allocation">
          <div className="flex flex-wrap items-center justify-between gap-2 text-sm"><strong>Wave 1 onchain mints: {supply.totalMinted.toLocaleString()} / {supply.phaseClaimLimit.toLocaleString()}</strong><span className="text-muted-foreground">{supply.remainingClaims.toLocaleString()} mint slots remain</span></div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary" style={{ width: `${supply.totalMinted > 0 ? Math.max(Math.min(100, (supply.totalMinted / supply.phaseClaimLimit) * 100), 1) : 0}%` }} /></div>
        </section>
      )}

      <MintModal open={mintOpen} onOpenChange={setMintOpen} network="arc" onMint={handleMint} isPending={mintPass.isPending} />
    </div>
  );
}

function IdentityProviderCard({
  icon,
  label,
  connected,
  identity,
  detail,
  connectHref,
}: {
  icon: React.ReactNode;
  label: string;
  connected: boolean;
  identity: string | null;
  detail: string;
  connectHref: string;
}) {
  return (
    <div className="flex items-center gap-3.5 rounded-2xl border bg-card p-4">
      <span className="grid size-11 shrink-0 place-items-center rounded-xl border bg-background">{icon}</span>
      <div className="min-w-0 flex-1 text-left">
        <div className="flex items-center gap-2">
          <p className="text-sm font-semibold">{label}</p>
          {connected && <span className="inline-flex items-center gap-1 rounded-full bg-success/10 px-2 py-0.5 text-[10px] font-semibold text-success"><CheckCircle2 className="size-3" aria-hidden="true" /> Connected</span>}
        </div>
        <p className="mt-0.5 truncate text-xs text-muted-foreground">{connected ? (identity ?? "Connected") : detail}</p>
        {connected && identity && <p className="mt-0.5 truncate text-[11px] text-muted-foreground">{detail}</p>}
      </div>
      {!connected && (
        <Button variant="outline" size="sm" className="h-10 shrink-0" asChild>
          <a href={connectHref}>Connect</a>
        </Button>
      )}
    </div>
  );
}

const WRAPPED_NUMERAL_GRADIENT = "bg-gradient-to-br from-[#ffe3b3] via-[#ff9e64] to-[#ffb8e0] bg-clip-text text-transparent";

function ArcWrapped({
  firstTransactionAt,
  qualifyingTransactions,
  activityScore,
  tierName,
  reduceMotion,
}: {
  firstTransactionAt: string | null;
  qualifyingTransactions: number | null;
  activityScore: number | null;
  tierName: string | null;
  reduceMotion: boolean | null;
}) {
  const stats: Array<{ label: string; value: string; sub: string }> = [
    { label: "First Arc transaction", value: firstTransactionAt ? new Date(firstTransactionAt).getFullYear().toString() : "—", sub: firstTransactionAt ? `You started ${formatDate(firstTransactionAt)}` : "No dated transaction recorded yet" },
    { label: "Qualifying transactions", value: qualifyingTransactions?.toLocaleString() ?? "—", sub: "Verified across your Arc wallets" },
    { label: "Activity score", value: activityScore === null ? "—" : `${activityScore}/100`, sub: "Frequency, active days and recency" },
    { label: "Builder tier", value: tierName ?? "Pending", sub: "Your current verified tier" },
  ];

  return (
    <section className="w-full max-w-6xl overflow-hidden rounded-2xl border border-[#4a3f8f]/50 bg-[radial-gradient(circle_at_78%_-20%,rgba(87,69,187,.42),transparent_38%),linear-gradient(150deg,#221a4f,#0d0b26_70%)] p-4 text-white shadow-[0_18px_55px_rgba(10,7,35,.24)] sm:p-5" aria-labelledby="arc-wrapped-title">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
        <div className="shrink-0 lg:w-44">
          <p className="font-mono text-[9px] font-semibold uppercase tracking-[0.2em] text-[#ffb98a]">Your Arc activity</p>
          <h2 id="arc-wrapped-title" className="mt-1 text-xl font-extrabold uppercase leading-tight">Wrapped</h2>
        </div>
        <div className="grid flex-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {stats.map((stat, index) => (
            <motion.article
              key={stat.label}
              initial={reduceMotion ? false : { opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.4 }}
              transition={{ duration: reduceMotion ? 0 : 0.3, delay: reduceMotion ? 0 : index * 0.06 }}
              className="min-w-0 rounded-xl border border-white/[0.09] bg-white/[0.05] px-3.5 py-3"
            >
              <p className="font-mono text-[8px] font-semibold uppercase tracking-[0.14em] text-white/50">{stat.label}</p>
              <p className={`mt-1 truncate text-2xl font-extrabold leading-none sm:text-3xl ${WRAPPED_NUMERAL_GRADIENT}`}>{stat.value}</p>
              <p className="mt-1 text-[10px] leading-4 text-white/45">{stat.sub}</p>
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  );
}


function EvidenceCard({
  icon: Icon,
  title,
  value,
  detail,
  state,
  action,
}: {
  icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean | "true" | "false" }>;
  title: string;
  value: string;
  detail: string;
  state: "pass" | "fail" | "action" | "unavailable";
  action?: { label: string; href: string };
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
      {action && (
        <a href={action.href} className="mt-2 inline-flex min-h-9 items-center gap-1 text-xs font-semibold text-primary hover:underline">
          {action.label} <ArrowRight className="size-3" aria-hidden="true" />
        </a>
      )}
    </article>
  );
}
