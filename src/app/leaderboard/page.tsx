"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { useAgents } from "@/hooks/use-agents";
import { formatMON, formatPnl, pnlColor, winRate } from "@/lib/utils";

type SortKey = "pnl" | "winRate" | "trades" | "mkey" | "donated";

export default function LeaderboardPage() {
  const { agents, isLoading } = useAgents();
  const [sortBy, setSortBy] = useState<SortKey>("pnl");

  const sorted = [...(agents || [])].sort((a: Record<string, string | number>, b: Record<string, string | number>) => {
    switch (sortBy) {
      case "pnl":
        return Number(BigInt(b.totalPnl as string) - BigInt(a.totalPnl as string));
      case "winRate": {
        const wrA = (a.winCount as number) + (a.lossCount as number) > 0 ? (a.winCount as number) / ((a.winCount as number) + (a.lossCount as number)) : 0;
        const wrB = (b.winCount as number) + (b.lossCount as number) > 0 ? (b.winCount as number) / ((b.winCount as number) + (b.lossCount as number)) : 0;
        return wrB - wrA;
      }
      case "trades":
        return (b.tradeCount as number) - (a.tradeCount as number);
      case "mkey":
        return Number(BigInt(b.mkeyBalance as string) - BigInt(a.mkeyBalance as string));
      case "donated":
        return Number(BigInt(b.totalDeposited as string) - BigInt(a.totalDeposited as string));
      default:
        return 0;
    }
  });

  const SORT_OPTIONS: { key: SortKey; label: string }[] = [
    { key: "pnl", label: "PnL" },
    { key: "winRate", label: "Win Rate" },
    { key: "trades", label: "Trades" },
    { key: "mkey", label: "MKEY Held" },
    { key: "donated", label: "Donations" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold gradient-text">Leaderboard</h1>
        <p className="mt-1 text-text-secondary">
          Agent performance rankings — who&apos;s making the most profit?
        </p>
      </div>

      {/* Sort Options */}
      <div className="flex gap-2 overflow-x-auto">
        {SORT_OPTIONS.map((opt) => (
          <button
            key={opt.key}
            onClick={() => setSortBy(opt.key)}
            className={`shrink-0 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              sortBy === opt.key
                ? "bg-primary text-white"
                : "bg-surface text-text-secondary hover:text-text-primary border border-border"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Ranking Table */}
      {isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      ) : (
        <div className="space-y-3">
          {sorted.map((agent: Record<string, string | number>, index: number) => (
            <motion.div
              key={agent.slug as string}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Link
                href={`/agents/${agent.slug}`}
                className={`flex items-center gap-4 rounded-xl border p-4 transition-all hover:border-primary/50 ${
                  index === 0
                    ? "border-mkey/30 bg-mkey/5 glow-mkey"
                    : index === 1
                      ? "border-text-muted/30 bg-surface"
                      : index === 2
                        ? "border-mkey/20 bg-surface"
                        : "border-border bg-surface"
                }`}
              >
                {/* Rank */}
                <div
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                    index === 0
                      ? "bg-mkey/20 text-mkey"
                      : index === 1
                        ? "bg-text-muted/20 text-text-secondary"
                        : index === 2
                          ? "bg-mkey/10 text-mkey-dim"
                          : "bg-surface text-text-muted"
                  }`}
                >
                  #{index + 1}
                </div>

                {/* Agent Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{agent.name}</span>
                    <span className="rounded-full bg-surface px-2 py-0.5 text-xs text-text-muted">
                      {agent.riskLevel}
                    </span>
                  </div>
                  <div className="mt-1 text-xs text-text-muted">
                    {agent.personality && (agent.personality as string).slice(0, 80)}...
                  </div>
                </div>

                {/* Stats Grid */}
                <div className="hidden gap-6 sm:grid sm:grid-cols-4 text-right">
                  <div>
                    <div className="text-[10px] text-text-muted">PnL</div>
                    <div className={`font-mono text-sm font-semibold ${pnlColor(agent.totalPnl as string)}`}>
                      {formatPnl(agent.totalPnl as string)}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] text-text-muted">Win Rate</div>
                    <div className="font-mono text-sm">
                      {winRate(agent.winCount as number, agent.lossCount as number)}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] text-text-muted">Trades</div>
                    <div className="font-mono text-sm">{agent.tradeCount}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-text-muted">MKEY</div>
                    <div className="font-mono text-sm text-mkey">
                      {formatMON(agent.mkeyBalance as string)}
                    </div>
                  </div>
                </div>

                {/* Mobile PnL */}
                <div className="sm:hidden text-right">
                  <div className={`font-mono text-sm font-semibold ${pnlColor(agent.totalPnl as string)}`}>
                    {formatPnl(agent.totalPnl as string)}
                  </div>
                  <div className="text-xs text-text-muted">
                    {winRate(agent.winCount as number, agent.lossCount as number)}
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
