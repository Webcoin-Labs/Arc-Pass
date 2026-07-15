import { cn } from "@/lib/utils";

interface TierLike {
  name: string;
  emblemUrl?: string | null;
  accentColor?: string | null;
}

const sizeMap = {
  sm: "h-5 w-5 text-[10px]",
  md: "h-8 w-8 text-xs",
  lg: "h-12 w-12 text-base",
} as const;

export function TierEmblem({ tier, size = "md", className }: { tier: TierLike; size?: keyof typeof sizeMap; className?: string }) {
  const accent = tier.accentColor ?? "hsl(var(--primary))";
  if (tier.emblemUrl) {
    return (
      <span
        className={cn("inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-card", sizeMap[size], className)}
        style={{ borderColor: accent }}
      >
        <img src={tier.emblemUrl} alt="" className="h-full w-full object-contain p-0.5" />
      </span>
    );
  }
  return (
    <span
      className={cn("inline-flex shrink-0 items-center justify-center rounded-full border font-semibold uppercase", sizeMap[size], className)}
      style={{ borderColor: accent, color: accent, backgroundColor: `color-mix(in srgb, ${accent} 14%, transparent)` }}
      aria-hidden="true"
    >
      {tier.name.charAt(0)}
    </span>
  );
}

export function TierBadge({ tier, className }: { tier: TierLike; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full border border-border bg-card py-0.5 pl-0.5 pr-2.5 text-xs font-medium", className)}>
      <TierEmblem tier={tier} size="sm" />
      {tier.name}
    </span>
  );
}
