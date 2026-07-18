import { WalletProvider } from "@/lib/wallet-provider";
import ClaimBuilderPage from "@/pages/claim-builder";

export default function ClaimBuilderRoute() {
  return (
    <WalletProvider>
      <ClaimBuilderPage />
    </WalletProvider>
  );
}
