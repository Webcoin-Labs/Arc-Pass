import { useRef, useState } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Download, ExternalLink, Github, Lock } from "lucide-react";
import { SiX } from "react-icons/si";
import { DiscordIcon } from "@/components/discord-icon";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import {
  useGetMe,
  useGetUserProfile,
  useListUserWallets,
  useListMyPasses,
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
import { downloadNodeAsPng } from "@/lib/export-image";

const STEP_LABELS = ["Verify identity", "Connect GitHub", "Verify wallets", "Analyse activity", "Review pass", "Record onchain"];
const ANALYSIS_MESSAGES = [
  "Checking verified wallet history",
  "Reviewing contract deployments",
  "Calculating your Onchain Builder tier",
  "Preparing the verification record",
];

export default function ClaimBuilderPage() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { data: user, isLoading: userLoading } = useGetMe({ query: { retry: false, queryKey: getGetMeQueryKey() } });
  const { data: profile } = useGetUserProfile({ query: { enabled: !!user, queryKey: getGetUserProfileQueryKey() } });
  const { data: wallets = [], isLoading: walletsLoading } = useListUserWallets({ query: { enabled: !!user, queryKey: getListUserWalletsQueryKey() } });
  const { data: passes, isLoading: passesLoading } = useListMyPasses({ query: { enabled: !!user, queryKey: getListMyPassesQueryKey() } });

  const verifyBuilder = useVerifyBuilder();
  const claimPass = useClaimBuilderPass();
  const mintPass = useMintBuilderPass();

  const [mintOpen, setMintOpen] = useState(false);
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
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-6 p-6">
        <Skeleton className="h-11 w-full" />
        <Skeleton className="aspect-[1/1.48] w-full max-w-[300px] rounded-2xl" />
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
      onSuccess: invalidateAll,
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
    if (!builderPass) return;
    const shareUrl = `${window.location.origin}/api/share/builder/${builderPass.id}`;
    const intentUrl = `https://x.com/intent/post?${new URLSearchParams({
      text: "My Arc Builder Pass is now minted onchain, verified by Webcoin Labs.",
      url: shareUrl,
    }).toString()}`;
    window.open(intentUrl, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="flex flex-1 flex-col items-center p-6 py-12">
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
              <p className="mt-2 max-w-lg text-sm leading-6 text-pretty text-muted-foreground">Builder review uses a baseline of an account at least 180 days old with approximately 50 or more contributions in the previous 12 months.</p>
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
                data={{ ...builderPass, discordAvatarUrl: profile?.avatarUrl, discordUsername: profile?.connections.discord.username }}
                className="max-w-[300px]"
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
                  <Button variant="outline" className="h-12 flex-1" onClick={handleDownload}>
                    <Download className="mr-2 h-4 w-4" /> Download Your Pass
                  </Button>
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
              <BuilderPassCard
                ref={cardRef}
                data={{ ...builderPass, discordAvatarUrl: profile?.avatarUrl, discordUsername: profile?.connections.discord.username }}
                className="max-w-[280px]"
              />
              <div>
                <h2 className="text-2xl font-bold">Added to your inventory</h2>
                <p className="mt-2 max-w-sm text-muted-foreground">Your Builder Pass is claimed. Mint it onchain to create the permanent, non-transferable credential.</p>
              </div>
              <Button size="lg" className="h-12 w-64" onClick={() => setMintOpen(true)}>
                Mint Onchain <ExternalLink className="ml-2 h-4 w-4" />
              </Button>
            </motion.div>
          )}

          {builderPass?.claimStatus === "minted" && (
            <motion.div key="minted" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center gap-10 md:flex-row md:items-start">
              <BuilderPassCard
                ref={cardRef}
                data={{ ...builderPass, discordAvatarUrl: profile?.avatarUrl, discordUsername: profile?.connections.discord.username }}
                className="max-w-[300px]"
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

      <MintModal open={mintOpen} onOpenChange={setMintOpen} network={(builderPass?.network as "arc" | "base") ?? "arc"} onMint={handleMint} isPending={mintPass.isPending} />
    </div>
  );
}
