import { useCallback, useEffect, useRef, useState } from "react";
import { Wallet as WalletIcon, ArrowLeft, LockKeyhole, Loader2, TriangleAlert } from "lucide-react";
import { useAccount, useChainId, useSwitchChain } from "wagmi";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { arcTestnet } from "@/lib/wallet-provider";
import type { MintRequestMintMethod, MintRequestNetwork } from "@workspace/api-client-react";
import { toast } from "sonner";

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
  const chainId = useChainId();
  const { connectModalOpen, openConnectModal } = useConnectModal();
  const { switchChainAsync, isPending: isSwitchingChain } = useSwitchChain();
  const automaticSwitchKey = useRef<string | null>(null);

  const connectedAddress = screen === "connect" && isConnected ? address ?? null : null;
  const isArcTestnet = !!connectedAddress && chainId === arcTestnet.id;

  const switchToArcTestnet = useCallback(async () => {
    try {
      await switchChainAsync({ chainId: arcTestnet.id });
      toast.success("Connected to Arc Testnet.");
      return true;
    } catch {
      toast.error("Switch to Arc Testnet in your wallet to continue.");
      return false;
    }
  }, [switchChainAsync]);

  useEffect(() => {
    if (!open || screen !== "connect" || connectModalOpen || !connectedAddress || isArcTestnet) return;
    const promptKey = `${connectedAddress.toLowerCase()}:${chainId}`;
    if (automaticSwitchKey.current === promptKey) return;
    automaticSwitchKey.current = promptKey;
    void switchToArcTestnet();
  }, [chainId, connectModalOpen, connectedAddress, isArcTestnet, open, screen, switchToArcTestnet]);

  const handleClose = (next: boolean) => {
    if (!next) {
      setScreen("choice");
      automaticSwitchKey.current = null;
    }
    onOpenChange(next);
  };

  const handleConnect = () => {
    setScreen("connect");
    if (!isConnected) openConnectModal?.();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose} modal={!connectModalOpen}>
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
                  {!isArcTestnet ? (
                    <>
                      <div className="flex items-start gap-3 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-muted-foreground">
                        <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" aria-hidden="true" />
                        <p>Arc Pass is minted on Arc Testnet. Approve the network switch in your wallet before continuing.</p>
                      </div>
                      <Button className="w-full" onClick={() => void switchToArcTestnet()} disabled={isSwitchingChain}>
                        {isSwitchingChain ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                        {isSwitchingChain ? "Check your wallet" : "Switch to Arc Testnet"}
                      </Button>
                    </>
                  ) : (
                    <Button
                      className="w-full"
                      disabled={isPending}
                      onClick={() => onMint({ mintMethod: "wallet_connect", walletAddress: connectedAddress, network })}
                    >
                      {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                      Confirm &amp; Mint
                    </Button>
                  )}
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
