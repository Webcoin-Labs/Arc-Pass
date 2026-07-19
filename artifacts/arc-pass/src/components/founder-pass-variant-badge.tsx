import { cn } from "@/lib/utils";

export function founderVariantLabel(variant: "normal" | "premium_black"): string {
  return variant === "premium_black" ? "Premier Founder" : "Emerging Founder";
}

export function FounderPassVariantBadge({ variant, className }: { variant: "normal" | "premium_black"; className?: string }) {
  const isPremium = variant === "premium_black";
  return (
    <span
      className={cn(
        "inline-flex max-w-full items-center gap-2 whitespace-nowrap rounded-full border font-semibold uppercase tracking-[0.12em]",
        isPremium
          ? "border-[#e0b768]/60 bg-[#150e08]/80 text-[#f6d38a] shadow-[inset_0_1px_rgba(255,255,255,.08)]"
          : "border-[#8fb2ff]/50 bg-[#09266e]/75 text-[#e4edff] shadow-[inset_0_1px_rgba(255,255,255,.08)]",
        className,
      )}
    >
      <img
        src={isPremium ? "/logo/premierfounderpass.webp" : "/logo/emergingfounder.webp"}
        alt=""
        className="size-4 shrink-0 object-contain sm:size-5"
        aria-hidden="true"
      />
      {founderVariantLabel(variant)}
    </span>
  );
}
