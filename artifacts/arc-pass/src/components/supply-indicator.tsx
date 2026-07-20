import { cn } from "@/lib/utils";

export function SupplyIndicator({
  totalMinted,
  phaseClaimLimit,
  className,
}: {
  totalMinted: number;
  phaseClaimLimit: number;
  className?: string;
}) {
  const pct = Math.min(100, Math.round((totalMinted / phaseClaimLimit) * 100));
  const visiblePct = totalMinted > 0 ? Math.max(pct, 1) : 0;
  const remaining = Math.max(phaseClaimLimit - totalMinted, 0);
  const complete = remaining === 0;

  return (
    <div className={cn("w-full", className)}>
      <div className="flex items-baseline justify-between text-sm">
        <span className="font-medium text-foreground">
          Wave 1 onchain mints: {totalMinted.toLocaleString()} / {phaseClaimLimit.toLocaleString()}
        </span>
        <span className="text-muted-foreground tabular-nums">{complete ? "Mint allocation complete" : `${remaining.toLocaleString()} mint slots remain`}</span>
      </div>
      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full border border-border/60 bg-muted-foreground/20" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
        <div className="h-full rounded-full bg-primary transition-[width] duration-150" style={{ width: `${visiblePct}%` }} />
      </div>
    </div>
  );
}
