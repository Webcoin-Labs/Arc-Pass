import { useState } from "react";
import { SiDiscord, SiX } from "react-icons/si";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import type { EligibilityQueryPlatform } from "@workspace/api-client-react";

export function EligibilityChecker({
  onSubmit,
  isPending,
  className,
  variant = "default",
}: {
  onSubmit: (params: { identifier: string; platform: EligibilityQueryPlatform }) => void;
  isPending: boolean;
  className?: string;
  variant?: "default" | "immersive";
}) {
  const [platform, setPlatform] = useState<EligibilityQueryPlatform>("x");
  const [identifier, setIdentifier] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = identifier.trim().replace(/^@/, "");
    if (!trimmed) return;
    onSubmit({ identifier: trimmed, platform });
  };

  const immersive = variant === "immersive";

  return (
    <form onSubmit={handleSubmit} className={className}>
      <Tabs value={platform} onValueChange={(v) => setPlatform(v as EligibilityQueryPlatform)} className="w-full">
        <TabsList className={cn(
          "grid h-12 w-full grid-cols-2 p-1",
          immersive ? "mx-auto max-w-xs rounded-full border border-white/10 bg-black/50 text-white/45 backdrop-blur-md" : "rounded-none bg-black/5 text-black/50",
        )}>
          <TabsTrigger value="x" className={cn(
            "h-10 gap-2 text-xs sm:text-sm data-[state=active]:shadow-none",
            immersive ? "rounded-full text-white/50 data-[state=active]:bg-white data-[state=active]:text-[#070912]" : "rounded-none data-[state=active]:bg-black data-[state=active]:text-white",
          )}>
            <SiX className="h-3.5 w-3.5" aria-hidden="true" /> X Username
          </TabsTrigger>
          <TabsTrigger value="discord" className={cn(
            "h-10 gap-2 text-xs sm:text-sm data-[state=active]:shadow-none",
            immersive ? "rounded-full text-white/50 data-[state=active]:bg-white data-[state=active]:text-[#070912]" : "rounded-none data-[state=active]:bg-black data-[state=active]:text-white",
          )}>
            <SiDiscord className="h-3.5 w-3.5" aria-hidden="true" /> Discord Username
          </TabsTrigger>
        </TabsList>
      </Tabs>

      <div className={cn(
        "mt-5 flex flex-col gap-3 sm:flex-row",
        immersive && "rounded-3xl border border-white/15 bg-[#11131a]/95 p-2 shadow-2xl backdrop-blur-xl sm:rounded-full",
      )}>
        <label className="sr-only" htmlFor="eligibility-identifier">
          {platform === "x" ? "Enter your X username" : "Enter your Discord username"}
        </label>
        <Input
          id="eligibility-identifier"
          placeholder={platform === "x" ? "Enter your X username" : "Enter your Discord username"}
          value={identifier}
          onChange={(e) => setIdentifier(e.target.value)}
          className={cn(
            "h-12",
            immersive ? "rounded-2xl border-0 bg-transparent px-4 text-base text-white placeholder:text-white/45 focus-visible:ring-white/60 sm:h-14 sm:rounded-full sm:px-5" : "rounded-none border-black bg-white text-black placeholder:text-black/40 focus-visible:ring-black",
          )}
          autoComplete="off"
        />
        <Button type="submit" size="lg" className={cn(
          "h-12 shrink-0 px-6",
          immersive ? "cursor-pointer rounded-2xl bg-[#4f63ff] text-white hover:bg-[#4055ef] sm:h-14 sm:rounded-full sm:px-9" : "rounded-none bg-black text-white hover:bg-black/80",
        )} disabled={!identifier.trim() || isPending}>
          Check Eligibility
        </Button>
      </div>
      <p className={cn("mt-4 text-xs leading-5", immersive ? "text-center text-white/45" : "text-black/50")}>Checking a username provides a privacy-safe preview. Identity verification is required before claiming.</p>
    </form>
  );
}
