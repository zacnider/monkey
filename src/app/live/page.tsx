"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useLiveFeed, type LiveTrade } from "@/hooks/use-live-feed";
import { formatMON, formatPnl, pnlColor, timeAgo, explorerTxUrl, shortenAddress } from "@/lib/utils";

const TYPE_STYLES: Record<string, string> = {
  buy: "bg-profit/10 text-profit border-profit/20",
  sell: "bg-loss/10 text-loss border-loss/20",
  mkey_buy: "bg-mkey/10 text-mkey border-mkey/20",
};

export default function LiveFeedPage() {
  const { trades, connected } = useLiveFeed(100);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold gradient-text">Live Feed</h1>
          <p className="mt-1 text-text-secondary">
            Real-time trades from all 8 agents
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <span
            className={`h-2.5 w-2.5 rounded-full ${
              connected ? "bg-profit animate-pulse-live" : "bg-loss"
            }`}
          />
          <span className="text-text-muted">
            {connected ? "Connected" : "Reconnecting..."}
          </span>
        </div>
      </div>

      {/* Trade Feed */}
      <div className="space-y-2">
        {trades.length === 0 ? (
          <div className="rounded-xl border border-border bg-surface p-12 text-center">
            <div className="text-4xl mb-4">🔍</div>
            <p className="text-text-secondary">
              Waiting for trades...
            </p>
            <p className="mt-1 text-sm text-text-muted">
              Agents analyze the market every minute. Trades will appear here in real-time.
            </p>
          </div>
        ) : (
          <AnimatePresence initial={false}>
            {trades.map((trade) => (
              <TradeCard key={trade.id} trade={trade} />
            ))}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}

function TradeCard({ trade }: { trade: LiveTrade }) {
  const style = TYPE_STYLES[trade.type] || TYPE_STYLES.buy;

  return (
    <motion.div
      initial={{ opacity: 0, y: -20, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={{ type: "spring", stiffness: 500, damping: 30 }}
      className={`rounded-xl border bg-surface p-4 ${style}`}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          {/* Type Badge */}
          <span className="rounded-lg bg-background px-2.5 py-1 text-xs font-bold uppercase">
            {trade.type === "mkey_buy" ? "MKEY BUY" : trade.type}
          </span>

          {/* Agent */}
          <div>
            <span className="font-semibold text-text-primary">
              {trade.agentName}
            </span>
            <span className="mx-2 text-text-muted">→</span>
            <span className="font-medium">
              {trade.tokenSymbol}
            </span>
            <span className="ml-1 text-xs text-text-muted">
              {trade.tokenName}
            </span>
          </div>
        </div>

        {/* Amount */}
        <div className="text-right">
          <div className="font-mono text-sm font-semibold">
            {trade.type === "buy" || trade.type === "mkey_buy"
              ? `${formatMON(trade.amountIn)} MON`
              : `${formatMON(trade.amountOut)} MON`}
          </div>
          {trade.pnl && (
            <div className={`font-mono text-xs ${pnlColor(trade.pnl)}`}>
              {formatPnl(trade.pnl)}
            </div>
          )}
        </div>
      </div>

      {/* Reason */}
      <p className="mt-2 text-xs text-text-muted line-clamp-1">
        {trade.reason}
      </p>

      {/* Footer */}
      <div className="mt-2 flex items-center justify-between text-[11px] text-text-muted">
        <span>{timeAgo(trade.createdAt)}</span>
        <a
          href={explorerTxUrl(trade.txHash)}
          target="_blank"
          rel="noopener noreferrer"
          className="font-mono hover:text-primary transition-colors"
        >
          {trade.txHash.slice(0, 14)}...
        </a>
      </div>
    </motion.div>
  );
}
