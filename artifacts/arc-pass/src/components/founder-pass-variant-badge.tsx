import { Crown, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

export function founderVariantLabel(variant: "normal" | "premium_black"): string {
  return variant === "premium_black" ? "Premium Founder" : "Normal Founder";
}

export function FounderPassVariantBadge({ variant, className }: { variant: "normal" | "premium_black"; className?: string }) {
  const isPremium = variant === "premium_black";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border font-semibold uppercase tracking-[0.12em]",
        isPremium ? "border-[#bd9bff]/35 bg-[#7c4dff]/15 text-[#eadfff]" : "border-[#78c8ff]/35 bg-[#3157ee]/15 text-[#dce8ff]",
        className,
      )}
    >
      {isPremium ? <Crown className="h-3 w-3" aria-hidden="true" /> : <Sparkles className="h-3 w-3" aria-hidden="true" />}
      {founderVariantLabel(variant)}
    </span>
  );
}
