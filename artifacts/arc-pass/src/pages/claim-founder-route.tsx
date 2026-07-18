import { WalletProvider } from "@/lib/wallet-provider";
import ClaimFounderPage from "@/pages/claim-founder";

export default function ClaimFounderRoute() {
  return (
    <WalletProvider>
      <ClaimFounderPage />
    </WalletProvider>
  );
}
