import { useRef } from "react";
import { useRoute, Link } from "wouter";
import { Download, ExternalLink, ArrowLeft, ArrowRight, Hash, Globe, Wallet, Calendar, Share2, Sparkles } from "lucide-react";
import { useGetFounderPass, useGetBuilderPass, useGetBuilderSupply, useGetMe, useListMyPasses, getGetFounderPassQueryKey, getGetBuilderPassQueryKey, getGetMeQueryKey, getListMyPassesQueryKey } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { FounderPassCard } from "@/components/founder-pass-card";
import { BuilderPassCard, BuilderPassRank } from "@/components/builder-pass-card";
import { PassStatusBadge } from "@/components/pass-status-badge";
import { TierHistory } from "@/components/tier-history";
import { EmptyState } from "@/components/empty-state";
import { NetworkMark } from "@/components/network-mark";
import { SupplyIndicator } from "@/components/supply-indicator";
import { downloadNodeAsPng, shareNodeOnX } from "@/lib/export-image";
import { formatPassNumber, formatNetworkLabel, formatDate, abbreviateAddress, explorerTxUrl, explorerTokenUrl } from "@/lib/format";
import { founderOverallStatusMeta, builderOverallStatusMeta } from "@/lib/pass-status";

export default function PassDetailPage() {
  const [, params] = useRoute<{ type: string; id: string }>("/pass/:type/:id");
  const type = params?.type === "builder" ? "builder" : "founder";
  const passId = params?.id ? parseInt(params.id, 10) : 0;
  const cardRef = useRef<HTMLDivElement>(null);

  const founderQuery = useGetFounderPass(passId, { query: { enabled: type === "founder" && !!passId, queryKey: getGetFounderPassQueryKey(passId) } });
  const builderQuery = useGetBuilderPass(passId, { query: { enabled: type === "builder" && !!passId, queryKey: getGetBuilderPassQueryKey(passId) } });
  const { data: builderSupply } = useGetBuilderSupply();
  const { data: user } = useGetMe({ query: { retry: false, queryKey: getGetMeQueryKey() } });
  const { data: myPasses } = useListMyPasses({ query: { enabled: !!user, retry: false, queryKey: getListMyPassesQueryKey() } });

  const isLoading = type === "founder" ? founderQuery.isLoading : builderQuery.isLoading;
  const error = type === "founder" ? founderQuery.error : builderQuery.error;
  const founderPass = founderQuery.data;
  const builderPass = builderQuery.data;
  const canShare = !!user && (type === "founder" ? myPasses?.founder?.id === passId : myPasses?.builder?.id === passId);

  if (isLoading) {
    return (
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-12 p-6 pt-12 lg:flex-row">
        <Skeleton className="aspect-[1.48/1] w-full max-w-xl rounded-[30px]" />
        <div className="mt-8 flex-1 space-y-6">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-32 w-full" />
        </div>
      </div>
    );
  }

  if (error || (type === "founder" && !founderPass) || (type === "builder" && !builderPass)) {
    return <EmptyState icon={ExternalLink} title="Pass not found" description="This pass doesn't exist, or the link is incorrect." className="flex-1" />;
  }

  const downloadFilename = `arc-pass-${type}.png`;

  return (
    <div className="mx-auto w-full max-w-7xl p-4 pb-24 pt-10 sm:p-6 sm:pt-12">
      <Button variant="ghost" onClick={() => window.history.back()} className="-ml-4 mb-8 text-muted-foreground">
        <ArrowLeft className="mr-2 h-4 w-4" /> Back
      </Button>

      <div className="flex flex-col items-start gap-12 lg:flex-row">
        <div className="mx-auto w-full max-w-[720px] lg:sticky lg:top-24 lg:mx-0">
          {type === "founder" && founderPass && <FounderPassCard ref={cardRef} data={founderPass} className="w-full" />}
          {type === "builder" && builderPass && (
            <>
              <BuilderPassCard ref={cardRef} data={builderPass} className="w-full" />
              <BuilderPassRank data={builderPass} />
            </>
          )}

          {(founderPass?.claimStatus === "claimed" || founderPass?.claimStatus === "minted" || builderPass?.claimStatus === "claimed" || builderPass?.claimStatus === "minted") && (
            <div className="mt-6 grid grid-cols-2 gap-3">
              <Button variant="secondary" className="flex-1" onClick={() => cardRef.current && void downloadNodeAsPng(cardRef.current, downloadFilename, type === "founder" ? `/api/share/founder/${passId}/image?download=1` : undefined)}>
                <Download className="mr-2 h-4 w-4" /> Download
              </Button>
              {(() => {
                const pass = founderPass ?? builderPass!;
                const txUrl = explorerTxUrl(pass.network, pass.transactionHash);
                return txUrl ? (
                  <Button variant="secondary" className="flex-1" asChild>
                    <a href={txUrl} target="_blank" rel="noreferrer">
                      <ExternalLink className="mr-2 h-4 w-4" /> See tx
                    </a>
                  </Button>
                ) : null;
              })()}
              {(() => {
                const pass = founderPass ?? builderPass!;
                const tokenUrl = explorerTokenUrl(pass.network, pass.contractAddress, pass.tokenId);
                return tokenUrl ? (
                  <Button className="col-span-2" asChild>
                    <a href={tokenUrl} target="_blank" rel="noreferrer">
                      <ExternalLink className="mr-2 h-4 w-4" /> View onchain NFT
                    </a>
                  </Button>
                ) : null;
              })()}
              {canShare && (founderPass ?? builderPass)?.claimStatus === "minted" ? (
                <Button variant="outline" className="col-span-2" onClick={() => cardRef.current && void shareNodeOnX({ node: cardRef.current, passType: type, passId, minted: true, returnTo: `/pass/${type}/${passId}` })}>
                  <Share2 className="mr-2 h-4 w-4" aria-hidden="true" /> Share public pass on X
                </Button>
              ) : canShare ? (
                <Button className="col-span-2" asChild>
                  <Link href={`/claim/${type}`}>
                    <ExternalLink className="mr-2 h-4 w-4" aria-hidden="true" /> Mint Onchain to share on X
                  </Link>
                </Button>
              ) : null}
              {type === "founder" && founderPass && (
                <div className="col-span-2 mt-1 rounded-2xl border border-primary/20 bg-primary/[0.05] p-3">
                  <Button className="h-12 w-full" asChild>
                    <a href="https://arc.webcoinlabs.com">
                      <Sparkles className="mr-2 h-4 w-4" aria-hidden="true" /> Claim your exclusive Builder Pass <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
                    </a>
                  </Button>
                  <p className="mt-2 text-center text-xs text-muted-foreground">
                    {builderSupply
                      ? `${builderSupply.remainingClaims.toLocaleString()} of ${builderSupply.phaseClaimLimit.toLocaleString()} Wave 1 onchain mint slots remain.`
                      : "Checking the remaining Wave 1 allocation…"}
                  </p>
                  {builderSupply && <SupplyIndicator totalMinted={builderSupply.totalMinted} phaseClaimLimit={builderSupply.phaseClaimLimit} className="mt-3" />}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="w-full flex-1 space-y-8">
          <div>
            <div className="mb-2 flex items-center gap-3">
              <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{type === "founder" ? "Founder Pass" : "Onchain Builder Pass"}</h1>
              <PassStatusBadge meta={type === "founder" ? founderOverallStatusMeta(founderPass!) : builderOverallStatusMeta(builderPass!)} />
            </div>
            <p className="text-lg text-muted-foreground">
              {type === "founder" ? `Official credential for ${founderPass?.displayName ?? "this founder"}.` : `Verified record of builder activity and contribution for ${builderPass?.displayName ?? "this builder"}.`}
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Card className="bg-card/50">
              <CardContent className="flex flex-col gap-1 p-5">
                <div className="mb-1 flex items-center gap-2 text-xs text-muted-foreground">
                  <Hash className="h-3.5 w-3.5" /> Pass Number
                </div>
                <div className="font-mono text-xl font-semibold tabular-nums">{formatPassNumber((founderPass ?? builderPass)?.passNumber)}</div>
              </CardContent>
            </Card>
            <Card className="bg-card/50">
              <CardContent className="flex flex-col gap-1 p-5">
                <div className="mb-1 flex items-center gap-2 text-xs text-muted-foreground">
                  <Globe className="h-3.5 w-3.5" /> Network
                </div>
                <div className="flex items-center gap-1.5 text-xl font-semibold"><NetworkMark network={(founderPass ?? builderPass)?.network} className="size-4 shrink-0 rounded-full" />{formatNetworkLabel((founderPass ?? builderPass)?.network)}</div>
              </CardContent>
            </Card>
            <Card className="bg-card/50 sm:col-span-2">
              <CardContent className="flex flex-col gap-1 p-5">
                <div className="mb-1 flex items-center gap-2 text-xs text-muted-foreground">
                  <Wallet className="h-3.5 w-3.5" /> Owner Wallet
                </div>
                <div className="truncate font-mono text-sm">
                  {(founderPass ?? builderPass)?.destinationWallet ? abbreviateAddress((founderPass ?? builderPass)!.destinationWallet!, 6) : "Not minted yet"}
                </div>
              </CardContent>
            </Card>
          </div>

          {type === "founder" && founderPass && (founderPass.companyDescription || founderPass.founderStatement || founderPass.companyWebsite) && (
            <div className="space-y-3 border-t pt-6">
              <h3 className="text-lg font-semibold">About</h3>
              {founderPass.companyDescription && <p className="text-sm text-muted-foreground">{founderPass.companyDescription}</p>}
              {founderPass.founderStatement && <p className="text-sm italic text-muted-foreground">"{founderPass.founderStatement}"</p>}
              {founderPass.companyWebsite && (
                <a href={founderPass.companyWebsite} target="_blank" rel="noreferrer" className="inline-block text-sm text-primary hover:underline">
                  {founderPass.companyWebsite}
                </a>
              )}
            </div>
          )}

          {type === "builder" && builderPass && builderPass.tierHistory.length > 0 && (
            <div className="space-y-3 border-t pt-6">
              <h3 className="text-lg font-semibold">Tier History</h3>
              <TierHistory entries={builderPass.tierHistory} network={builderPass.network} />
            </div>
          )}

          <div className="space-y-4 border-t pt-6">
            <h3 className="text-lg font-semibold">History</h3>
            <div className="relative ml-3 space-y-6 border-l border-muted pb-4">
              <div className="relative pl-6">
                <div className="absolute -left-[6.5px] top-1.5 h-3 w-3 rounded-full bg-primary" />
                <p className="text-sm font-medium">Pass Created</p>
                <p className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
                  <Calendar className="h-3 w-3" /> {formatDate((founderPass ?? builderPass)?.createdAt)}
                </p>
              </div>
              {founderPass?.claimedAt && (
                <div className="relative pl-6">
                  <div className="absolute -left-[6.5px] top-1.5 h-3 w-3 rounded-full bg-info" />
                  <p className="text-sm font-medium">Claimed</p>
                  <p className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
                    <Calendar className="h-3 w-3" /> {formatDate(founderPass.claimedAt)}
                  </p>
                </div>
              )}
              {(founderPass?.issuedAt || builderPass?.initiallyIssuedAt) && (
                <div className="relative pl-6">
                  <div className="absolute -left-[6.5px] top-1.5 h-3 w-3 rounded-full bg-success" />
                  <p className="text-sm font-medium">Minted Onchain</p>
                  <p className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
                    <Calendar className="h-3 w-3" /> {formatDate(founderPass?.issuedAt ?? builderPass?.initiallyIssuedAt)}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
