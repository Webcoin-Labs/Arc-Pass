import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Download, ExternalLink, ArrowRight, Github, Check, Share2, Lock, WalletCards, ChevronDown } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { SiX } from "react-icons/si";
import { DiscordIcon } from "@/components/discord-icon";
import {
  useGetMe,
  useGetUserProfile,
  useListUserWallets,
  useListMyPasses,
  useLogout,
  useReverifyBuilder,
  useUpgradeBuilderTier,
  getGetMeQueryKey,
  getGetUserProfileQueryKey,
  getListMyPassesQueryKey,
  getListUserWalletsQueryKey,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { FounderPassCard } from "@/components/founder-pass-card";
import { BuilderPassCard, BuilderPassRank } from "@/components/builder-pass-card";
import { PassStatusBadge } from "@/components/pass-status-badge";
import { ReverificationStatus } from "@/components/reverification-status";
import { PassComparison } from "@/components/pass-comparison";
import { EmptyState } from "@/components/empty-state";
import { downloadNodeAsPng, shareNodeOnX } from "@/lib/export-image";
import { explorerTxUrl, formatDate } from "@/lib/format";
import { founderOverallStatusMeta, builderOverallStatusMeta } from "@/lib/pass-status";
import { cn } from "@/lib/utils";
import { Activity } from "lucide-react";

export default function DashboardPage() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { data: user, isLoading: userLoading } = useGetMe({ query: { retry: false, queryKey: getGetMeQueryKey() } });
  const { data: profile } = useGetUserProfile({ query: { enabled: !!user, queryKey: getGetUserProfileQueryKey() } });
  const { data: wallets = [] } = useListUserWallets({ query: { enabled: !!user, queryKey: getListUserWalletsQueryKey() } });
  const { data: passes, isLoading: passesLoading } = useListMyPasses({ query: { enabled: !!user, queryKey: getListMyPassesQueryKey() } });
  const logout = useLogout();

  const reverify = useReverifyBuilder();
  const upgrade = useUpgradeBuilderTier();

  const founderCardRef = useRef<HTMLDivElement>(null);
  const builderCardRef = useRef<HTMLDivElement>(null);
  const mobileSwipeStartX = useRef<number | null>(null);
  const [mobilePass, setMobilePass] = useState<"founder" | "builder">("founder");

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/passes/me"] });
    queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
  };

  useEffect(() => {
    if (!userLoading && !user) {
      setLocation("/");
    }
  }, [userLoading, user, setLocation]);

  useEffect(() => {
    if (!user) return;
    const id = window.location.hash.slice(1);
    if (!id) return;
    const raf = requestAnimationFrame(() => {
      document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
    return () => cancelAnimationFrame(raf);
  }, [user]);

  useEffect(() => {
    if (!passes?.founder && passes?.builder) setMobilePass("builder");
  }, [passes?.founder, passes?.builder]);

  if (userLoading || (!!user && passesLoading)) {
    return (
      <div className="mx-auto w-full max-w-7xl space-y-8 p-4 pt-10 sm:p-6 sm:pt-12">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
          <Skeleton className="h-[520px] rounded-3xl" />
          <Skeleton className="h-[520px] rounded-3xl" />
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const founderPass = passes?.founder;
  const builderPass = passes?.builder;

  const handleReverify = () => {
    reverify.mutate(undefined, {
      onSuccess: invalidate,
      onError: (err: unknown) => {
        if (err && typeof err === "object" && "nextVerificationAt" in err) return;
        toast.error(err instanceof Error ? err.message : "Re-verification failed");
      },
    });
  };

  const handleUpgrade = () => {
    upgrade.mutate(undefined, {
      onSuccess: () => {
        invalidate();
        toast.success("Tier upgrade confirmed");
      },
      onError: (err: unknown) => toast.error(err instanceof Error ? err.message : "Upgrade failed"),
    });
  };

  const shareOnX = (type: "founder" | "builder", id: number, minted: boolean) => {
    const node = type === "founder" ? founderCardRef.current : builderCardRef.current;
    if (node) void shareNodeOnX({ node, passType: type, passId: id, minted, returnTo: "/dashboard" });
  };

  return (
    <div className="mx-auto w-full max-w-7xl p-4 pb-24 pt-10 sm:p-6 sm:pt-12">
      <div className="relative mb-10 overflow-hidden rounded-2xl bg-[#0a1745] px-6 py-9 text-white dark:bg-[#0a1128] sm:px-9 sm:py-11">
        <div className="pointer-events-none absolute -right-24 -top-32 size-72 rounded-full border border-white/10" aria-hidden="true" />
        <div className="pointer-events-none absolute -right-10 -top-16 size-44 rounded-full border border-white/[0.07]" aria-hidden="true" />
        <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.22em] text-[#e0b054]">[ Arc Pass Dashboard ]</p>
        <h1 className="mt-3 text-3xl font-bold uppercase tracking-tight sm:text-4xl">Your Arc Passes</h1>
        <p className="mt-2 max-w-xl text-sm text-white/65 sm:text-base">Manage your credentials, verification status, and onchain records.</p>
      </div>

      <div className="mb-5 lg:hidden" aria-label="Choose a pass">
        <div className="grid grid-cols-2 rounded-2xl border bg-card/80 p-1.5 shadow-sm backdrop-blur">
          <button
            type="button"
            className={cn(
              "min-h-11 rounded-xl px-3 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
              mobilePass === "founder" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
            )}
            aria-pressed={mobilePass === "founder"}
            aria-controls="founder-pass-panel"
            onClick={() => setMobilePass("founder")}
          >
            Founder Pass
          </button>
          <button
            type="button"
            className={cn(
              "min-h-11 rounded-xl px-3 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
              mobilePass === "builder" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
            )}
            aria-pressed={mobilePass === "builder"}
            aria-controls="builder-pass-panel"
            onClick={() => setMobilePass("builder")}
          >
            Builder Pass
          </button>
        </div>
        <p className="mt-2 text-center text-[11px] text-muted-foreground">Tap a pass or swipe the card sideways to switch.</p>
      </div>

      <div
        className="grid touch-pan-y grid-cols-1 gap-8 lg:grid-cols-2"
        onTouchStart={(event) => { mobileSwipeStartX.current = event.changedTouches[0]?.clientX ?? null; }}
        onTouchEnd={(event) => {
          if (mobileSwipeStartX.current == null) return;
          const delta = (event.changedTouches[0]?.clientX ?? mobileSwipeStartX.current) - mobileSwipeStartX.current;
          mobileSwipeStartX.current = null;
          if (Math.abs(delta) < 48) return;
          setMobilePass(delta < 0 ? "builder" : "founder");
        }}
      >
        {/* Founder */}
        <section id="founder-pass-panel" className={cn("min-w-0", mobilePass !== "founder" && "hidden lg:block")}>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Founder Pass</h2>
            {founderPass && <PassStatusBadge meta={founderOverallStatusMeta(founderPass)} />}
          </div>
          <div className="flex min-w-0 flex-1 flex-col items-center overflow-hidden rounded-2xl border bg-card p-3 sm:p-6 lg:p-8">
            {founderPass ? (
              <>
                <FounderPassCard
                  ref={founderCardRef}
                  data={{
                    ...founderPass,
                    xUsername: profile?.connections.x.username,
                    fallbackAvatarUrl: profile?.avatarUrl ?? profile?.connections.discord.avatarUrl,
                  }}
                  className="mb-6 max-w-[560px]"
                />
                <dl className="mb-6 grid w-full grid-cols-2 gap-3 text-xs">
                  <div>
                    <dt className="text-muted-foreground">Destination wallet</dt>
                    <dd className="font-mono tabular-nums">{founderPass.destinationWallet ? `${founderPass.destinationWallet.slice(0, 6)}…${founderPass.destinationWallet.slice(-4)}` : "Not minted yet"}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Token ID</dt>
                    <dd className="font-mono tabular-nums">{founderPass.tokenId ?? "Assigned after mint"}</dd>
                  </div>
                </dl>
                <div className="mt-auto w-full space-y-2.5">
                  {founderPass.claimStatus === "minted" ? (
                    <>
                      <p className="text-center text-xs font-medium uppercase tracking-wide text-success">Permanent credential</p>
                      <div className="grid grid-cols-2 gap-2.5">
                        <Button variant="outline" onClick={() => founderCardRef.current && downloadNodeAsPng(founderCardRef.current, "arc-pass-founder.png")}>
                          <Download className="mr-2 h-4 w-4" /> Download
                        </Button>
                        <Button variant="outline" asChild>
                          <Link href={`/pass/founder/${founderPass.id}`}>
                            <ExternalLink className="mr-2 h-4 w-4" /> Public verification
                          </Link>
                        </Button>
                      </div>
                      <Button variant="outline" className="w-full" onClick={() => shareOnX("founder", founderPass.id, true)}>
                        <Share2 className="mr-2 h-4 w-4" aria-hidden="true" /> Share on X
                      </Button>
                    </>
                   ) : founderPass.claimStatus === "claimed" ? (
                     <div className="space-y-2.5">
                       <p className="flex items-center justify-center gap-1.5 text-center text-xs font-medium text-success"><Check className="h-3.5 w-3.5" aria-hidden="true" /> Added to your inventory</p>
                       <div className="grid grid-cols-2 gap-2.5">
                         <Button variant="outline" onClick={() => founderCardRef.current && downloadNodeAsPng(founderCardRef.current, "arc-pass-founder.png")}><Download className="mr-2 h-4 w-4" /> Download</Button>
                         <Button variant="outline" onClick={() => shareOnX("founder", founderPass.id, false)}><Share2 className="mr-2 h-4 w-4" /> Share</Button>
                       </div>
                       <Button className="w-full" onClick={() => setLocation("/claim/founder")}>
                         Mint Onchain <ArrowRight className="ml-2 h-4 w-4" />
                       </Button>
                     </div>
                  ) : founderPass.eligibilityStatus === "eligible" ? (
                    <div className="space-y-2">
                      <Button className="w-full" onClick={() => setLocation("/claim/founder")}>
                        Claim Your Pass <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                      <Button variant="outline" className="w-full" disabled>
                        <Lock className="mr-2 h-3.5 w-3.5" aria-hidden="true" /> Mint Onchain
                      </Button>
                    </div>
                  ) : (
                    <Button variant="outline" className="w-full" disabled>
                      {founderPass.eligibilityStatus === "under_review" ? "Under Review" : "Invite Required"}
                    </Button>
                  )}
                  <CredentialStatusBlock
                    claimStatus={founderPass.claimStatus}
                    tokenId={founderPass.tokenId}
                    transactionHash={founderPass.transactionHash}
                    network={founderPass.network}
                    publicHref={`/pass/founder/${founderPass.id}`}
                    className="pt-1.5"
                  />
                </div>
              </>
            ) : (
              <EmptyState icon={Activity} title="No Founder Pass" description="You haven't been invited yet. Founder Pass is admin-controlled and invite-only." />
            )}
          </div>
        </section>

        {/* Builder */}
        <section id="builder-pass-panel" className={cn("min-w-0", mobilePass !== "builder" && "hidden lg:block")}>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Onchain Builder Pass</h2>
            {builderPass && <PassStatusBadge meta={builderOverallStatusMeta(builderPass)} />}
          </div>
          <div className="flex min-w-0 flex-1 flex-col items-center overflow-hidden rounded-2xl border bg-card p-3 sm:p-6 lg:p-8">
            {builderPass ? (
              builderPass.upgradeAvailable && reverify.data?.proposedTier ? (
                <PassComparison
                  current={{ ...builderPass, discordAvatarUrl: profile?.avatarUrl, discordUsername: profile?.connections.discord.username }}
                  proposedTier={reverify.data.proposedTier}
                  onConfirm={handleUpgrade}
                  isPending={upgrade.isPending}
                  className="w-full"
                />
              ) : (
                <>
                  <div className="mb-6 flex w-full flex-col items-center">
                    <BuilderPassCard
                      ref={builderCardRef}
                      data={{ ...builderPass, discordAvatarUrl: profile?.avatarUrl, discordUsername: profile?.connections.discord.username }}
                      className="max-w-[560px]"
                    />
                    <BuilderPassRank data={builderPass} />
                  </div>
                  <dl className="mb-6 grid w-full grid-cols-2 gap-3 text-xs">
                    <div>
                      <dt className="text-muted-foreground">Last verified</dt>
                      <dd>{formatDate(builderPass.lastVerifiedAt)}</dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">Next verification</dt>
                      <dd>{builderPass.nextVerificationAt ? formatDate(builderPass.nextVerificationAt) : "Available now"}</dd>
                    </div>
                  </dl>
                  <div className="mt-auto w-full space-y-2.5">
                    {builderPass.claimStatus === "minted" ? (
                      <>
                        <ReverificationStatus nextVerificationAt={builderPass.nextVerificationAt} isPending={reverify.isPending} onReverify={handleReverify} className="w-full" />
                        <div className="grid grid-cols-2 gap-2.5">
                          <Button variant="outline" onClick={() => builderCardRef.current && downloadNodeAsPng(builderCardRef.current, "arc-pass-builder.png")}>
                            <Download className="mr-2 h-4 w-4" /> Download
                          </Button>
                          <Button variant="outline" asChild>
                            <Link href={`/pass/builder/${builderPass.id}`}>
                              <ExternalLink className="mr-2 h-4 w-4" /> Public verification
                            </Link>
                          </Button>
                        </div>
                        <Button variant="outline" className="w-full" onClick={() => shareOnX("builder", builderPass.id, true)}>
                          <Share2 className="mr-2 h-4 w-4" aria-hidden="true" /> Share on X
                        </Button>
                      </>
                    ) : builderPass.claimStatus === "claimed" ? (
                       <div className="space-y-2.5">
                         <p className="flex items-center justify-center gap-1.5 text-center text-xs font-medium text-success"><Check className="h-3.5 w-3.5" aria-hidden="true" /> Added to your inventory</p>
                         <div className="grid grid-cols-2 gap-2.5">
                           <Button variant="outline" onClick={() => builderCardRef.current && downloadNodeAsPng(builderCardRef.current, "arc-pass-builder.png")}><Download className="mr-2 h-4 w-4" /> Download</Button>
                           <Button variant="outline" onClick={() => shareOnX("builder", builderPass.id, false)}><Share2 className="mr-2 h-4 w-4" /> Share</Button>
                         </div>
                         <Button className="w-full" onClick={() => setLocation("/claim/builder")}>
                           Mint Onchain <ArrowRight className="ml-2 h-4 w-4" />
                         </Button>
                       </div>
                    ) : builderPass.eligibilityStatus === "eligible" ? (
                      <div className="space-y-2">
                        <Button className="w-full" onClick={() => setLocation("/claim/builder")}>
                          Claim Your Pass <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                        <Button variant="outline" className="w-full" disabled>
                          <Lock className="mr-2 h-3.5 w-3.5" aria-hidden="true" /> Mint Onchain
                        </Button>
                      </div>
                    ) : (
                      <Button variant="outline" className="w-full" onClick={() => setLocation("/claim/builder")}>
                        Continue Verification
                      </Button>
                    )}
                    <CredentialStatusBlock
                      claimStatus={builderPass.claimStatus}
                      tokenId={builderPass.tokenId}
                      transactionHash={builderPass.transactionHash}
                      network={builderPass.network}
                      publicHref={`/pass/builder/${builderPass.id}`}
                      className="pt-1.5"
                    />
                  </div>
                </>
              )
            ) : (
              <EmptyState
                icon={Activity}
                title="No Onchain Builder Pass"
                description="Verify X or Discord, prove ownership of a wallet, and analyse qualifying onchain activity."
                action={{ label: "Start Verification", onClick: () => setLocation("/claim/builder") }}
              />
            )}
          </div>
        </section>
      </div>

      <section className="mt-10 rounded-2xl border bg-card p-5 sm:p-6" aria-labelledby="dashboard-tier-thresholds">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div><p className="font-mono text-[10px] font-semibold uppercase tracking-[0.22em] text-[#b98a24] dark:text-[#e0b054]">[ Tier Ladder ]</p><h2 id="dashboard-tier-thresholds" className="mt-2 text-lg font-semibold">Builder tier thresholds</h2><p className="mt-1 text-sm text-muted-foreground">Current tier: <strong className="text-foreground">{builderPass?.currentTier?.name ?? "Not assigned"}</strong></p></div>
          <Link href="/tiers" className="inline-flex min-h-11 items-center text-sm font-semibold text-primary hover:underline">How tiers work <ArrowRight className="ml-1 size-4" /></Link>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-5">
          {[
            { name: "Bronze", threshold: "2+", emblem: "/tiers/bronze.png" },
            { name: "Silver", threshold: "10+", emblem: "/tiers/silver.png" },
            { name: "Gold", threshold: "50+", emblem: "/tiers/gold.png" },
            { name: "Platinum", threshold: "100+", emblem: "/tiers/platinum.png" },
            { name: "Diamond", threshold: "1,000+", emblem: "/tiers/diamond.png" },
          ].map(({ name, threshold, emblem }) => (
            <div key={name} className={cn("rounded-2xl border p-3", builderPass?.currentTier?.name === name && "border-primary/50 bg-primary/5")}>
              <img src={emblem} alt="" className="size-8 object-contain" />
              <p className="mt-2 text-sm font-semibold">{name}</p>
              <p className="mt-1 font-mono text-[10px] text-muted-foreground">{threshold} Arc transactions</p>
            </div>
          ))}
        </div>
      </section>

      {/* Account */}
      <section className="mt-14">
        <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.22em] text-[#b98a24] dark:text-[#e0b054]">[ Account ]</p>
        <h2 className="mb-4 mt-2 text-lg font-semibold">Identity &amp; connections</h2>
        <div className="relative overflow-hidden rounded-2xl border bg-card">
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/60 to-transparent" aria-hidden="true" />
          <div id="account" className="flex scroll-mt-24 items-center gap-4 p-6">
            <div className="relative flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-primary to-accent text-base font-semibold text-primary-foreground">
              {user.avatarUrl ? (
                <img src={user.avatarUrl} alt="" className="size-full object-cover" />
              ) : (
                initials(user.displayName)
              )}
            </div>
            <div className="min-w-0">
              <p className="truncate text-base font-semibold">{user.displayName}</p>
              <p className="mt-0.5 text-sm text-muted-foreground">
                @{user.username} · Signed in with {user.provider === "x" ? "X" : "Discord"}
              </p>
            </div>
          </div>

          <div id="connections" className="scroll-mt-24 divide-y border-t">
            <ConnectionRow icon={<SiX className="size-4" />} label="X" connected={!!profile?.connections.x.connected} username={profile?.connections.x.username} href="/api/auth/x?returnTo=%2Fdashboard" />
            <ConnectionRow
              icon={<DiscordIcon className="size-4" />}
              label="Discord"
              connected={!!profile?.connections.discord.connected}
              username={profile?.connections.discord.displayIdentity ?? profile?.connections.discord.username}
              href="/api/auth/discord?returnTo=%2Fdashboard"
              tint="discord"
            />
            <ConnectionRow
              icon={<Github className="size-4" />}
              label="GitHub"
              connected={!!profile?.connections.github.connected}
              username={profile?.connections.github.username}
              href="/api/auth/github"
            />
            {wallets.map((wallet, index) => (
              <ConnectionRow
                key={wallet.id}
                icon={<WalletCards className="size-4" />}
                label={`Wallet ${index + 1}`}
                connected={!!wallet.ownershipVerifiedAt}
                username={`${wallet.address.slice(0, 6)}…${wallet.address.slice(-4)}`}
              />
            ))}
          </div>

          <div className="flex flex-col gap-4 border-t bg-muted/15 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
              <span>Founder: <strong className="font-medium text-foreground">{founderPass ? founderOverallStatusMeta(founderPass).label : "No invitation"}</strong></span>
              <span>Builder: <strong className="font-medium text-foreground">{builderPass ? builderOverallStatusMeta(builderPass).label : "Not started"}</strong></span>
              <span>Wallets verified: <strong className="font-medium text-foreground">{wallets.filter((wallet) => wallet.ownershipVerifiedAt).length}</strong></span>
              <span>Re-verification: <strong className="font-medium text-foreground">{builderPass?.nextVerificationAt ? formatDate(builderPass.nextVerificationAt) : "after Builder verification"}</strong></span>
            </div>
            <Button variant="outline" size="sm" className="shrink-0" disabled={logout.isPending} onClick={() => logout.mutate(undefined, { onSuccess: () => window.location.assign("/") })}>
              {logout.isPending ? "Signing out…" : "Log out"}
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}

function CredentialStatusBlock({
  claimStatus,
  tokenId,
  transactionHash,
  network,
  publicHref,
  waveAvailable,
  className,
}: {
  claimStatus: string;
  tokenId?: string | null;
  transactionHash?: string | null;
  network?: string | null;
  publicHref: string;
  waveAvailable?: boolean;
  className?: string;
}) {
  const minted = claimStatus === "minted";
  const claimed = claimStatus === "claimed" || minted;
  const txUrl = explorerTxUrl(network, transactionHash);

  const rows: Array<{ label: string; value: React.ReactNode; tone?: "success" }> = minted
    ? [
        { label: "Pass status", value: "Minted on Arc", tone: "success" },
        { label: "Token ID", value: <span className="font-mono">{tokenId ?? "Pending index"}</span> },
        { label: "Reveal", value: "Revealed" },
        { label: "Transferability", value: "Permanent · non-transferable" },
        { label: "Onchain record", value: txUrl ? <a href={txUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-semibold text-primary hover:underline">View transaction <ExternalLink className="size-3.5" /></a> : "Indexing transaction" },
      ]
    : [
        { label: "Inventory", value: claimed ? "Claimed to inventory" : "Claim required", tone: claimed ? "success" : undefined },
        { label: "Onchain status", value: claimed ? (waveAvailable === false ? "Wave 1 mint unavailable · credential remains in your account" : "Onchain mint available") : "Available after claim" },
        { label: "Reveal", value: claimed ? "Revealed" : "Concealed until claimed" },
        ...(waveAvailable !== undefined ? [{ label: "Wave 1 position", value: waveAvailable ? "Available" : "Unavailable" }] : []),
      ];

  return (
    <Collapsible className={cn("w-full", className)}>
      <CollapsibleTrigger className="group flex min-h-11 w-full items-center justify-between gap-3 rounded-xl border bg-muted/20 px-4 text-sm font-semibold transition-colors hover:bg-muted/40">
        <span className="inline-flex items-center gap-2">
          <span className={cn("size-1.5 rounded-full", minted ? "bg-success" : claimed ? "bg-primary" : "bg-muted-foreground/50")} aria-hidden="true" />
          See pass status
        </span>
        <ChevronDown className="size-4 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" aria-hidden="true" />
      </CollapsibleTrigger>
      <CollapsibleContent>
        <section className="mt-2 rounded-xl border" aria-label="Credential status">
          <dl className="divide-y text-xs">
            {rows.map((row) => (
              <div key={row.label} className="flex items-center justify-between gap-3 px-4 py-2.5">
                <dt className="text-muted-foreground">{row.label}</dt>
                <dd className={cn("text-right font-medium", row.tone === "success" && "text-success")}>{row.value}</dd>
              </div>
            ))}
          </dl>
          <div className="border-t px-4 py-2.5">
            <Link href={publicHref} className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline">
              Public verification <ExternalLink className="size-3.5" aria-hidden="true" />
            </Link>
          </div>
        </section>
      </CollapsibleContent>
    </Collapsible>
  );
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const chars = parts.length > 1 ? [parts[0][0], parts[parts.length - 1][0]] : [parts[0]?.[0] ?? "?"];
  return chars.join("").toUpperCase();
}

function ConnectionRow({
  icon,
  label,
  connected,
  username,
  href,
  tint = "neutral",
}: {
  icon: React.ReactNode;
  label: string;
  connected: boolean;
  username?: string | null;
  href?: string;
  tint?: "neutral" | "discord";
}) {
  return (
    <div className="flex items-center justify-between gap-3 px-6 py-4 transition-colors hover:bg-muted/40">
      <div className="flex min-w-0 items-center gap-3.5">
        <span
          className={cn(
            "grid size-9 shrink-0 place-items-center rounded-xl",
            tint === "discord" ? "bg-[#5865F2]/10 text-[#5865F2]" : "bg-foreground/[0.06] text-foreground/80",
          )}
        >
          {icon}
        </span>
        <div className="min-w-0">
          <p className="text-sm font-medium">{label}</p>
          <p className="truncate text-xs text-muted-foreground">{connected && username ? `${label === "X" || label === "GitHub" ? "@" : ""}${username}` : "Not connected"}</p>
        </div>
      </div>
      {connected ? (
        <div className="flex shrink-0 items-center gap-2">
          <span className="inline-flex items-center gap-1 text-xs font-medium text-success">
            <Check className="size-3.5" aria-hidden="true" /> Connected
          </span>
          {href ? (
            <Button variant="ghost" size="sm" className="min-h-11 px-2 text-xs text-muted-foreground" asChild>
              <a href={href} aria-label={`Reconnect ${label}`}>Reconnect</a>
            </Button>
          ) : null}
        </div>
      ) : href ? (
        <Button variant="secondary" size="sm" className="shrink-0" asChild>
          <a href={href}>Connect</a>
        </Button>
      ) : (
        <span className="shrink-0 text-xs font-medium text-muted-foreground">Planned</span>
      )}
    </div>
  );
}
