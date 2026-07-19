import { useRef, useState } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { ArrowRight, Download, ExternalLink, Eye, FastForward, ShieldAlert, LayoutDashboard, Lock, Share2 } from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { useGetMe, useGetUserProfile, useListMyPasses, useClaimFounderPass, useMintFounderPass, getGetMeQueryKey, getGetUserProfileQueryKey, getListMyPassesQueryKey } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { FounderPassCard } from "@/components/founder-pass-card";
import { MintModal, type MintParams } from "@/components/mint-modal";
import { MintSuccess } from "@/components/mint-success";
import { EmptyState } from "@/components/empty-state";
import { PassStatusBadge } from "@/components/pass-status-badge";
import { founderOverallStatusMeta } from "@/lib/pass-status";
import { downloadNodeAsPng, shareNodeOnX } from "@/lib/export-image";
import { Skeleton } from "@/components/ui/skeleton";
import { FounderRequestDialog } from "@/components/founder-request-dialog";
import { IdentityVerificationGate } from "@/components/identity-verification-gate";
import { pendingIdentityMatches, readPendingEligibilityIdentity } from "@/lib/pending-eligibility";

export default function ClaimFounderPage() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { data: user, isLoading: userLoading } = useGetMe({ query: { retry: false, queryKey: getGetMeQueryKey() } });
  const { data: profile, isLoading: profileLoading } = useGetUserProfile({ query: { enabled: !!user, queryKey: getGetUserProfileQueryKey() } });
  const { data: passes, isLoading: passesLoading } = useListMyPasses({ query: { enabled: !!user, queryKey: getListMyPassesQueryKey() } });
  const claimPass = useClaimFounderPass();
  const mintPass = useMintFounderPass();

  const [mintOpen, setMintOpen] = useState(false);
  const [requestOpen, setRequestOpen] = useState(false);
  const [revealState, setRevealState] = useState<"idle" | "ready" | "revealing" | "revealed">("idle");
  const reduceMotion = useReducedMotion();
  const cardRef = useRef<HTMLDivElement>(null);
  const pendingIdentity = readPendingEligibilityIdentity();

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["/api/passes/me"] });

  const handleDownload = () => {
    if (cardRef.current) void downloadNodeAsPng(cardRef.current, "arc-pass-founder.png");
  };

  if (userLoading || (!!user && (passesLoading || profileLoading))) {
    return (
      <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col items-center justify-center gap-6 px-3 py-8 sm:p-6">
        <Skeleton className="h-[300px] w-full max-w-[600px] rounded-[22px] sm:aspect-[1.48/1] sm:h-auto sm:rounded-[30px]" />
        <Skeleton className="h-11 w-full" />
      </div>
    );
  }

  if (!user || !pendingIdentityMatches(profile, pendingIdentity)) {
    return <IdentityVerificationGate authenticated={!!user} profile={profile} pending={pendingIdentity} returnTo="/claim/founder" />;
  }

  const founderPass = passes?.founder;

  if (!founderPass || (founderPass.eligibilityStatus !== "eligible" && founderPass.claimStatus === "locked")) {
    return (
      <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-center justify-center gap-7 px-3 py-10 sm:px-6">
        <FounderPassCard data={{ variant: "normal", eligibilityStatus: founderPass?.eligibilityStatus ?? "ineligible", claimStatus: "locked" }} interactive={false} className="max-w-[580px]" />
        <EmptyState
          icon={ShieldAlert}
          title={founderPass?.eligibilityStatus === "under_review" ? "Founder application under review" : "Ineligible to claim Founder Pass"}
          description={founderPass?.eligibilityStatus === "under_review" ? "Your Founder Pass application is currently being reviewed." : "Founder Pass is invite-only. We could not find an active invitation linked to your verified identity. You may still apply for review."}
          action={founderPass?.eligibilityStatus === "under_review" ? { label: "Return Home", onClick: () => setLocation("/") } : { label: "Request Founder Pass", onClick: () => setRequestOpen(true) }}
          className="w-full"
        />
        <FounderRequestDialog open={requestOpen} onOpenChange={setRequestOpen} defaultXUsername={profile?.connections.x.username ?? ""} />
      </div>
    );
  }

  const handleClaim = () => {
    claimPass.mutate(undefined, {
      onSuccess: () => {
        setRevealState("ready");
        void invalidate();
      },
      onError: (err: unknown) => toast.error(err instanceof Error ? err.message : "Couldn't claim your pass"),
    });
  };

  const handleMint = (params: MintParams) => {
    mintPass.mutate(
      { data: { mintMethod: params.mintMethod, walletAddress: params.walletAddress, network: params.network } },
      {
        onSuccess: () => {
          invalidate();
          setMintOpen(false);
        },
        onError: (err: unknown) => toast.error(err instanceof Error ? err.message : "Minting failed"),
      },
    );
  };

  const handleShare = () => {
    if (cardRef.current) void shareNodeOnX({ node: cardRef.current, passType: "founder", passId: founderPass.id, minted: founderPass.claimStatus === "minted", returnTo: "/claim/founder" });
  };

  const revealPass = () => {
    setRevealState("revealing");
    window.setTimeout(() => setRevealState("revealed"), reduceMotion ? 0 : 900);
  };

  const skipReveal = () => setRevealState("revealed");

  const cardData = {
    variant: founderPass.variant,
    displayName: founderPass.displayName,
    username: founderPass.username,
    xUsername: profile?.connections.x.username,
    avatarUrl: founderPass.avatarUrl,
    fallbackAvatarUrl: profile?.avatarUrl ?? profile?.connections.discord.avatarUrl,
    founderTitle: founderPass.founderTitle,
    companyName: founderPass.companyName,
    companyIndustry: founderPass.companyIndustry,
    companyLogoUrl: founderPass.companyLogoUrl,
    founderTier: founderPass.founderTier,
    passNumber: founderPass.passNumber,
    network: founderPass.network,
    issuedAt: founderPass.issuedAt,
    eligibilityStatus: founderPass.eligibilityStatus,
    claimStatus: founderPass.claimStatus,
  };

  return (
    <div className="flex flex-1 flex-col items-center justify-center px-3 py-10 sm:px-6 sm:py-14">
      <AnimatePresence mode="wait">
        {founderPass.claimStatus === "minted" ? (
          <motion.div key="minted" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex w-full max-w-6xl flex-col items-center gap-10 lg:flex-row lg:items-start">
            <FounderPassCard ref={cardRef} data={cardData} className="max-w-[620px]" />
            <div className="w-full max-w-sm flex-1 space-y-3">
              <MintSuccess
                tokenId={founderPass.tokenId}
                destinationWallet={founderPass.destinationWallet}
                network={founderPass.network}
                transactionHash={founderPass.transactionHash}
                issuedAt={founderPass.issuedAt}
                onViewPass={() => setLocation(`/pass/founder/${founderPass.id}`)}
                onDownload={handleDownload}
                onShare={handleShare}
                className="w-full"
              />
              <Button variant="outline" size="lg" className="h-12 w-full" onClick={() => setLocation("/dashboard")}>
                <LayoutDashboard className="mr-2 h-4 w-4" /> Continue to dashboard
              </Button>
            </div>
          </motion.div>
        ) : (
          <motion.div key="claim" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex w-full max-w-6xl flex-col items-center gap-10 lg:flex-row">
            <div className="w-full max-w-md flex-1 text-center lg:text-left">
              <PassStatusBadge meta={founderOverallStatusMeta(founderPass)} className="mb-4" />
              <h1 className="text-3xl font-bold sm:text-4xl">Here's your pass.</h1>
              <p className="mt-3 text-lg text-muted-foreground">
                {founderPass.claimStatus === "claimed"
                  ? "Added to your inventory. Mint it onchain when you’re ready to make the credential permanent."
                  : "Your identity has been verified. Review and claim your credential."}
              </p>
              <div className="mt-7 flex flex-col gap-3 sm:flex-row md:flex-col">
                {founderPass.claimStatus !== "locked" && revealState !== "ready" && revealState !== "revealing" && (
                  <Button variant="outline" size="lg" className="h-12" onClick={handleDownload}>
                    <Download className="mr-2 h-4 w-4" /> Download
                  </Button>
                )}
                {founderPass.claimStatus === "locked" ? (
                  <Button size="lg" className="h-12" onClick={handleClaim} disabled={claimPass.isPending}>
                    {claimPass.isPending ? "Claiming…" : "Claim Your Pass"} <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                ) : revealState === "ready" ? (
                  <Button size="lg" className="h-12" onClick={revealPass}><Eye className="mr-2 h-4 w-4" /> Reveal your pass</Button>
                ) : revealState === "revealing" ? (
                  <Button variant="outline" size="lg" className="h-12" onClick={skipReveal}><FastForward className="mr-2 h-4 w-4" /> Skip reveal</Button>
                ) : (
                  <>
                    <Button variant="outline" size="lg" className="h-12" onClick={handleShare}><Share2 className="mr-2 h-4 w-4" /> Share on X</Button>
                    <Button size="lg" className="h-12" onClick={() => setMintOpen(true)}>Mint Onchain <ExternalLink className="ml-2 h-4 w-4" /></Button>
                  </>
                )}
              </div>
              {founderPass.claimStatus !== "locked" && revealState !== "ready" && revealState !== "revealing" && (
                <Button variant="ghost" size="lg" className="mt-3 h-11 w-full" onClick={() => setLocation("/dashboard")}>
                  <LayoutDashboard className="mr-2 h-4 w-4" /> Continue to dashboard
                </Button>
              )}
            </div>
            <motion.div
              className="w-full max-w-[620px]"
              animate={revealState === "revealing" && !reduceMotion ? { scale: [0.985, 1.025, 1], rotateY: [0, 5, 0], filter: ["brightness(.65)", "brightness(1.25)", "brightness(1)"] } : undefined}
              transition={{ duration: 0.9, ease: "easeOut" }}
            >
              <FounderPassCard ref={cardRef} data={cardData} concealed={revealState === "ready" || revealState === "revealing"} className="max-w-[620px]" />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <MintModal open={mintOpen} onOpenChange={setMintOpen} network="arc" onMint={handleMint} isPending={mintPass.isPending} />
    </div>
  );
}
