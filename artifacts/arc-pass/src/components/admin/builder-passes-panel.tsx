import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Search, ShieldOff, ShieldCheck, Ban } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { TierBadge } from "@/components/tier-badge";
import { PassStatusBadge } from "@/components/pass-status-badge";
import { TierHistory } from "@/components/tier-history";
import { builderOverallStatusMeta } from "@/lib/pass-status";
import { formatPassNumber, formatDate, abbreviateAddress } from "@/lib/format";
import {
  useAdminListBuilderPasses,
  useAdminListBuilderTiers,
  useAdminSuspendBuilderPass,
  useAdminUnsuspendBuilderPass,
  useAdminRevokeBuilderPass,
} from "@workspace/api-client-react";
import type { AdminBuilderPass } from "@workspace/api-client-react";

export function BuilderPassesPanel() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [tierSlug, setTierSlug] = useState<string | undefined>(undefined);
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const { data, isLoading } = useAdminListBuilderPasses({ search: search || undefined, tierSlug });
  const { data: tiers = [] } = useAdminListBuilderTiers();
  const suspend = useAdminSuspendBuilderPass();
  const unsuspend = useAdminUnsuspendBuilderPass();
  const revoke = useAdminRevokeBuilderPass();

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["/api/admin/builder-passes"] });
  const selected = data?.items.find((p) => p.id === selectedId) ?? null;

  const onSettled = (label: string) => ({
    onSuccess: () => {
      toast.success(label);
      invalidate();
    },
    onError: (err: unknown) => toast.error(err instanceof Error ? err.message : "Action failed"),
  });

  const handleSuspend = (id: number) => suspend.mutate({ id, data: {} }, onSettled("Pass suspended"));
  const handleUnsuspend = (id: number) => unsuspend.mutate({ id }, onSettled("Suspension lifted"));
  const handleRevoke = (id: number) => revoke.mutate({ id, data: {} }, onSettled("Pass revoked"));

  return (
    <div>
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 flex-col gap-3 sm:flex-row">
          <div className="relative flex-1 sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Search by name, Discord, GitHub…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>
          <Select value={tierSlug ?? "all"} onValueChange={(v) => setTierSlug(v === "all" ? undefined : v)}>
            <SelectTrigger className="sm:w-48">
              <SelectValue placeholder="All tiers" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All tiers</SelectItem>
              {tiers.map((t) => (
                <SelectItem key={t.slug} value={t.slug}>
                  {t.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead>Identity</TableHead>
              <TableHead>Tier</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Last verified</TableHead>
              <TableHead>Pass No.</TableHead>
              <TableHead className="text-right">Wallets</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={6}>
                    <Skeleton className="h-8 w-full" />
                  </TableCell>
                </TableRow>
              ))
            ) : data?.items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-12 text-center text-muted-foreground">
                  No Builder Passes found.
                </TableCell>
              </TableRow>
            ) : (
              data?.items.map((pass) => (
                <TableRow key={pass.id} className="cursor-pointer" onClick={() => setSelectedId(pass.id)}>
                  <TableCell>
                    <div className="font-medium">{pass.displayName || "Unknown"}</div>
                    <div className="text-xs text-muted-foreground">{pass.discordUsername ? `@${pass.discordUsername}` : "Discord not connected"}</div>
                  </TableCell>
                  <TableCell>{pass.currentTier ? <TierBadge tier={pass.currentTier} /> : "Not assigned"}</TableCell>
                  <TableCell>
                    <PassStatusBadge meta={builderOverallStatusMeta(pass)} />
                  </TableCell>
                  <TableCell className="text-sm">{formatDate(pass.lastVerifiedAt)}</TableCell>
                  <TableCell className="font-mono text-xs">{formatPassNumber(pass.passNumber)}</TableCell>
                  <TableCell className="text-right text-sm">{pass.verifiedWalletCount}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Sheet open={!!selected} onOpenChange={(open) => !open && setSelectedId(null)}>
        <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-lg">
          <SheetHeader className="mb-6">
            <SheetTitle>Builder Pass Detail</SheetTitle>
          </SheetHeader>
          {selected && (
            <div className="space-y-6">
              <div>
                <p className="text-lg font-semibold">{selected.displayName}</p>
                <p className="text-sm text-muted-foreground">Discord {selected.discordUsername ? `@${selected.discordUsername}` : "not connected"} · GitHub {(selected as AdminBuilderPass).githubUsername ? `@${(selected as AdminBuilderPass).githubUsername}` : "not connected"}</p>
              </div>

              <dl className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <dt className="text-xs text-muted-foreground">Current tier</dt>
                  <dd>{selected.currentTier?.name ?? "Not assigned"}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Pass number</dt>
                  <dd className="font-mono">{formatPassNumber(selected.passNumber)}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Qualifying transactions</dt>
                  <dd>{selected.qualifyingTransactionCount ?? "Activity not checked"}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Contracts deployed</dt>
                  <dd>{selected.validContractCount ?? "Activity not checked"}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">GitHub contributions</dt>
                  <dd>{selected.githubContributionCount ?? "GitHub data unavailable"}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Arc Discord</dt>
                  <dd>{selected.discordCommunityMember === true ? "Community member" : selected.discordCommunityMember === false ? "Not a member" : "Not checked"}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Member since</dt>
                  <dd>{selected.discordCommunityJoinedAt ? formatDate(selected.discordCommunityJoinedAt) : "Membership not checked"}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Last verified</dt>
                  <dd>{formatDate(selected.lastVerifiedAt)}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Next verification</dt>
                  <dd>{selected.nextVerificationAt ? formatDate(selected.nextVerificationAt) : "Available now"}</dd>
                </div>
              </dl>

              {(() => {
                const walletAddresses = (selected as AdminBuilderPass).walletAddresses ?? [];
                return (
                  walletAddresses.length > 0 && (
                    <div>
                      <p className="mb-2 text-xs font-semibold text-muted-foreground">Wallets</p>
                      <ul className="space-y-1 font-mono text-xs">
                        {walletAddresses.map((w) => (
                          <li key={w}>{abbreviateAddress(w, 6)}</li>
                        ))}
                      </ul>
                    </div>
                  )
                );
              })()}

              {selected.tierHistory.length > 0 && (
                <div>
                  <p className="mb-2 text-xs font-semibold text-muted-foreground">Tier history</p>
                  <TierHistory entries={selected.tierHistory} network={selected.network} />
                </div>
              )}

              <div className="flex flex-col gap-2 border-t pt-4">
                {selected.isSuspended ? (
                  <Button variant="outline" className="gap-2" onClick={() => handleUnsuspend(selected.id)}>
                    <ShieldCheck className="h-4 w-4" /> Lift Suspension
                  </Button>
                ) : (
                  <Button variant="outline" className="gap-2" onClick={() => handleSuspend(selected.id)}>
                    <ShieldOff className="h-4 w-4" /> Suspend Credential
                  </Button>
                )}
                {!selected.isRevoked && (
                  <Button variant="destructive" className="gap-2" onClick={() => handleRevoke(selected.id)}>
                    <Ban className="h-4 w-4" /> Revoke Credential
                  </Button>
                )}
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
