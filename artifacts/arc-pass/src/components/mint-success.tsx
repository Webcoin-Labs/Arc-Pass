import { CheckCircle2, Download, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { abbreviateAddress, formatDate, formatNetworkLabel, explorerTxUrl } from "@/lib/format";

export function MintSuccess({
  tokenId,
  destinationWallet,
  network,
  transactionHash,
  issuedAt,
  onViewPass,
  onDownload,
  className,
}: {
  tokenId?: string | null;
  destinationWallet?: string | null;
  network?: string | null;
  transactionHash?: string | null;
  issuedAt?: string | null;
  onViewPass: () => void;
  onDownload: () => void;
  className?: string;
}) {
  const txUrl = explorerTxUrl(network, transactionHash);

  return (
    <div className={className}>
      <div className="mb-6 flex flex-col items-center text-center">
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-success/15">
          <CheckCircle2 className="h-7 w-7 text-success" aria-hidden="true" />
        </div>
        <h2 className="text-2xl font-bold">Your Arc Pass is now onchain.</h2>
        <p className="mt-1 text-muted-foreground">Pass claimed successfully.</p>
      </div>

      <dl className="grid grid-cols-2 gap-4 rounded-2xl border bg-card p-5 font-mono text-sm tabular-nums">
        <div>
          <dt className="text-xs font-sans text-muted-foreground">Token ID</dt>
          <dd className="mt-0.5">{tokenId ?? "—"}</dd>
        </div>
        <div>
          <dt className="text-xs font-sans text-muted-foreground">Network</dt>
          <dd className="mt-0.5 font-sans">{formatNetworkLabel(network)}</dd>
        </div>
        <div className="col-span-2">
          <dt className="text-xs font-sans text-muted-foreground">Destination wallet</dt>
          <dd className="mt-0.5 truncate">{destinationWallet ? abbreviateAddress(destinationWallet, 6) : "—"}</dd>
        </div>
        <div className="col-span-2">
          <dt className="text-xs font-sans text-muted-foreground">Issue date</dt>
          <dd className="mt-0.5 font-sans">{formatDate(issuedAt)}</dd>
        </div>
      </dl>

      <div className="mt-6 grid grid-cols-2 gap-3">
        <Button variant="outline" onClick={onDownload}>
          <Download className="mr-2 h-4 w-4" /> Download Pass
        </Button>
        <Button onClick={onViewPass}>View Pass</Button>
      </div>
      {txUrl && (
        <Button variant="ghost" className="mt-2 w-full" asChild>
          <a href={txUrl} target="_blank" rel="noreferrer">
            <ExternalLink className="mr-2 h-4 w-4" /> View Onchain
          </a>
        </Button>
      )}
    </div>
  );
}
