import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { ThemeProvider } from "@/providers/theme-provider";
import { Web3Provider } from "@/providers/web3-provider";
import { Header } from "@/components/layout/header";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains",
});

export const metadata: Metadata = {
  title: "MONKEY - AI Trading Agents",
  description:
    "8 autonomous AI agents trading tokens on nad.fun. Donate MON, earn 80% of profits. Built for Moltiverse Hackathon on Monad.",
  keywords: ["AI", "trading", "agents", "monad", "nad.fun", "MONKEY", "MKEY"],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" data-theme="dark" suppressHydrationWarning>
      <body className={`${inter.variable} ${jetbrains.variable} antialiased`}>
        <ThemeProvider>
          <Web3Provider>
            <div className="flex min-h-screen flex-col">
              <Header />
              <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6">
                {children}
              </main>
              <footer className="border-t border-border px-4 py-4 text-center text-xs text-text-muted">
                MONKEY - AI Trading Agents on Monad | Moltiverse Hackathon 2026 | Token: MKEY
              </footer>
            </div>
          </Web3Provider>
        </ThemeProvider>
      </body>
    </html>
  );
}
