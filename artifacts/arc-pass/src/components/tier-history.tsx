import { formatDate, explorerTxUrl } from "@/lib/format";
import { abbreviateAddress } from "@/lib/format";
import type { BuilderTierHistoryEntry } from "@workspace/api-client-react";

export function TierHistory({ entries, network, className }: { entries: BuilderTierHistoryEntry[]; network?: string | null; className?: string }) {
  if (entries.length === 0) {
    return <p className={className + " text-sm text-muted-foreground"}>No tier history yet.</p>;
  }

  return (
    <ol className={className}>
      {entries.map((entry, i) => {
        const txUrl = explorerTxUrl(network, entry.transactionHash);
        return (
          <li key={i} className="relative border-l border-border py-1 pl-6 last:pb-0">
            <div className="absolute -left-[5px] top-2.5 h-2.5 w-2.5 rounded-full border-2 border-primary bg-background" />
            <p className="text-sm font-medium">
              {entry.previousTierName ? `${entry.previousTierName} → ${entry.newTierName}` : `${entry.newTierName} issued`}
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">{formatDate(entry.upgradedAt)}</p>
            {txUrl && (
              <a href={txUrl} target="_blank" rel="noreferrer" className="mt-1 inline-block font-mono text-xs text-primary hover:underline">
                Tx: {abbreviateAddress(entry.transactionHash ?? "", 6)}
              </a>
            )}
          </li>
        );
      })}
    </ol>
  );
}
