"use client";

import { motion } from "framer-motion";
import { formatMON, formatPnl, pnlColor, winRate, shortenAddress, explorerAddressUrl } from "@/lib/utils";

interface AgentHeaderProps {
  agent: {
    name: string;
    avatar: string;
    personality: string;
    strategy: string;
    riskLevel: string;
    walletAddress: string;
    totalPnl: string;
    monBalance: string;
    mkeyBalance: string;
    totalDeposited: string;
    totalDistributed: string;
    winCount: number;
    lossCount: number;
    isActive: boolean;
  };
}

const RISK_COLORS: Record<string, string> = {
  aggressive: "bg-loss/20 text-loss",
  moderate: "bg-warning/20 text-warning",
  conservative: "bg-profit/20 text-profit",
};

const STRATEGY_EMOJIS: Record<string, string> = {
  alpha_hunter: "🎯",
  diamond_hands: "💎",
  swing_trader: "📊",
  degen_ape: "🦍",
  volume_watcher: "📈",
  trend_follower: "🏄",
  contrarian: "🔄",
  sniper: "🎯",
};

export function AgentHeader({ agent }: AgentHeaderProps) {
  const pnl = BigInt(agent.totalPnl);

  // walletAddress may be "vaultAddress:index" format — extract vault address for display
  const displayAddress = agent.walletAddress.includes(":")
    ? agent.walletAddress.split(":")[0]
    : agent.walletAddress;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-border bg-surface p-6"
    >
      <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
        {/* Left: Identity */}
        <div className="flex items-start gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/20 text-3xl overflow-hidden">
            {agent.avatar?.endsWith(".svg") || agent.avatar?.endsWith(".png") ? (
              <img src={agent.avatar} alt={agent.name} className="h-full w-full object-cover" />
            ) : (
              STRATEGY_EMOJIS[agent.strategy] || "🤖"
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold">{agent.name}</h1>
              {agent.isActive && (
                <span className="flex items-center gap-1 text-xs text-profit">
                  <span className="h-2 w-2 rounded-full bg-profit animate-pulse-live" />
                  Active
                </span>
              )}
            </div>
            <p className="mt-1 max-w-lg text-sm text-text-secondary">
              {agent.personality}
            </p>
            <div className="mt-2 flex items-center gap-2">
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-medium ${RISK_COLORS[agent.riskLevel] || ""}`}
              >
                {agent.riskLevel}
              </span>
              <a
                href={explorerAddressUrl(displayAddress)}
                target="_blank"
                rel="noopener noreferrer"
                className="font-mono text-xs text-text-muted hover:text-primary"
                title="MonkeyVault Contract"
              >
                {shortenAddress(displayAddress)}
              </a>
            </div>
          </div>
        </div>

        {/* Right: Stats */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <StatBox
            label="Total PnL"
            value={formatPnl(agent.totalPnl)}
            className={pnlColor(agent.totalPnl)}
          />
          <StatBox
            label="Win Rate"
            value={winRate(agent.winCount, agent.lossCount)}
            sub={`${agent.winCount}W / ${agent.lossCount}L`}
          />
          <StatBox
            label="MON Balance"
            value={`${formatMON(agent.monBalance)} MON`}
          />
          <StatBox
            label="MKEY Held"
            value={formatMON(agent.mkeyBalance)}
            className="text-mkey"
          />
          <StatBox
            label="Total Donated"
            value={`${formatMON(agent.totalDeposited)} MON`}
          />
          <StatBox
            label="Distributed"
            value={`${formatMON(agent.totalDistributed)} MON`}
            className="text-profit"
          />
        </div>
      </div>
    </motion.div>
  );
}

function StatBox({
  label,
  value,
  sub,
  className = "",
}: {
  label: string;
  value: string;
  sub?: string;
  className?: string;
}) {
  return (
    <div className="text-center md:text-right">
      <p className="text-xs text-text-muted">{label}</p>
      <p className={`font-mono text-sm font-semibold ${className}`}>{value}</p>
      {sub && <p className="text-xs text-text-muted">{sub}</p>}
    </div>
  );
}
