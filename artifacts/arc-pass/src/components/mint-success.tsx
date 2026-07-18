import { CheckCircle2, Download, ExternalLink, Share2 } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { useEffect, useState } from "react";
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
  onShare,
  className,
}: {
  tokenId?: string | null;
  destinationWallet?: string | null;
  network?: string | null;
  transactionHash?: string | null;
  issuedAt?: string | null;
  onViewPass: () => void;
  onDownload: () => void;
  onShare?: () => void;
  className?: string;
}) {
  const txUrl = explorerTxUrl(network, transactionHash);
  const reduceMotion = useReducedMotion();
  const celebrationKey = `arc-pass-mint-celebrated:${transactionHash ?? tokenId ?? "confirmed"}`;
  const [celebrate] = useState(() => {
    try { return window.localStorage.getItem(celebrationKey) !== "1"; } catch { return true; }
  });

  useEffect(() => {
    if (!celebrate) return;
    try { window.localStorage.setItem(celebrationKey, "1"); } catch { /* Storage can be unavailable in private contexts. */ }
  }, [celebrate, celebrationKey]);

  return (
    <div className={className}>
      <div className="mb-6 flex flex-col items-center text-center">
        <motion.div
          initial={reduceMotion || !celebrate ? false : { opacity: 0, scale: 0.72 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: "spring", stiffness: 220, damping: 16 }}
          className="relative mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-success/15"
        >
          {!reduceMotion && celebrate && <motion.span className="pointer-events-none absolute inset-0 rounded-full border border-success/45" initial={{ opacity: 0.75, scale: 0.75 }} animate={{ opacity: 0, scale: 1.65 }} transition={{ duration: 1.1, ease: "easeOut" }} aria-hidden="true" />}
          {!reduceMotion && celebrate && Array.from({ length: 8 }).map((_, index) => {
            const angle = (Math.PI * 2 * index) / 8;
            return <motion.span key={index} className="pointer-events-none absolute size-1.5 rounded-full bg-success" initial={{ opacity: 0, x: 0, y: 0, scale: 0 }} animate={{ opacity: [0, 1, 0], x: Math.cos(angle) * 54, y: Math.sin(angle) * 54, scale: [0, 1, 0.7] }} transition={{ duration: 0.85, delay: 0.08 + index * 0.025, ease: "easeOut" }} aria-hidden="true" />;
          })}
          <CheckCircle2 className="h-7 w-7 text-success" aria-hidden="true" />
        </motion.div>
        <h2 className="text-2xl font-bold">Your Arc Pass is now onchain.</h2>
        <p className="mt-1 text-muted-foreground">Your credential is minted and recorded onchain.</p>
      </div>

      <dl className="grid grid-cols-2 gap-4 rounded-2xl border bg-card p-5 font-mono text-sm tabular-nums">
        <div>
          <dt className="text-xs font-sans text-muted-foreground">Token ID</dt>
          <dd className="mt-0.5">{tokenId ?? "Token ID pending indexing"}</dd>
        </div>
        <div>
          <dt className="text-xs font-sans text-muted-foreground">Network</dt>
          <dd className="mt-0.5 font-sans">{formatNetworkLabel(network)}</dd>
        </div>
        <div className="col-span-2">
          <dt className="text-xs font-sans text-muted-foreground">Destination wallet</dt>
          <dd className="mt-0.5 truncate">{destinationWallet ? abbreviateAddress(destinationWallet, 6) : "Destination wallet unavailable"}</dd>
        </div>
        <div className="col-span-2">
          <dt className="text-xs font-sans text-muted-foreground">Issue date</dt>
          <dd className="mt-0.5 font-sans">{formatDate(issuedAt)}</dd>
        </div>
        <div className="col-span-2">
          <dt className="text-xs font-sans text-muted-foreground">Transferability</dt>
          <dd className="mt-0.5 font-sans font-semibold text-success">Permanent and non-transferable</dd>
        </div>
      </dl>

      <div className="mt-6 grid grid-cols-2 gap-3">
        <Button variant="outline" onClick={onDownload}>
          <Download className="mr-2 h-4 w-4" /> Download Pass
        </Button>
        <Button onClick={onViewPass}>View Pass</Button>
      </div>
      {onShare && (
        <Button variant="outline" className="mt-3 w-full" onClick={onShare}>
          <Share2 className="mr-2 h-4 w-4" aria-hidden="true" /> Share on X
        </Button>
      )}
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
