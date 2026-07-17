import { useEffect, useRef } from "react";
import { Link, useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Download, ExternalLink, ArrowRight, Github, Check, Share2, Lock } from "lucide-react";
import { SiX } from "react-icons/si";
import { DiscordIcon } from "@/components/discord-icon";
import {
  useGetMe,
  useGetUserProfile,
  useListMyPasses,
  useGetDashboardStats,
  useReverifyBuilder,
  useUpgradeBuilderTier,
  getGetMeQueryKey,
  getGetUserProfileQueryKey,
  getListMyPassesQueryKey,
  getGetDashboardStatsQueryKey,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { FounderPassCard } from "@/components/founder-pass-card";
import { BuilderPassCard } from "@/components/builder-pass-card";
import { PassStatusBadge } from "@/components/pass-status-badge";
import { ReverificationStatus } from "@/components/reverification-status";
import { PassComparison } from "@/components/pass-comparison";
import { TierHistory } from "@/components/tier-history";
import { SupplyIndicator } from "@/components/supply-indicator";
import { EmptyState } from "@/components/empty-state";
import { downloadNodeAsPng } from "@/lib/export-image";
import { formatDate } from "@/lib/format";
import { founderOverallStatusMeta, builderOverallStatusMeta } from "@/lib/pass-status";
import { cn } from "@/lib/utils";
import { Activity } from "lucide-react";

export default function DashboardPage() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { data: user, isLoading: userLoading } = useGetMe({ query: { retry: false, queryKey: getGetMeQueryKey() } });
  const { data: profile } = useGetUserProfile({ query: { enabled: !!user, queryKey: getGetUserProfileQueryKey() } });
  const { data: passes, isLoading: passesLoading } = useListMyPasses({ query: { enabled: !!user, queryKey: getListMyPassesQueryKey() } });
  const { data: stats } = useGetDashboardStats({ query: { enabled: !!user, queryKey: getGetDashboardStatsQueryKey() } });

  const reverify = useReverifyBuilder();
  const upgrade = useUpgradeBuilderTier();

  const founderCardRef = useRef<HTMLDivElement>(null);
  const builderCardRef = useRef<HTMLDivElement>(null);

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

  const shareOnX = (type: "founder" | "builder", id: number) => {
    const label = type === "founder" ? "Founder Pass" : "Onchain Builder Pass";
    const shareUrl = `${window.location.origin}/api/share/${type}/${id}`;
    const intentUrl = `https://x.com/intent/post?${new URLSearchParams({
      text: `My ${label} is now minted onchain, verified by Webcoin Labs.`,
      url: shareUrl,
    }).toString()}`;
    window.open(intentUrl, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="mx-auto w-full max-w-7xl p-4 pb-24 pt-10 sm:p-6 sm:pt-12">
      <div className="mb-10">
        <h1 className="text-3xl font-bold tracking-tight">Your Arc Passes</h1>
        <p className="mt-2 text-muted-foreground">Manage your credentials, verification status, and onchain records.</p>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        {/* Founder */}
        <section>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Founder Pass</h2>
            {founderPass && <PassStatusBadge meta={founderOverallStatusMeta(founderPass)} />}
          </div>
          <div className="flex flex-1 flex-col items-center rounded-3xl border bg-card p-3 shadow-sm sm:p-6 lg:p-8">
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
                    <dd className="font-mono tabular-nums">{founderPass.destinationWallet ? `${founderPass.destinationWallet.slice(0, 6)}…${founderPass.destinationWallet.slice(-4)}` : "—"}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Token ID</dt>
                    <dd className="font-mono tabular-nums">{founderPass.tokenId ?? "—"}</dd>
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
                            <ExternalLink className="mr-2 h-4 w-4" /> Details
                          </Link>
                        </Button>
                      </div>
                      <Button variant="outline" className="w-full" onClick={() => shareOnX("founder", founderPass.id)}>
                        <Share2 className="mr-2 h-4 w-4" aria-hidden="true" /> Share on X
                      </Button>
                    </>
                   ) : founderPass.claimStatus === "claimed" ? (
                     <div className="space-y-2.5">
                       <p className="flex items-center justify-center gap-1.5 text-center text-xs font-medium text-success"><Check className="h-3.5 w-3.5" aria-hidden="true" /> Added to your inventory</p>
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
                </div>
              </>
            ) : (
              <EmptyState icon={Activity} title="No Founder Pass" description="You haven't been invited yet. Founder Pass is admin-controlled and invite-only." />
            )}
          </div>
        </section>

        {/* Builder */}
        <section>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Onchain Builder Pass</h2>
            {builderPass && <PassStatusBadge meta={builderOverallStatusMeta(builderPass)} />}
          </div>
          <div className="flex flex-1 flex-col items-center rounded-3xl border bg-card p-3 shadow-sm sm:p-6 lg:p-8">
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
                  <BuilderPassCard
                    ref={builderCardRef}
                    data={{ ...builderPass, discordAvatarUrl: profile?.avatarUrl, discordUsername: profile?.connections.discord.username }}
                    className="mb-6 max-w-[560px]"
                  />
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
                  {builderPass.tierHistory.length > 0 && (
                    <TierHistory entries={builderPass.tierHistory} network={builderPass.network} className="mb-6 w-full" />
                  )}
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
                              <ExternalLink className="mr-2 h-4 w-4" /> Details
                            </Link>
                          </Button>
                        </div>
                        <Button variant="outline" className="w-full" onClick={() => shareOnX("builder", builderPass.id)}>
                          <Share2 className="mr-2 h-4 w-4" aria-hidden="true" /> Share on X
                        </Button>
                      </>
                    ) : builderPass.claimStatus === "claimed" ? (
                       <div className="space-y-2.5">
                         <p className="flex items-center justify-center gap-1.5 text-center text-xs font-medium text-success"><Check className="h-3.5 w-3.5" aria-hidden="true" /> Added to your inventory</p>
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
          {stats?.builderSupply && (
            <div className="mt-4">
              <SupplyIndicator totalClaimed={stats.builderSupply.totalClaimed} phaseClaimLimit={stats.builderSupply.phaseClaimLimit} phaseName={stats.builderSupply.phaseName} />
            </div>
          )}
        </section>
      </div>

      {/* Account */}
      <section className="mt-14">
        <h2 className="mb-4 text-lg font-semibold">Account</h2>
        <div className="relative overflow-hidden rounded-3xl border bg-card shadow-sm">
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
            <ConnectionRow icon={<SiX className="size-4" />} label="X" connected={!!profile?.connections.x.connected} username={profile?.connections.x.username} href="/api/auth/x" />
            <ConnectionRow
              icon={<DiscordIcon className="size-4" />}
              label="Discord"
              connected={!!profile?.connections.discord.connected}
              username={profile?.connections.discord.username}
              href="/api/auth/discord"
              tint="discord"
            />
            <ConnectionRow
              icon={<Github className="size-4" />}
              label="GitHub"
              connected={!!profile?.connections.github.connected}
              username={profile?.connections.github.username}
              href="/api/auth/github"
            />
          </div>
        </div>
      </section>
    </div>
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
          <p className="truncate text-xs text-muted-foreground">{connected && username ? `@${username}` : "Not connected"}</p>
        </div>
      </div>
      {connected ? (
        <span className="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-success">
          <Check className="size-3.5" aria-hidden="true" /> Connected
        </span>
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
