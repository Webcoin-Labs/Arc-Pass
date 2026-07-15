import { Gem, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

export function FounderPassVariantBadge({ variant, className }: { variant: "normal" | "premium_black"; className?: string }) {
  const isPremium = variant === "premium_black";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium",
        isPremium ? "border-white/20 bg-black text-white" : "border-border bg-card text-foreground",
        className,
      )}
    >
      {isPremium ? <Gem className="h-3 w-3" aria-hidden="true" /> : <ShieldCheck className="h-3 w-3" aria-hidden="true" />}
      {isPremium ? "Premium Black" : "Normal"}
    </span>
  );
}
