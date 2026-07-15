import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BuilderPassCard, type BuilderPassCardData } from "@/components/builder-pass-card";
import type { BuilderTier } from "@workspace/api-client-react";

export function PassComparison({
  current,
  proposedTier,
  onConfirm,
  isPending,
  className,
}: {
  current: BuilderPassCardData;
  proposedTier: BuilderTier;
  onConfirm: () => void;
  isPending: boolean;
  className?: string;
}) {
  return (
    <div className={className}>
      <div className="mb-6 text-center">
        <h2 className="text-2xl font-bold">Your verified activity now qualifies for {proposedTier.name}.</h2>
        <p className="mt-2 text-muted-foreground">Upgrade your existing Onchain Builder Pass. Your identity and pass number remain unchanged.</p>
      </div>

      <div className="flex flex-col items-center justify-center gap-4 sm:flex-row sm:gap-6">
        <div className="flex flex-col items-center gap-2">
          <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Current</span>
          <BuilderPassCard data={current} interactive={false} className="max-w-[220px] opacity-80" />
        </div>

        <ArrowRight className="h-6 w-6 shrink-0 rotate-90 text-muted-foreground sm:rotate-0" aria-hidden="true" />

        <div className="flex flex-col items-center gap-2">
          <span className="text-xs font-medium uppercase tracking-wide text-primary">Upgraded</span>
          <BuilderPassCard data={{ ...current, currentTier: proposedTier }} interactive={false} className="max-w-[220px]" />
        </div>
      </div>

      <Button size="lg" className="mt-8 h-12 w-full" onClick={onConfirm} disabled={isPending}>
        {isPending ? "Confirming…" : `Claim ${proposedTier.name} Upgrade`}
      </Button>
    </div>
  );
}
