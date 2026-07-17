import { cn } from "@/lib/utils";

export function DiscordIcon({ className }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn("inline-block shrink-0 bg-current", className)}
      style={{
        WebkitMask: "url(/logo/discord-logo.svg) center / contain no-repeat",
        mask: "url(/logo/discord-logo.svg) center / contain no-repeat",
      }}
    />
  );
}
