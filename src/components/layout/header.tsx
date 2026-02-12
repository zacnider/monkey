"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { usePathname } from "next/navigation";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { Menu, X, Sun, Moon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTheme } from "@/providers/theme-provider";

const NAV_ITEMS = [
  { href: "/", label: "Home" },
  { href: "/dashboard", label: "Dashboard" },
  { href: "/leaderboard", label: "Leaderboard" },
  { href: "/earnings", label: "Earnings" },
  { href: "/live", label: "Live Feed" },
];

export function Header() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { theme, toggleTheme } = useTheme();

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
        {/* Logo - overflows header intentionally */}
        <Link href="/" className="relative z-10 flex shrink-0 items-center">
          <Image
            src="/logo.png"
            alt="MONKEY - On-Chain AI Trading"
            width={280}
            height={280}
            className="h-28 w-auto sm:h-32"
            priority
          />
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden items-center gap-1 lg:flex">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                pathname === item.href
                  ? "bg-primary/10 text-primary"
                  : "text-text-secondary hover:text-text-primary hover:bg-surface-hover"
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        {/* Right section: theme toggle + wallet + mobile menu */}
        <div className="flex items-center gap-2">
          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-border text-text-secondary transition-colors hover:bg-surface-hover hover:text-text-primary"
            aria-label="Toggle theme"
          >
            {theme === "dark" ? (
              <Sun className="h-4 w-4" />
            ) : (
              <Moon className="h-4 w-4" />
            )}
          </button>

          {/* Wallet Connect */}
          <ConnectButton.Custom>
            {({
              account,
              chain,
              openAccountModal,
              openChainModal,
              openConnectModal,
              mounted,
            }) => {
              const connected = mounted && account && chain;

              return (
                <div
                  {...(!mounted && {
                    "aria-hidden": true,
                    style: { opacity: 0, pointerEvents: "none", userSelect: "none" },
                  })}
                >
                  {!connected ? (
                    <button
                      onClick={openConnectModal}
                      className="rounded-lg bg-primary px-3 py-2 text-xs font-medium text-white hover:bg-primary-hover transition-colors sm:px-4 sm:text-sm"
                    >
                      Connect
                    </button>
                  ) : chain.unsupported ? (
                    <button
                      onClick={openChainModal}
                      className="rounded-lg bg-loss px-3 py-2 text-xs font-medium text-white sm:px-4 sm:text-sm"
                    >
                      Wrong Network
                    </button>
                  ) : (
                    <button
                      onClick={openAccountModal}
                      className="flex items-center gap-2 rounded-lg bg-surface px-2 py-2 text-xs font-medium border border-border hover:border-border-bright transition-colors sm:px-3 sm:text-sm"
                    >
                      <span className="hidden md:inline text-text-secondary">
                        {chain.name}
                      </span>
                      <span className="font-mono">{account.displayName}</span>
                    </button>
                  )}
                </div>
              );
            }}
          </ConnectButton.Custom>

          {/* Mobile hamburger */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-border text-text-secondary transition-colors hover:bg-surface-hover lg:hidden"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* Mobile Navigation Dropdown */}
      {mobileMenuOpen && (
        <nav className="border-t border-border bg-background px-4 py-3 lg:hidden">
          <div className="flex flex-col gap-1">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className={cn(
                  "rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  pathname === item.href
                    ? "bg-primary/10 text-primary"
                    : "text-text-secondary hover:text-text-primary hover:bg-surface-hover"
                )}
              >
                {item.label}
              </Link>
            ))}
          </div>
        </nav>
      )}
    </header>
  );
}
