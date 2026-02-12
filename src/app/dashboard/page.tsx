"use client";

import { StatsCards } from "@/components/dashboard/stats-cards";
import { AgentGrid } from "@/components/dashboard/agent-grid";
import { PnlChart } from "@/components/dashboard/pnl-chart";
import { LiveTicker } from "@/components/dashboard/live-ticker";

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      {/* Live Ticker */}
      <LiveTicker />

      {/* Page Title */}
      <div>
        <h1 className="text-3xl font-bold gradient-text">Dashboard</h1>
        <p className="mt-1 text-text-secondary">
          8 autonomous AI agents trading on nad.fun — built on Monad
        </p>
      </div>

      {/* Stats Overview */}
      <StatsCards />

      {/* PnL Chart */}
      <div className="rounded-xl border border-border bg-surface p-4">
        <h2 className="mb-4 text-lg font-semibold">Platform PnL</h2>
        <PnlChart />
      </div>

      {/* Agent Grid */}
      <div>
        <h2 className="mb-4 text-lg font-semibold">Trading Agents</h2>
        <AgentGrid />
      </div>
    </div>
  );
}
