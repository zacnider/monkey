"use client";

import { formatMON, formatPnl, pnlColor, timeAgo, explorerTxUrl } from "@/lib/utils";

interface Trade {
  id: string;
  tokenSymbol: string;
  tokenName: string;
  type: string;
  amountIn: string;
  amountOut: string;
  pnl: string | null;
  reason: string;
  txHash: string;
  createdAt: string;
}

const TYPE_STYLES: Record<string, string> = {
  buy: "bg-profit/10 text-profit",
  sell: "bg-loss/10 text-loss",
  mkey_buy: "bg-mkey/10 text-mkey",
};

export function TradeHistory({ trades }: { trades: Trade[] }) {
  if (trades.length === 0) {
    return (
      <div className="py-8 text-center text-text-muted">
        No trades yet — agent is analyzing the market
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {trades.map((trade) => (
        <div
          key={trade.id}
          className="rounded-lg border border-border/50 bg-background p-3 hover:border-border transition-colors"
        >
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              {/* Type badge */}
              <span
                className={`rounded-md px-2 py-0.5 text-xs font-bold uppercase ${TYPE_STYLES[trade.type] || ""}`}
              >
                {trade.type === "mkey_buy" ? "MKEY" : trade.type}
              </span>

              {/* Token info */}
              <div>
                <span className="font-medium">{trade.tokenSymbol}</span>
                <span className="ml-1 text-xs text-text-muted">
                  {trade.tokenName}
                </span>
              </div>
            </div>

            {/* Amounts */}
            <div className="text-right">
              {trade.type === "buy" || trade.type === "mkey_buy" ? (
                <span className="font-mono text-sm">
                  {formatMON(trade.amountIn)} MON
                </span>
              ) : (
                <span className="font-mono text-sm">
                  {formatMON(trade.amountOut)} MON
                </span>
              )}
              {trade.pnl && (
                <div className={`font-mono text-xs ${pnlColor(trade.pnl)}`}>
                  {formatPnl(trade.pnl)}
                </div>
              )}
            </div>
          </div>

          {/* Reason */}
          <p className="mt-2 text-xs text-text-muted line-clamp-2">
            {trade.reason}
          </p>

          {/* Footer */}
          <div className="mt-2 flex items-center justify-between text-xs text-text-muted">
            <span>{timeAgo(trade.createdAt)}</span>
            <a
              href={explorerTxUrl(trade.txHash)}
              target="_blank"
              rel="noopener noreferrer"
              className="font-mono hover:text-primary"
            >
              {trade.txHash.slice(0, 10)}...
            </a>
          </div>
        </div>
      ))}
    </div>
  );
}
