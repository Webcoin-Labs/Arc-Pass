import { useAdminGetOverview } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

function StatCard({ label, value }: { label: string; value: number | string }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold tabular-nums">{value}</div>
      </CardContent>
    </Card>
  );
}

export function OverviewPanel() {
  const { data, isLoading } = useAdminGetOverview();

  if (isLoading || !data) {
    return (
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h3 className="mb-3 text-sm font-semibold text-muted-foreground">Founder Passes</h3>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
          <StatCard label="Total Issued" value={data.founderPassesIssued} />
          <StatCard label="Normal" value={data.normalFounderPasses} />
          <StatCard label="Premium Black" value={data.premiumBlackFounderPasses} />
        </div>
      </div>

      <div>
        <h3 className="mb-3 text-sm font-semibold text-muted-foreground">Builder Passes</h3>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
          <StatCard label="Issued" value={data.builderPassesIssued} />
          <StatCard label="Remaining" value={data.builderPassesRemaining} />
          <StatCard label="Suspended" value={data.suspendedPasses} />
        </div>
        {Object.keys(data.builderTierDistribution).length > 0 && (
          <div className="mt-4 flex flex-wrap gap-3">
            {Object.entries(data.builderTierDistribution).map(([name, count]) => (
              <div key={name} className="rounded-lg border bg-card px-3 py-2 text-sm">
                <span className="font-medium">{name}</span>
                <span className="ml-2 text-muted-foreground tabular-nums">{count}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <h3 className="mb-3 text-sm font-semibold text-muted-foreground">Operational queue</h3>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard label="Founder Reviews" value={data.pendingFounderReviews} />
          <StatCard label="Builder Reviews" value={data.pendingBuilderReviews} />
          <StatCard label="Re-verifications Due" value={data.pendingReverifications} />
          <StatCard label="Pending Upgrades" value={data.pendingUpgrades} />
        </div>
      </div>

      <div>
        <h3 className="mb-3 text-sm font-semibold text-muted-foreground">Integrity</h3>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
          <StatCard label="Revoked Passes" value={data.revokedPasses} />
        </div>
      </div>
    </div>
  );
}
