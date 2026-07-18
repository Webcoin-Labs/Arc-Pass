import { useState } from "react";
import { Wallet as WalletIcon, ArrowLeft, LockKeyhole, Loader2 } from "lucide-react";
import { useAccount } from "wagmi";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { MintRequestMintMethod, MintRequestNetwork } from "@workspace/api-client-react";

type Screen = "choice" | "connect";

export interface MintParams {
  mintMethod: MintRequestMintMethod;
  walletAddress: string;
  network: MintRequestNetwork;
}

export function MintModal({
  open,
  onOpenChange,
  network,
  onMint,
  isPending,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  network: MintRequestNetwork;
  onMint: (params: MintParams) => void;
  isPending: boolean;
}) {
  const [screen, setScreen] = useState<Screen>("choice");
  const { address, isConnected } = useAccount();
  const { openConnectModal } = useConnectModal();

  const connectedAddress = screen === "connect" && isConnected ? address ?? null : null;

  const handleClose = (next: boolean) => {
    if (!next) setScreen("choice");
    onOpenChange(next);
  };

  const handleConnect = () => {
    setScreen("connect");
    if (!isConnected) openConnectModal?.();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        {screen === "choice" && (
          <>
            <DialogHeader>
              <DialogTitle>Mint Onchain</DialogTitle>
              <DialogDescription>Mint this soulbound credential to a wallet whose ownership you have already verified.</DialogDescription>
            </DialogHeader>
            <div className="flex flex-col gap-3 py-2">
              <button
                type="button"
                onClick={handleConnect}
                className="flex items-start gap-3 rounded-xl border p-4 text-left transition-colors hover:border-primary hover:bg-accent/50"
              >
                <WalletIcon className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
                <span>
                  <span className="block text-sm font-medium">Connect Wallet</span>
                  <span className="block text-xs text-muted-foreground">The connected address must already appear as ownership verified in your Arc Pass profile.</span>
                </span>
              </button>
              <div className="flex items-start gap-3 rounded-xl border border-amber-500/25 bg-amber-500/8 p-4 text-sm text-muted-foreground">
                <LockKeyhole className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" aria-hidden="true" />
                <p>Founder and Builder Passes cannot be transferred after minting. Verify the destination wallet carefully.</p>
              </div>
            </div>
          </>
        )}

        {screen === "connect" && (
          <>
            <DialogHeader>
              <button type="button" onClick={() => setScreen("choice")} className="mb-1 flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
                <ArrowLeft className="h-3 w-3" /> Back
              </button>
              <DialogTitle>Connect Wallet</DialogTitle>
              <DialogDescription>Choose a wallet to connect the destination address.</DialogDescription>
            </DialogHeader>
            <div className="py-4">
              {connectedAddress ? (
                <div className="space-y-4">
                  <div className="rounded-lg border bg-muted/40 p-3 text-center font-mono text-sm tabular-nums">{connectedAddress}</div>
                  <Button
                    className="w-full"
                    disabled={isPending}
                    onClick={() => onMint({ mintMethod: "wallet_connect", walletAddress: connectedAddress, network })}
                  >
                    {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Confirm &amp; Mint
                  </Button>
                </div>
              ) : (
                <Button variant="outline" className="w-full" onClick={handleConnect}>
                  Open wallet picker
                </Button>
              )}
            </div>
          </>
        )}

      </DialogContent>
    </Dialog>
  );
}
