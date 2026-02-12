"use client";

import { useMemo } from "react";
import { useLiveFeed, type LiveTrade } from "@/hooks/use-live-feed";
import { cn, formatMON, timeAgo } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/*  Fallback data when SSE stream has no trades yet                    */
/* ------------------------------------------------------------------ */
const PLACEHOLDER_TRADES: LiveTrade[] = [
  {
    id: "ph-1",
    agentName: "Alpha Ape",
    agentSlug: "alpha-ape",
    agentAvatar: "\ud83e\udd8d",
    tokenSymbol: "PEPE",
    tokenName: "Pepe Token",
    type: "BUY",
    amountIn: "50000000000000000",
    amountOut: "1200000000000000000000",
    pnl: null,
    reason: "Momentum signal detected",
    txHash: "0x",
    createdAt: new Date().toISOString(),
  },
  {
    id: "ph-2",
    agentName: "Beta Baboon",
    agentSlug: "beta-baboon",
    agentAvatar: "\ud83d\udc12",
    tokenSymbol: "DOGE",
    tokenName: "Doge Token",
    type: "SELL",
    amountIn: "300000000000000000000",
    amountOut: "80000000000000000",
    pnl: "12000000000000000",
    reason: "Take profit at 2x",
    txHash: "0x",
    createdAt: new Date(Date.now() - 60000).toISOString(),
  },
  {
    id: "ph-3",
    agentName: "Gamma Gorilla",
    agentSlug: "gamma-gorilla",
    agentAvatar: "\ud83e\udd8d",
    tokenSymbol: "SHIB",
    tokenName: "Shiba Inu",
    type: "BUY",
    amountIn: "25000000000000000",
    amountOut: "5000000000000000000000",
    pnl: null,
    reason: "Whale accumulation spotted",
    txHash: "0x",
    createdAt: new Date(Date.now() - 120000).toISOString(),
  },
  {
    id: "ph-4",
    agentName: "Delta Drill",
    agentSlug: "delta-drill",
    agentAvatar: "\ud83d\udc35",
    tokenSymbol: "WOJAK",
    tokenName: "Wojak",
    type: "BUY",
    amountIn: "40000000000000000",
    amountOut: "800000000000000000000",
    pnl: null,
    reason: "Breakout pattern",
    txHash: "0x",
    createdAt: new Date(Date.now() - 180000).toISOString(),
  },
  {
    id: "ph-5",
    agentName: "Epsilon Chimp",
    agentSlug: "epsilon-chimp",
    agentAvatar: "\ud83d\udc12",
    tokenSymbol: "BONK",
    tokenName: "Bonk",
    type: "SELL",
    amountIn: "10000000000000000000000",
    amountOut: "120000000000000000",
    pnl: "-5000000000000000",
    reason: "Stop loss triggered",
    txHash: "0x",
    createdAt: new Date(Date.now() - 240000).toISOString(),
  },
  {
    id: "ph-6",
    agentName: "Zeta Monkey",
    agentSlug: "zeta-monkey",
    agentAvatar: "\ud83d\ude48",
    tokenSymbol: "MEME",
    tokenName: "Meme Coin",
    type: "BUY",
    amountIn: "60000000000000000",
    amountOut: "2000000000000000000000",
    pnl: null,
    reason: "Social volume spike",
    txHash: "0x",
    createdAt: new Date(Date.now() - 300000).toISOString(),
  },
];

/* ------------------------------------------------------------------ */
/*  Single ticker item                                                 */
/* ------------------------------------------------------------------ */
function TickerItem({ trade }: { trade: LiveTrade }) {
  const isBuy = trade.type === "BUY";

  return (
    <div
      className={cn(
        "flex shrink-0 items-center gap-2.5 rounded-lg border px-3 py-1.5",
        "bg-surface/80 backdrop-blur-sm transition-colors",
        isBuy
          ? "border-profit/20 hover:border-profit/40"
          : "border-loss/20 hover:border-loss/40"
      )}
    >
      {/* Agent avatar */}
      {trade.agentAvatar && (trade.agentAvatar.endsWith(".svg") || trade.agentAvatar.endsWith(".png")) ? (
        <img src={trade.agentAvatar} alt={trade.agentName} className="h-5 w-5 shrink-0 rounded-full object-cover" />
      ) : (
        <span className="text-base leading-none">{trade.agentAvatar}</span>
      )}
      <span className="max-w-[80px] truncate text-xs font-medium text-text-primary">
        {trade.agentName}
      </span>

      {/* BUY / SELL badge */}
      <span
        className={cn(
          "rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide",
          isBuy
            ? "bg-profit/15 text-profit"
            : "bg-loss/15 text-loss"
        )}
      >
        {trade.type}
      </span>

      {/* Token symbol */}
      <span className="font-mono text-xs font-semibold text-text-primary">
        {trade.tokenSymbol}
      </span>

      {/* Amount */}
      <span className="font-mono text-[10px] tabular-nums text-text-secondary">
        {formatMON(trade.amountIn, 3)} MON
      </span>

      {/* Time — suppressHydrationWarning: server/client Date mismatch on placeholders */}
      <span className="text-[10px] text-text-muted" suppressHydrationWarning>
        {timeAgo(trade.createdAt)}
      </span>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Live ticker component                                              */
/* ------------------------------------------------------------------ */
export function LiveTicker() {
  const { trades, connected } = useLiveFeed(20);

  /* Use real trades if available, otherwise show placeholders */
  const displayTrades = useMemo(
    () => (trades.length > 0 ? trades : PLACEHOLDER_TRADES),
    [trades]
  );

  /*
   * Duplicate the items so the CSS animation (translateX(-50%)) loops
   * seamlessly: the first half scrolls out while the second half
   * (identical copy) takes its place.
   */
  const doubled = useMemo(
    () => [...displayTrades, ...displayTrades],
    [displayTrades]
  );

  return (
    <div className="relative overflow-hidden rounded-xl border border-border bg-surface/60 backdrop-blur-sm">
      {/* Connection indicator */}
      <div className="absolute left-3 top-1/2 z-10 flex -translate-y-1/2 items-center gap-1.5">
        <span
          className={cn(
            "h-1.5 w-1.5 rounded-full",
            connected
              ? "bg-profit animate-pulse-live"
              : "bg-text-muted"
          )}
        />
        <span className="text-[9px] font-medium uppercase tracking-widest text-text-muted">
          Live
        </span>
      </div>

      {/* Left fade gradient */}
      <div className="pointer-events-none absolute inset-y-0 left-0 z-[5] w-16 bg-gradient-to-r from-surface/90 to-transparent" />

      {/* Right fade gradient */}
      <div className="pointer-events-none absolute inset-y-0 right-0 z-[5] w-16 bg-gradient-to-l from-surface/90 to-transparent" />

      {/* Scrolling ticker track */}
      <div className="flex animate-ticker items-center gap-3 px-14 py-2.5 will-change-transform">
        {doubled.map((trade, i) => (
          <TickerItem key={`${trade.id}-${i}`} trade={trade} />
        ))}
      </div>
    </div>
  );
}
