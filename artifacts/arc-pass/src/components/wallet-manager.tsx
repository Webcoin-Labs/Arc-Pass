import { useState } from "react";
import { Wallet as WalletIcon, X, Loader2, ShieldCheck, Star } from "lucide-react";
import { useAccount, useSignMessage } from "wagmi";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { abbreviateAddress } from "@/lib/format";
import { useCreateWalletChallenge, useVerifyWalletOwnership, useRemoveUserWallet } from "@workspace/api-client-react";
import type { Wallet } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

const MAX_WALLETS = 3;

export function WalletManager({ wallets, className }: { wallets: Wallet[]; className?: string }) {
  const queryClient = useQueryClient();
  const { address, isConnected } = useAccount();
  const { openConnectModal } = useConnectModal();
  const { signMessageAsync } = useSignMessage();
  const createChallenge = useCreateWalletChallenge();
  const verifyOwnership = useVerifyWalletOwnership();
  const removeWallet = useRemoveUserWallet();
  const [stage, setStage] = useState<"idle" | "challenge" | "signature" | "verifying">("idle");

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ["/api/users/me/wallets"] });
    void queryClient.invalidateQueries({ queryKey: ["/api/passes/me"] });
  };

  const handleVerify = async () => {
    if (!isConnected || !address) { openConnectModal?.(); return; }
    if (wallets.some((wallet) => wallet.address.toLowerCase() === address.toLowerCase())) {
      toast.info("This wallet is already ownership-verified."); return;
    }
    try {
      setStage("challenge");
      const challenge = await createChallenge.mutateAsync({ data: { address } });
      setStage("signature");
      const signature = await signMessageAsync({ message: challenge.message });
      setStage("verifying");
      await verifyOwnership.mutateAsync({ data: { challengeId: challenge.challengeId, message: challenge.message, signature } });
      invalidate();
      toast.success("Wallet ownership verified.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Wallet ownership could not be verified.");
    } finally {
      setStage("idle");
    }
  };

  const pending = stage !== "idle";
  return (
    <div className={className} aria-busy={pending}>
      <ul className="space-y-2" aria-label="Ownership-verified wallets">
        {wallets.map((wallet) => (
          <li key={wallet.id} className="flex min-h-14 items-center justify-between rounded-xl border bg-card px-4 py-3">
            <div className="flex min-w-0 items-center gap-3">
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-emerald-500/10 text-emerald-600">
                <ShieldCheck className="h-4 w-4" aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm tabular-nums">{abbreviateAddress(wallet.address)}</span>
                  {wallet.isPrimary && <Badge variant="info" className="text-[10px]"><Star className="mr-1 h-3 w-3" aria-hidden="true" />Primary</Badge>}
                </div>
                <p className="text-xs text-muted-foreground">Ownership verified</p>
              </div>
            </div>
            <Button variant="ghost" size="icon" className="h-11 w-11" onClick={() => removeWallet.mutate({ walletId: wallet.id }, { onSuccess: invalidate })} aria-label={`Remove wallet ${abbreviateAddress(wallet.address)}`}>
              <X className="h-4 w-4" aria-hidden="true" />
            </Button>
          </li>
        ))}
      </ul>

      {wallets.length < MAX_WALLETS ? (
        <div className="mt-4">
          <Button type="button" variant="secondary" className="h-12 w-full gap-2" onClick={handleVerify} disabled={pending}>
            {pending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <WalletIcon className="h-4 w-4" aria-hidden="true" />}
            {!isConnected ? "Connect wallet" : stage === "signature" ? "Check your wallet to sign" : pending ? "Verifying ownership…" : "Verify connected wallet"}
          </Button>
          <p className="mt-3 text-xs leading-5 text-muted-foreground">
            Webcoin Labs receives your public address and signed ownership proof. We never receive private keys or seed phrases. {wallets.length}/{MAX_WALLETS} verified.
          </p>
          <span className="sr-only" role="status" aria-live="polite">{pending ? "Wallet ownership verification is in progress." : ""}</span>
        </div>
      ) : <p className="mt-3 text-xs text-muted-foreground">Three-wallet limit reached. Remove one to verify another.</p>}
    </div>
  );
}
