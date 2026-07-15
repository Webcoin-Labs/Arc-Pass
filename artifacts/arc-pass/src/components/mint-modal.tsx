import { useState } from "react";
import { Wallet as WalletIcon, PenLine, AlertTriangle, Loader2, ArrowLeft } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { connectInjectedWallet, validateWalletAddress } from "@/lib/wallet";
import { abbreviateAddress } from "@/lib/format";
import type { MintRequestMintMethod, MintRequestNetwork } from "@workspace/api-client-react";

type Screen = "choice" | "connect" | "manual";

export interface MintParams {
  mintMethod: MintRequestMintMethod;
  walletAddress: string;
  network: MintRequestNetwork;
  confirmed?: boolean;
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
  const [manualAddress, setManualAddress] = useState("");
  const [confirmed, setConfirmed] = useState(false);

  const reset = () => {
    setScreen("choice");
    setConnectedAddress(null);
    setConnectError(null);
    setManualAddress("");
    setConfirmed(false);
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

  const manualValidation = validateWalletAddress(manualAddress);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        {screen === "choice" && (
          <>
            <DialogHeader>
              <DialogTitle>Mint Onchain</DialogTitle>
              <DialogDescription>Record your credential onchain by choosing a destination wallet.</DialogDescription>
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
                  <span className="block text-xs text-muted-foreground">Connect a wallet and mint the credential directly to it.</span>
                </span>
              </button>
              <button
                type="button"
                onClick={() => setScreen("manual")}
                className="flex items-start gap-3 rounded-xl border p-4 text-left transition-colors hover:border-primary hover:bg-accent/50"
              >
                <PenLine className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
                <span>
                  <span className="block text-sm font-medium">Enter Wallet Address</span>
                  <span className="block text-xs text-muted-foreground">Send the credential to an address without connecting that wallet.</span>
                </span>
              </button>
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

        {screen === "manual" && (
          <>
            <DialogHeader>
              <button type="button" onClick={() => setScreen("choice")} className="mb-1 flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
                <ArrowLeft className="h-3 w-3" /> Back
              </button>
              <DialogTitle>Enter Wallet Address</DialogTitle>
              <DialogDescription>Send to a wallet address.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label htmlFor="manual-wallet">Destination address</Label>
                <Input id="manual-wallet" placeholder="0x..." className="h-12 font-mono" value={manualAddress} onChange={(e) => setManualAddress(e.target.value)} />
                {manualAddress.trim() && !manualValidation.valid && <p className="text-xs text-destructive">This doesn't look like a valid address.</p>}
                {manualValidation.valid && manualValidation.checksummed && (
                  <p className="font-mono text-xs text-muted-foreground">Preview: {abbreviateAddress(manualValidation.checksummed, 6)}</p>
                )}
              </div>

              <Alert variant="destructive" className="border-destructive/30 bg-destructive/5">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Warning</AlertTitle>
                <AlertDescription>
                  This credential will be delivered directly to the address entered. Verify the address carefully. Onchain transfers cannot be reversed.
                </AlertDescription>
              </Alert>

              <div className="flex items-start gap-3 rounded-lg border bg-muted/40 p-3">
                <Checkbox id="confirm-address" checked={confirmed} onCheckedChange={(c) => setConfirmed(c === true)} className="mt-0.5" />
                <Label htmlFor="confirm-address" className="text-sm font-normal leading-snug">
                  I confirm this address is correct and I intend to send this credential to it.
                </Label>
              </div>

              <Button
                className="w-full"
                disabled={!manualValidation.valid || !confirmed || isPending}
                onClick={() =>
                  manualValidation.checksummed &&
                  onMint({ mintMethod: "manual_address", walletAddress: manualValidation.checksummed, network, confirmed: true })
                }
              >
                {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Confirm &amp; Mint
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
