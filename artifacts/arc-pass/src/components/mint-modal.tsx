import { useCallback, useEffect, useRef, useState } from "react";
import {
  Check,
  Fingerprint,
  Loader2,
  LockKeyhole,
  RefreshCw,
  ShieldCheck,
  TriangleAlert,
  Wallet as WalletIcon,
} from "lucide-react";
import { useAccount, useChainId, useDisconnect, useSignMessage, useSwitchChain } from "wagmi";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import { useQueryClient } from "@tanstack/react-query";
import {
  getListUserWalletsQueryKey,
  useCreateWalletChallenge,
  useListUserWallets,
  useVerifyWalletOwnership,
} from "@workspace/api-client-react";
import type { MintRequestMintMethod, MintRequestNetwork } from "@workspace/api-client-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { abbreviateAddress } from "@/lib/format";
import { arcTestnet } from "@/lib/wallet-provider";
import { toast } from "sonner";

type VerificationStage = "idle" | "challenge" | "signature" | "verifying";

export interface MintParams {
  mintMethod: MintRequestMintMethod;
  walletAddress: string;
  network: MintRequestNetwork;
}

function readableWalletError(error: unknown, fallback: string): string {
  const raw = error instanceof Error ? error.message : "";
  const message = raw.replace(/^HTTP\s+\d+\s*:\s*/i, "").trim();
  if (/non-transferable pass can only be minted/i.test(message)) {
    return "This wallet still needs an ownership signature before it can receive the pass.";
  }
  return message || fallback;
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
  onMint: (params: MintParams) => void | Promise<void>;
  isPending: boolean;
}) {
  const queryClient = useQueryClient();
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { connectModalOpen, openConnectModal } = useConnectModal();
  const { disconnectAsync } = useDisconnect();
  const { signMessageAsync } = useSignMessage();
  const { switchChainAsync, isPending: isSwitchingChain } = useSwitchChain();
  const { data: verifiedWallets = [], isLoading: walletsLoading } = useListUserWallets({
    query: { enabled: open, queryKey: getListUserWalletsQueryKey() },
  });
  const createChallenge = useCreateWalletChallenge();
  const verifyOwnership = useVerifyWalletOwnership();

  const [selectedAddress, setSelectedAddress] = useState<string | null>(null);
  const [walletPickerRequested, setWalletPickerRequested] = useState(false);
  const [verificationStage, setVerificationStage] = useState<VerificationStage>("idle");
  const [verifiedDuringFlow, setVerifiedDuringFlow] = useState<string | null>(null);
  const [flowError, setFlowError] = useState<string | null>(null);
  const pickerLaunchStarted = useRef(false);
  const pickerWasOpen = useRef(false);
  const previousOpen = useRef(false);

  const connectedAddress = isConnected && address ? address : null;
  const selectedMatchesConnection = !!selectedAddress && !!connectedAddress
    && selectedAddress.toLowerCase() === connectedAddress.toLowerCase();
  const isArcTestnet = selectedMatchesConnection && chainId === arcTestnet.id;
  const isOwnershipVerified = !!selectedAddress && (
    verifiedDuringFlow === selectedAddress.toLowerCase()
    || verifiedWallets.some((wallet) => wallet.address.toLowerCase() === selectedAddress.toLowerCase())
  );
  const walletLimitReached = !isOwnershipVerified && verifiedWallets.length >= 3;
  const verificationPending = verificationStage !== "idle";
  const activeStep = !selectedAddress ? 1 : !isOwnershipVerified ? 2 : 3;

  useEffect(() => {
    if (open && !previousOpen.current) {
      setSelectedAddress(null);
      setWalletPickerRequested(false);
      setVerificationStage("idle");
      setVerifiedDuringFlow(null);
      setFlowError(null);
      pickerLaunchStarted.current = false;
      pickerWasOpen.current = false;
    }
    previousOpen.current = open;
  }, [open]);

  useEffect(() => {
    if (!selectedAddress || selectedMatchesConnection || walletPickerRequested) return;
    setSelectedAddress(null);
    setVerifiedDuringFlow(null);
    setFlowError("The connected wallet changed. Choose the destination wallet again.");
  }, [selectedAddress, selectedMatchesConnection, walletPickerRequested]);

  useEffect(() => {
    if (!open || !walletPickerRequested || isConnected || connectModalOpen || !openConnectModal || pickerLaunchStarted.current) return;
    const frame = window.requestAnimationFrame(() => {
      pickerLaunchStarted.current = true;
      openConnectModal();
    });
    return () => window.cancelAnimationFrame(frame);
  }, [connectModalOpen, isConnected, open, openConnectModal, walletPickerRequested]);

  useEffect(() => {
    if (connectModalOpen) {
      pickerWasOpen.current = true;
      return;
    }
    if (!walletPickerRequested || !pickerWasOpen.current) return;

    setWalletPickerRequested(false);
    pickerLaunchStarted.current = false;
    pickerWasOpen.current = false;
    if (isConnected && address) {
      setSelectedAddress(address);
      setFlowError(null);
    }
  }, [address, connectModalOpen, isConnected, walletPickerRequested]);

  const switchToArcTestnet = useCallback(async () => {
    try {
      await switchChainAsync({ chainId: arcTestnet.id });
      setFlowError(null);
      toast.success("Connected to Arc Testnet.");
      return true;
    } catch (error) {
      setFlowError(readableWalletError(error, "Approve the Arc Testnet switch in your wallet to continue."));
      return false;
    }
  }, [switchChainAsync]);

  const requestWalletPicker = async () => {
    setSelectedAddress(null);
    setVerifiedDuringFlow(null);
    setFlowError(null);
    setWalletPickerRequested(true);
    pickerLaunchStarted.current = false;
    pickerWasOpen.current = false;
    if (!isConnected) return;

    try {
      await disconnectAsync();
    } catch (error) {
      setWalletPickerRequested(false);
      setFlowError(readableWalletError(error, "The previous wallet could not be disconnected. Try again."));
    }
  };

  const selectConnectedWallet = () => {
    if (!connectedAddress) return;
    setSelectedAddress(connectedAddress);
    setVerifiedDuringFlow(null);
    setFlowError(null);
  };

  const verifySelectedWallet = async () => {
    if (!selectedAddress || !connectedAddress || !selectedMatchesConnection) {
      setFlowError("Reconnect the destination wallet before verifying it.");
      return;
    }
    if (chainId !== arcTestnet.id && !(await switchToArcTestnet())) return;
    if (walletLimitReached) {
      setFlowError("You already have three ownership-verified wallets. Choose one of those wallets to mint this pass.");
      return;
    }

    try {
      setFlowError(null);
      setVerificationStage("challenge");
      const challenge = await createChallenge.mutateAsync({ data: { address: selectedAddress } });
      setVerificationStage("signature");
      const signature = await signMessageAsync({ message: challenge.message });
      setVerificationStage("verifying");
      await verifyOwnership.mutateAsync({
        data: { challengeId: challenge.challengeId, message: challenge.message, signature },
      });
      setVerifiedDuringFlow(selectedAddress.toLowerCase());
      await queryClient.invalidateQueries({ queryKey: getListUserWalletsQueryKey() });
      toast.success("Wallet ownership verified. You can mint now.");
    } catch (error) {
      setFlowError(readableWalletError(error, "Wallet ownership could not be verified. No transaction was sent."));
    } finally {
      setVerificationStage("idle");
    }
  };

  const mintToSelectedWallet = async () => {
    if (!selectedAddress || !selectedMatchesConnection) {
      setFlowError("Choose and reconnect the wallet that should receive this pass.");
      return;
    }
    if (!isArcTestnet) {
      setFlowError("Switch the connected wallet to Arc Testnet before minting.");
      return;
    }
    if (!isOwnershipVerified) {
      setFlowError("Verify ownership of this wallet before minting.");
      return;
    }

    try {
      setFlowError(null);
      await onMint({ mintMethod: "wallet_connect", walletAddress: selectedAddress, network });
    } catch (error) {
      setFlowError(readableWalletError(error, "The pass could not be minted. Please try again."));
    }
  };

  const handleOpenChange = (next: boolean) => {
    if (!next && (walletPickerRequested || connectModalOpen)) return;
    onOpenChange(next);
  };

  const verificationButtonLabel = verificationStage === "challenge"
    ? "Preparing secure challenge…"
    : verificationStage === "signature"
      ? "Sign the message in your wallet"
      : verificationStage === "verifying"
        ? "Confirming ownership…"
        : "Verify wallet ownership";

  return (
    <Dialog open={open} onOpenChange={handleOpenChange} modal={!walletPickerRequested && !connectModalOpen}>
      <DialogContent className="max-h-[calc(100dvh-1rem)] w-[calc(100%-1rem)] overflow-x-hidden overflow-y-auto border-border/70 p-0 sm:max-w-[520px]">
        <div className="border-b bg-[radial-gradient(circle_at_10%_0%,hsl(var(--primary)/.13),transparent_42%),hsl(var(--card))] px-5 pb-5 pt-6 sm:px-7">
          <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-primary">Onchain issuance</p>
          <DialogHeader className="mt-2 text-left">
            <DialogTitle className="text-2xl tracking-[-0.025em]">Choose the wallet that will hold this pass</DialogTitle>
            <DialogDescription className="max-w-md leading-6">
              A previous browser session is never selected automatically. You confirm the exact destination here.
            </DialogDescription>
          </DialogHeader>

          <ol className="mt-5 grid grid-cols-3 gap-2" aria-label="Minting progress">
            {["Choose", "Verify", "Mint"].map((label, index) => {
              const step = index + 1;
              const complete = step < activeStep;
              const active = step === activeStep;
              return (
                <li key={label} className="min-w-0">
                  <div className={`h-1 rounded-full ${complete || active ? "bg-primary" : "bg-border"}`} />
                  <div className={`mt-2 flex items-center gap-1.5 text-[11px] font-medium ${active ? "text-foreground" : complete ? "text-primary" : "text-muted-foreground"}`}>
                    <span className={`grid size-4 shrink-0 place-items-center rounded-full text-[9px] ${complete ? "bg-primary text-primary-foreground" : active ? "border border-primary text-primary" : "border text-muted-foreground"}`}>
                      {complete ? <Check className="size-2.5" aria-hidden="true" /> : step}
                    </span>
                    {label}
                  </div>
                </li>
              );
            })}
          </ol>
        </div>

        <div className="space-y-4 px-5 py-5 sm:px-7 sm:py-6">
          {!selectedAddress ? (
            connectedAddress ? (
              <section className="rounded-2xl border bg-muted/25 p-4" aria-label="Previously connected wallet">
                <div className="flex items-start gap-3">
                  <span className="grid size-11 shrink-0 place-items-center rounded-xl border bg-background text-primary shadow-sm">
                    <WalletIcon className="size-5" aria-hidden="true" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm font-semibold">Browser wallet detected</p>
                      <span className="rounded-full border px-2 py-0.5 text-[10px] font-medium text-muted-foreground">Not selected</span>
                    </div>
                    <p className="mt-1 truncate font-mono text-xs text-muted-foreground" title={connectedAddress}>{abbreviateAddress(connectedAddress)}</p>
                    <p className="mt-2 text-xs leading-5 text-muted-foreground">This came from an earlier browser session. Arc Pass will use it only if you confirm below.</p>
                  </div>
                </div>
                <div className="mt-4 grid gap-2 sm:grid-cols-2">
                  <Button type="button" onClick={selectConnectedWallet}>Use this wallet</Button>
                  <Button type="button" variant="outline" onClick={() => void requestWalletPicker()} disabled={walletPickerRequested}>
                    <RefreshCw className="mr-2 size-4" aria-hidden="true" /> Choose another wallet
                  </Button>
                </div>
              </section>
            ) : (
              <button
                type="button"
                onClick={() => void requestWalletPicker()}
                disabled={walletPickerRequested}
                className="group flex w-full items-center gap-4 rounded-2xl border bg-card p-5 text-left shadow-sm transition hover:border-primary/60 hover:bg-primary/[0.025] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-primary text-primary-foreground shadow-[0_10px_24px_hsl(var(--primary)/.22)]">
                  {walletPickerRequested ? <Loader2 className="size-5 animate-spin" aria-hidden="true" /> : <WalletIcon className="size-5" aria-hidden="true" />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold">{walletPickerRequested ? "Opening RainbowKit…" : "Choose a wallet"}</span>
                  <span className="mt-1 block text-xs leading-5 text-muted-foreground">Select Rainbow, MetaMask, Rabby, WalletConnect, or another installed wallet.</span>
                </span>
              </button>
            )
          ) : (
            <>
              <section className="overflow-hidden rounded-2xl border bg-card shadow-sm" aria-label="Selected minting wallet">
                <div className="flex items-start gap-3 border-b bg-muted/20 p-4">
                  <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                    <WalletIcon className="size-5" aria-hidden="true" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm font-semibold">Selected destination</p>
                      <button type="button" onClick={() => void requestWalletPicker()} className="text-xs font-medium text-primary underline-offset-4 hover:underline">
                        Change wallet
                      </button>
                    </div>
                    <p className="mt-1 truncate font-mono text-xs text-muted-foreground" title={selectedAddress}>{abbreviateAddress(selectedAddress)}</p>
                  </div>
                </div>

                <dl className="divide-y px-4">
                  <StatusRow
                    label="Connection"
                    value={selectedMatchesConnection ? "Connected to this wallet" : "Reconnect this wallet"}
                    good={selectedMatchesConnection}
                  />
                  <StatusRow
                    label="Network"
                    value={isArcTestnet ? "Arc Testnet" : "Switch required"}
                    good={isArcTestnet}
                  />
                  <StatusRow
                    label="Ownership"
                    value={walletsLoading ? "Checking…" : isOwnershipVerified ? "Signature verified" : "Verification required"}
                    good={isOwnershipVerified}
                    loading={walletsLoading}
                  />
                </dl>
              </section>

              {!isArcTestnet ? (
                <div className="rounded-2xl border border-amber-500/25 bg-amber-500/[0.06] p-4">
                  <div className="flex items-start gap-3">
                    <TriangleAlert className="mt-0.5 size-4 shrink-0 text-amber-500" aria-hidden="true" />
                    <div>
                      <p className="text-sm font-semibold">Arc Testnet is required</p>
                      <p className="mt-1 text-xs leading-5 text-muted-foreground">Approve one network switch in your wallet. This does not send a transaction.</p>
                    </div>
                  </div>
                  <Button className="mt-3 w-full" onClick={() => void switchToArcTestnet()} disabled={isSwitchingChain || !selectedMatchesConnection}>
                    {isSwitchingChain ? <Loader2 className="mr-2 size-4 animate-spin" aria-hidden="true" /> : null}
                    {isSwitchingChain ? "Check your wallet" : "Switch to Arc Testnet"}
                  </Button>
                </div>
              ) : !isOwnershipVerified ? (
                <div className="rounded-2xl border border-primary/20 bg-primary/[0.045] p-4">
                  <div className="flex items-start gap-3">
                    <Fingerprint className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden="true" />
                    <div>
                      <p className="text-sm font-semibold">Prove this wallet belongs to you</p>
                      <p className="mt-1 text-xs leading-5 text-muted-foreground">Sign a one-time message. It costs no gas, moves no funds, and cannot be replayed.</p>
                    </div>
                  </div>
                  {walletLimitReached && (
                    <p className="mt-3 rounded-lg border border-amber-500/25 bg-background/70 px-3 py-2 text-xs leading-5 text-muted-foreground">
                      Three wallets are already verified. Connect one of them, or remove one from your wallet settings first.
                    </p>
                  )}
                  <Button className="mt-3 w-full" onClick={() => void verifySelectedWallet()} disabled={verificationPending || walletsLoading || walletLimitReached}>
                    {verificationPending ? <Loader2 className="mr-2 size-4 animate-spin" aria-hidden="true" /> : <ShieldCheck className="mr-2 size-4" aria-hidden="true" />}
                    {verificationButtonLabel}
                  </Button>
                </div>
              ) : (
                <div className="rounded-2xl border border-emerald-500/25 bg-emerald-500/[0.055] p-4">
                  <div className="flex items-start gap-3">
                    <ShieldCheck className="mt-0.5 size-5 shrink-0 text-emerald-500" aria-hidden="true" />
                    <div>
                      <p className="text-sm font-semibold">Wallet ready</p>
                      <p className="mt-1 text-xs leading-5 text-muted-foreground">Ownership and Arc Testnet are confirmed. Review the address once more before minting.</p>
                    </div>
                  </div>
                  <Button className="mt-3 h-11 w-full" onClick={() => void mintToSelectedWallet()} disabled={isPending}>
                    {isPending ? <Loader2 className="mr-2 size-4 animate-spin" aria-hidden="true" /> : null}
                    {isPending ? "Minting on Arc Testnet…" : "Mint to this wallet"}
                  </Button>
                </div>
              )}
            </>
          )}

          {flowError && (
            <div role="alert" aria-live="assertive" className="flex items-start gap-2.5 rounded-xl border border-destructive/25 bg-destructive/[0.055] px-3.5 py-3 text-sm">
              <TriangleAlert className="mt-0.5 size-4 shrink-0 text-destructive" aria-hidden="true" />
              <p className="leading-5">{flowError}</p>
            </div>
          )}

          <div className="flex items-start gap-2 border-t pt-4 text-[11px] leading-5 text-muted-foreground">
            <LockKeyhole className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
            <p>This pass is soulbound. After a successful mint, it cannot be transferred to another wallet.</p>
          </div>
          <span className="sr-only" role="status" aria-live="polite">
            {walletPickerRequested ? "Opening wallet picker." : verificationPending ? verificationButtonLabel : ""}
          </span>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function StatusRow({ label, value, good, loading = false }: { label: string; value: string; good: boolean; loading?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4 py-3 text-xs">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className={`flex items-center gap-1.5 font-medium ${good ? "text-emerald-600 dark:text-emerald-400" : "text-foreground"}`}>
        {loading ? <Loader2 className="size-3.5 animate-spin" aria-hidden="true" /> : good ? <Check className="size-3.5" aria-hidden="true" /> : null}
        {value}
      </dd>
    </div>
  );
}
