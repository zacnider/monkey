"use client";

import { formatMON, formatTokenAmount, formatPnl, pnlColor } from "@/lib/utils";

interface Holding {
  tokenSymbol: string;
  tokenName: string;
  tokenAddress: string;
  amount: string;
  costBasis: string;
  currentValue: string;
  unrealizedPnl: string;
}

export function HoldingsTable({
  holdings,
  mkeyBalance,
}: {
  holdings: Holding[];
  mkeyBalance: string;
}) {
  const hasHoldings = holdings.length > 0 || BigInt(mkeyBalance) > 0n;

  if (!hasHoldings) {
    return (
      <div className="py-8 text-center text-text-muted">
        No holdings yet
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left text-xs text-text-muted">
            <th className="pb-2 pr-4">Token</th>
            <th className="pb-2 pr-4 text-right">Amount</th>
            <th className="pb-2 pr-4 text-right">Cost Basis</th>
            <th className="pb-2 pr-4 text-right">Value</th>
            <th className="pb-2 text-right">PnL</th>
          </tr>
        </thead>
        <tbody>
          {/* MKEY holding - always show first */}
          {BigInt(mkeyBalance) > 0n && (
            <tr className="border-b border-border/50">
              <td className="py-3 pr-4">
                <div className="flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-mkey/20 text-xs">
                    M
                  </span>
                  <div>
                    <span className="font-medium text-mkey">MKEY</span>
                    <span className="ml-1 text-xs text-text-muted">HODL</span>
                  </div>
                </div>
              </td>
              <td className="py-3 pr-4 text-right font-mono text-mkey">
                {formatTokenAmount(mkeyBalance)}
              </td>
              <td className="py-3 pr-4 text-right font-mono text-text-muted">
                —
              </td>
              <td className="py-3 pr-4 text-right font-mono text-text-muted">
                —
              </td>
              <td className="py-3 text-right">
                <span className="rounded-full bg-mkey/10 px-2 py-0.5 text-xs text-mkey">
                  HODL Forever
                </span>
              </td>
            </tr>
          )}

          {/* Other holdings */}
          {holdings.map((h) => (
            <tr key={h.tokenAddress} className="border-b border-border/50">
              <td className="py-3 pr-4">
                <div>
                  <span className="font-medium">{h.tokenSymbol}</span>
                  <span className="ml-1 text-xs text-text-muted">
                    {h.tokenName}
                  </span>
                </div>
              </td>
              <td className="py-3 pr-4 text-right font-mono">
                {formatTokenAmount(h.amount)}
              </td>
              <td className="py-3 pr-4 text-right font-mono text-text-secondary">
                {formatMON(h.costBasis)} MON
              </td>
              <td className="py-3 pr-4 text-right font-mono">
                {formatMON(h.currentValue)} MON
              </td>
              <td className={`py-3 text-right font-mono ${pnlColor(h.unrealizedPnl)}`}>
                {formatPnl(h.unrealizedPnl)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
