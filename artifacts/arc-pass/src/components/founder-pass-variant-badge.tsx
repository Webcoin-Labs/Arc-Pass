import { Crown, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

export function founderVariantLabel(variant: "normal" | "premium_black"): string {
  return variant === "premium_black" ? "Premier Founder" : "Emerging Founder";
}

export function FounderPassVariantBadge({ variant, className }: { variant: "normal" | "premium_black"; className?: string }) {
  const isPremium = variant === "premium_black";
  return (
    <span
      className={cn(
        "inline-flex max-w-full items-center gap-1.5 whitespace-nowrap rounded-full border font-semibold uppercase tracking-[0.12em]",
        isPremium
          ? "border-[#d7bc91]/55 bg-[#06174f]/75 text-[#f4e7d3] shadow-[inset_0_1px_rgba(255,255,255,.08)]"
          : "border-[#8fb2ff]/50 bg-[#09266e]/75 text-[#e4edff] shadow-[inset_0_1px_rgba(255,255,255,.08)]",
        className,
      )}
    >
      {isPremium ? <Crown className="h-3 w-3" aria-hidden="true" /> : <Sparkles className="h-3 w-3" aria-hidden="true" />}
      {founderVariantLabel(variant)}
    </span>
  );
}
