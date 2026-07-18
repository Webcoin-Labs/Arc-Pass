import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Check, X, TrendingUp, RefreshCw, Clipboard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { TierBadge } from "@/components/tier-badge";
import { formatDate } from "@/lib/format";
import { useAdminListFounderApplications, useAdminListFounderPasses, useAdminListBuilderPasses, useAdminUpdateFounderPass } from "@workspace/api-client-react";

export function ReviewsPanel() {
  const queryClient = useQueryClient();
  const { data: underReview, isLoading: loadingFounders } = useAdminListFounderPasses({ status: "under_review", limit: 50 });
  const { data: applications, isLoading: loadingApplications } = useAdminListFounderApplications();
  const { data: builders, isLoading: loadingBuilders } = useAdminListBuilderPasses({ limit: 100 });
  const updateFounder = useAdminUpdateFounderPass();

  const invalidateFounders = () => queryClient.invalidateQueries({ queryKey: ["/api/admin/founder-passes"] });

  const decide = (id: number, eligibilityStatus: "eligible" | "ineligible") => {
    updateFounder.mutate(
      { id, data: { eligibilityStatus } },
      {
        onSuccess: () => {
          toast.success(eligibilityStatus === "eligible" ? "Approved" : "Marked ineligible");
          invalidateFounders();
        },
        onError: (err: unknown) => toast.error(err instanceof Error ? err.message : "Update failed"),
      },
    );
  };

  const dueForReverification = builders?.items.filter((b) => b.claimStatus !== "locked" && b.nextVerificationAt && new Date(b.nextVerificationAt) <= new Date()) ?? [];
  const pendingUpgrades = builders?.items.filter((b) => b.upgradeAvailable) ?? [];

  return (
    <div className="space-y-10">
      <section>
        <h3 className="mb-1 text-sm font-semibold text-muted-foreground">Founder Pass requests</h3>
        <p className="mb-4 text-xs leading-5 text-muted-foreground">Requests arrive from the public form. Review the note, then create an invitation from Founder Passes if you approve.</p>
        {loadingApplications ? (
          <Skeleton className="h-24 w-full rounded-xl" />
        ) : !applications?.items.length ? (
          <p className="text-sm text-muted-foreground">No Founder Pass requests are waiting for review.</p>
        ) : (
          <ul className="space-y-3">
            {applications.items.map((application) => (
              <li key={application.id} className="rounded-xl border bg-card p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-mono text-sm font-semibold">@{application.xUsername}</p>
                    <p className="mt-1 text-xs text-muted-foreground">Requested {formatDate(application.submittedAt)}</p>
                  </div>
                  <Button size="sm" variant="outline" className="gap-2" onClick={() => void navigator.clipboard?.writeText(application.xUsername).then(() => toast.success("X username copied"), () => toast.error("Couldn't copy username"))}>
                    <Clipboard className="size-3.5" aria-hidden="true" /> Copy handle
                  </Button>
                </div>
                <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-foreground/85">{application.description}</p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h3 className="mb-4 text-sm font-semibold text-muted-foreground">Founder eligibility reviews</h3>
        {loadingFounders ? (
          <Skeleton className="h-24 w-full rounded-xl" />
        ) : !underReview?.items.length ? (
          <p className="text-sm text-muted-foreground">No Founder Passes currently under review.</p>
        ) : (
          <ul className="space-y-2">
            {underReview.items.map((pass) => (
              <li key={pass.id} className="flex items-center justify-between rounded-xl border bg-card px-4 py-3">
                <div>
                  <p className="text-sm font-medium">{pass.displayName || pass.inviteHandle}</p>
                  <p className="text-xs text-muted-foreground">{pass.companyName ?? "No company set"}</p>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" className="h-8 w-8 p-0 text-success" onClick={() => decide(pass.id, "eligible")} aria-label="Approve">
                    <Check className="h-4 w-4" />
                  </Button>
                  <Button size="sm" variant="outline" className="h-8 w-8 p-0 text-destructive" onClick={() => decide(pass.id, "ineligible")} aria-label="Reject">
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-muted-foreground">
          <TrendingUp className="h-4 w-4" /> Pending tier upgrades
        </h3>
        {loadingBuilders ? (
          <Skeleton className="h-24 w-full rounded-xl" />
        ) : pendingUpgrades.length === 0 ? (
          <p className="text-sm text-muted-foreground">No Builder Passes have a pending upgrade to confirm.</p>
        ) : (
          <ul className="space-y-2">
            {pendingUpgrades.map((pass) => (
              <li key={pass.id} className="flex items-center justify-between rounded-xl border bg-card px-4 py-3">
                <p className="text-sm font-medium">{pass.displayName}</p>
                {pass.currentTier && <TierBadge tier={pass.currentTier} />}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-muted-foreground">
          <RefreshCw className="h-4 w-4" /> Re-verification available
        </h3>
        {loadingBuilders ? (
          <Skeleton className="h-24 w-full rounded-xl" />
        ) : dueForReverification.length === 0 ? (
          <p className="text-sm text-muted-foreground">No holders are currently due for re-verification.</p>
        ) : (
          <ul className="space-y-2">
            {dueForReverification.map((pass) => (
              <li key={pass.id} className="flex items-center justify-between rounded-xl border bg-card px-4 py-3">
                <p className="text-sm font-medium">{pass.displayName}</p>
                <p className="text-xs text-muted-foreground">Last verified {formatDate(pass.lastVerifiedAt)}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
