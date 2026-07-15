import type { PropsWithChildren } from "react";
import { RainbowKitProvider, lightTheme, darkTheme } from "@rainbow-me/rainbowkit";
import { WagmiProvider, createConfig, http } from "wagmi";
import { injected } from "wagmi/connectors";
import { defineChain } from "viem";
import { useTheme } from "next-themes";

const arc = defineChain({
  id: Number(import.meta.env.VITE_ARC_CHAIN_ID || 1),
  name: "Arc",
  nativeCurrency: { name: "USD Coin", symbol: "USDC", decimals: 6 },
  rpcUrls: { default: { http: [import.meta.env.VITE_ARC_RPC_URL || "https://ethereum-rpc.publicnode.com"] } },
});

const wagmiConfig = createConfig({
  chains: [arc],
  connectors: [injected({ shimDisconnect: true })],
  transports: { [arc.id]: http(arc.rpcUrls.default.http[0]) },
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
