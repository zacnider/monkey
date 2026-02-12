import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { formatEther, parseEther } from "viem";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatMON(wei: string | bigint, decimals: number = 4): string {
  const value = typeof wei === "string" ? BigInt(wei) : wei;
  const formatted = formatEther(value);
  const num = parseFloat(formatted);
  if (num === 0) return "0";
  if (Math.abs(num) < 0.0001) return num.toExponential(2);
  return num.toFixed(decimals);
}

export function formatPnl(wei: string | bigint): string {
  const value = typeof wei === "string" ? BigInt(wei) : wei;
  const num = parseFloat(formatEther(value));
  const sign = num >= 0 ? "+" : "";
  return `${sign}${num.toFixed(4)} MON`;
}

export function formatTokenAmount(amount: string | bigint, decimals: number = 2): string {
  const value = typeof amount === "string" ? BigInt(amount) : amount;
  const num = parseFloat(formatEther(value));
  if (num === 0) return "0";
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(decimals)}M`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(decimals)}K`;
  return num.toFixed(decimals);
}

export function shortenAddress(address: string, chars: number = 4): string {
  return `${address.slice(0, chars + 2)}...${address.slice(-chars)}`;
}

export function timeAgo(date: Date | string): string {
  const now = new Date();
  const d = typeof date === "string" ? new Date(date) : date;
  const seconds = Math.floor((now.getTime() - d.getTime()) / 1000);

  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

export function pnlColor(pnl: string | bigint): string {
  const value = typeof pnl === "string" ? BigInt(pnl) : pnl;
  if (value > 0n) return "text-profit";
  if (value < 0n) return "text-loss";
  return "text-text-secondary";
}

export function winRate(wins: number, losses: number): string {
  const total = wins + losses;
  if (total === 0) return "0%";
  return `${((wins / total) * 100).toFixed(1)}%`;
}

export function explorerTxUrl(txHash: string): string {
  const baseUrl = process.env.NEXT_PUBLIC_CHAIN_ID === "143"
    ? "https://monadexplorer.com"
    : "https://testnet.monadexplorer.com";
  return `${baseUrl}/tx/${txHash}`;
}

export function explorerAddressUrl(address: string): string {
  const baseUrl = process.env.NEXT_PUBLIC_CHAIN_ID === "143"
    ? "https://monadexplorer.com"
    : "https://testnet.monadexplorer.com";
  return `${baseUrl}/address/${address}`;
}
