import { useRef, useState } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Download, ExternalLink, Github, ShieldAlert, Lock } from "lucide-react";
import { SiDiscord, SiX } from "react-icons/si";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { useGetMe, useGetUserProfile, useListMyPasses, useClaimFounderPass, useMintFounderPass, getGetMeQueryKey, getGetUserProfileQueryKey, getListMyPassesQueryKey } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { FounderPassCard } from "@/components/founder-pass-card";
import { MintModal, type MintParams } from "@/components/mint-modal";
import { MintSuccess } from "@/components/mint-success";
import { EmptyState } from "@/components/empty-state";
import { PassStatusBadge } from "@/components/pass-status-badge";
import { founderEligibilityMeta } from "@/lib/pass-status";
import { downloadNodeAsPng } from "@/lib/export-image";
import { Skeleton } from "@/components/ui/skeleton";

export default function ClaimFounderPage() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { data: user, isLoading: userLoading } = useGetMe({ query: { retry: false, queryKey: getGetMeQueryKey() } });
  const { data: profile, isLoading: profileLoading } = useGetUserProfile({ query: { enabled: !!user, queryKey: getGetUserProfileQueryKey() } });
  const { data: passes, isLoading: passesLoading } = useListMyPasses({ query: { enabled: !!user, queryKey: getListMyPassesQueryKey() } });
  const claimPass = useClaimFounderPass();
  const mintPass = useMintFounderPass();

  const [mintOpen, setMintOpen] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["/api/passes/me"] });

  const handleDownload = () => {
    if (cardRef.current) void downloadNodeAsPng(cardRef.current, "arc-pass-founder.png");
  };

  if (userLoading || passesLoading || (!!user && profileLoading)) {
    return (
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-6 p-6">
        <Skeleton className="aspect-[1/1.48] w-full max-w-[300px] rounded-2xl" />
        <Skeleton className="h-11 w-full" />
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
        <p className="mt-2 max-w-sm text-sm text-muted-foreground">Sign in with X or Discord to confirm account ownership before claiming your Founder Pass.</p>
        <div className="mt-6 flex w-full max-w-xs flex-col gap-3">
          <Button variant="outline" size="lg" className="h-12 gap-2" asChild>
            <a href="/api/auth/x">
              <SiX className="h-4 w-4" /> Continue with X
            </a>
          </Button>
          <Button variant="outline" size="lg" className="h-12 gap-2" asChild>
            <a href="/api/auth/discord">
              <SiDiscord className="h-4 w-4 text-[#5865F2]" /> Continue with Discord
            </a>
          </Button>
        </div>
      </div>
    );
  }

  const founderPass = passes?.founder;

  if (!founderPass || (founderPass.eligibilityStatus !== "eligible" && founderPass.claimStatus === "locked")) {
    return (
      <EmptyState
        icon={ShieldAlert}
        title="Not eligible to claim"
        description={
          !founderPass
            ? "Founder Pass is invite-only. We couldn't find an invitation linked to your account."
            : founderPass.eligibilityStatus === "under_review"
              ? "Your profile is being reviewed."
              : "We could not verify enough qualifying activity yet."
        }
        action={{ label: "Return Home", onClick: () => setLocation("/") }}
        className="flex-1"
      />
    );
  }

  if (founderPass.claimStatus === "locked" && !profile?.connections.github.connected) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center p-6 text-center">
        <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-muted">
          <Github className="h-6 w-6 text-muted-foreground" aria-hidden="true" />
        </div>
        <h1 className="text-xl font-semibold">Verify your GitHub account</h1>
        <p className="mt-2 max-w-sm text-sm text-muted-foreground">Connect GitHub to prove account ownership before claiming your Founder Pass.</p>
        <Button size="lg" className="mt-6 h-12 w-full max-w-xs gap-2" asChild>
          <a href="/api/auth/github?returnTo=%2Fclaim%2Ffounder"><Github className="h-4 w-4" aria-hidden="true" /> Connect GitHub</a>
        </Button>
      </div>
    );
  }

  const handleClaim = () => {
    claimPass.mutate(undefined, {
      onSuccess: invalidate,
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

  const cardData = {
    variant: founderPass.variant,
    displayName: founderPass.displayName,
    username: founderPass.username,
    avatarUrl: founderPass.avatarUrl,
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
    <div className="flex flex-1 flex-col items-center justify-center p-6 py-14">
      <AnimatePresence mode="wait">
        {founderPass.claimStatus === "minted" ? (
          <motion.div key="minted" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex w-full max-w-4xl flex-col items-center gap-10 md:flex-row md:items-start">
            <FounderPassCard ref={cardRef} data={cardData} className="max-w-[300px]" />
            <MintSuccess
              tokenId={founderPass.tokenId}
              destinationWallet={founderPass.destinationWallet}
              network={founderPass.network}
              transactionHash={founderPass.transactionHash}
              issuedAt={founderPass.issuedAt}
              onViewPass={() => setLocation(`/pass/founder/${founderPass.id}`)}
              onDownload={handleDownload}
              className="w-full max-w-sm flex-1"
            />
          </motion.div>
        ) : (
          <motion.div key="claim" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex w-full max-w-3xl flex-col items-center gap-10 md:flex-row">
            <div className="flex-1 text-center md:text-left">
              <PassStatusBadge meta={founderEligibilityMeta(founderPass.eligibilityStatus)} className="mb-4" />
              <h1 className="text-3xl font-bold sm:text-4xl">Here's your pass.</h1>
              <p className="mt-3 text-lg text-muted-foreground">
                {founderPass.claimStatus === "claimed"
                  ? "Your pass is linked to your profile. Record it onchain to make it permanent."
                  : "Your identity has been verified. Review and claim your credential."}
              </p>
              <div className="mt-7 flex flex-col gap-3 sm:flex-row md:flex-col">
                <Button variant="outline" size="lg" className="h-12" onClick={handleDownload}>
                  <Download className="mr-2 h-4 w-4" /> Download Your Pass
                </Button>
                {founderPass.claimStatus === "locked" ? (
                  <Button size="lg" className="h-12" onClick={handleClaim} disabled={claimPass.isPending}>
                    {claimPass.isPending ? "Claiming…" : "Claim Your Pass"} <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                ) : (
                  <Button size="lg" className="h-12" onClick={() => setMintOpen(true)}>
                    Mint Onchain <ExternalLink className="ml-2 h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
            <FounderPassCard ref={cardRef} data={cardData} className="max-w-[300px]" />
          </motion.div>
        )}
      </AnimatePresence>

      <MintModal open={mintOpen} onOpenChange={setMintOpen} network={(founderPass.network as "arc" | "base") ?? "arc"} onMint={handleMint} isPending={mintPass.isPending} />
    </div>
  );
}
