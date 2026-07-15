import { cn } from "@/lib/utils";

export function SupplyIndicator({
  totalIssued,
  maximumSupply,
  className,
}: {
  totalIssued: number;
  maximumSupply: number;
  className?: string;
}) {
  const pct = Math.min(100, Math.round((totalIssued / maximumSupply) * 100));
  const remaining = Math.max(maximumSupply - totalIssued, 0);
  const complete = remaining === 0;

  return (
    <div className={cn("w-full", className)}>
      <div className="flex items-baseline justify-between text-sm">
        <span className="font-medium text-foreground">
          {totalIssued.toLocaleString()} of {maximumSupply.toLocaleString()} lifetime Onchain Builder Passes issued
        </span>
        <span className="text-muted-foreground tabular-nums">{complete ? "Allocation complete" : `${remaining.toLocaleString()} remaining`}</span>
      </div>
      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
        <div className="h-full origin-left rounded-full bg-primary transition-transform duration-150" style={{ transform: `scaleX(${pct / 100})` }} />
      </div>
    </div>
  );
}
