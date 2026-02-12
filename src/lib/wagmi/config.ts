import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { type Chain } from "wagmi/chains";

const monadMainnet: Chain = {
  id: 143,
  name: "Monad",
  nativeCurrency: { name: "MON", symbol: "MON", decimals: 18 },
  rpcUrls: {
    default: { http: ["https://rpc.monad.xyz"] },
  },
  blockExplorers: {
    default: { name: "Monad Explorer", url: "https://monadexplorer.com" },
  },
};

export const wagmiConfig = getDefaultConfig({
  appName: "Monkey - AI Trading Agents",
  projectId: process.env.NEXT_PUBLIC_WC_PROJECT_ID || "monkey-trading-agents",
  chains: [monadMainnet],
  ssr: false,
});

export { monadMainnet };
