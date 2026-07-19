import { NetworkMark } from "@/components/network-mark";
import { formatNetworkLabel } from "@/lib/format";
import { cn } from "@/lib/utils";

interface PassNetworkIdentityProps {
  network?: string | null;
  className?: string;
}

export function PassNetworkIdentity({ network, className }: PassNetworkIdentityProps) {
  if (network?.toLowerCase() === "arc") {
    return (
      <img
        src="/logo/Arc_Logo_White.svg"
        alt="Arc"
        className={cn("h-3 w-auto max-w-full object-contain object-left", className)}
      />
    );
  }

  return (
    <span className="inline-flex min-w-0 items-center gap-1">
      <NetworkMark network={network} className="size-3 shrink-0 rounded-full" />
      <span className="truncate">{formatNetworkLabel(network)}</span>
    </span>
  );
}
