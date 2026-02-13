"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WagmiProvider } from "wagmi";
import { RainbowKitProvider, darkTheme, lightTheme } from "@rainbow-me/rainbowkit";
import "@rainbow-me/rainbowkit/styles.css";
import { wagmiConfig } from "@/lib/wagmi/config";
import { useTheme } from "@/providers/theme-provider";

const queryClient = new QueryClient();

const rkDark = darkTheme({
  accentColor: "#8b5cf6",
  accentColorForeground: "white",
  borderRadius: "medium",
  overlayBlur: "small",
});

const rkLight = lightTheme({
  accentColor: "#7c3aed",
  accentColorForeground: "white",
  borderRadius: "medium",
  overlayBlur: "small",
});

export function Web3Provider({ children }: { children: React.ReactNode }) {
  const { theme } = useTheme();

  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider theme={theme === "dark" ? rkDark : rkLight}>
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
