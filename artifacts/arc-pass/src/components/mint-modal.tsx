import { useState } from "react";
import { Wallet as WalletIcon, AlertTriangle, Loader2, ArrowLeft, LockKeyhole } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { connectInjectedWallet } from "@/lib/wallet";
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
  const [connectedAddress, setConnectedAddress] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [connectError, setConnectError] = useState<string | null>(null);

  const reset = () => {
    setScreen("choice");
    setConnectedAddress(null);
    setConnectError(null);
  };

  const handleClose = (next: boolean) => {
    if (!next) reset();
    onOpenChange(next);
  };

  const handleConnect = async () => {
    setScreen("connect");
    setConnecting(true);
    setConnectError(null);
    try {
      const address = await connectInjectedWallet();
      setConnectedAddress(address);
    } catch (err) {
      setConnectError(err instanceof Error ? err.message : "Couldn't connect a wallet");
    } finally {
      setConnecting(false);
    }
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
              <DialogDescription>Approve the connection request in your wallet extension.</DialogDescription>
            </DialogHeader>
            <div className="py-4">
              {connecting && (
                <div className="flex flex-col items-center gap-3 py-6 text-center">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  <p className="text-sm text-muted-foreground">Waiting for wallet approval…</p>
                </div>
              )}
              {connectError && (
                <Alert variant="destructive" className="mb-4">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Connection failed</AlertTitle>
                  <AlertDescription>{connectError}</AlertDescription>
                </Alert>
              )}
              {connectedAddress && !connecting && (
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
              )}
              {connectError && (
                <Button variant="outline" className="w-full" onClick={handleConnect}>
                  Try again
                </Button>
              )}
            </div>
          </>
        )}

      </DialogContent>
    </Dialog>
  );
}
