import type { PropsWithChildren } from "react";
import { RainbowKitProvider, getDefaultConfig, lightTheme, darkTheme } from "@rainbow-me/rainbowkit";
import { WagmiProvider, http } from "wagmi";
import { defineChain } from "viem";
import { useTheme } from "next-themes";
import "@rainbow-me/rainbowkit/styles.css";

export const arcTestnet = defineChain({
  id: Number(import.meta.env.VITE_ARC_CHAIN_ID || 5_042_002),
  name: "Arc Testnet",
  nativeCurrency: { name: "USD Coin", symbol: "USDC", decimals: 18 },
  rpcUrls: {
    default: {
      http: [
        import.meta.env.VITE_ARC_RPC_URL ||
          "https://rpc.testnet.arc.network",
      ],
    },
  },
  blockExplorers: {
    default: {
      name: "Arcscan",
      url: "https://testnet.arcscan.app",
    },
  },
  testnet: true,
});

const wagmiConfig = getDefaultConfig({
  appName: "Arc Pass",
  // RainbowKit requires a non-empty projectId or it throws at config time and
  // blanks the page. "YOUR_PROJECT_ID" is its own documented placeholder that
  // it swaps for a shared demo project id until a real one is configured.
  projectId: import.meta.env.VITE_WALLETCONNECT_PROJECT_ID || "YOUR_PROJECT_ID",
  chains: [arcTestnet],
  transports: { [arcTestnet.id]: http(arcTestnet.rpcUrls.default.http[0]) },
});

export function WalletProvider({ children }: PropsWithChildren) {
  const { resolvedTheme } = useTheme();
  return (
    <WagmiProvider config={wagmiConfig}>
      <RainbowKitProvider
        modalSize="compact"
        theme={resolvedTheme === "dark"
          ? darkTheme({ accentColor: "#7657ff", borderRadius: "medium" })
          : lightTheme({ accentColor: "#5f42d8", borderRadius: "medium" })}
      >
        {children}
      </RainbowKitProvider>
    </WagmiProvider>
  );
}
