"use client";

import Link from "next/link";
import { useAgent } from "@/hooks/use-agents";
import { AgentHeader } from "@/components/agent/agent-header";
import { AgentPnlChart } from "@/components/agent/agent-pnl-chart";
import { HoldingsTable } from "@/components/agent/holdings-table";
import { TradeHistory } from "@/components/agent/trade-history";
import { DonorList } from "@/components/agent/donor-list";
import { AgentLog } from "@/components/agent/agent-log";

export default function AgentDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const { id } = params;
  const { agent, isLoading } = useAgent(id);

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!agent) {
    return (
      <div className="text-center py-20">
        <h2 className="text-xl font-bold text-text-secondary">Agent not found</h2>
        <Link href="/" className="mt-4 text-primary hover:underline">
          Back to Dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-text-muted">
        <Link href="/" className="hover:text-text-primary">
          Dashboard
        </Link>
        <span>/</span>
        <span className="text-text-primary">{agent.name}</span>
      </div>

      {/* Agent Header */}
      <AgentHeader agent={agent} />

      {/* PnL Chart */}
      <div className="rounded-xl border border-border bg-surface p-4">
        <h3 className="mb-4 text-lg font-semibold">Performance</h3>
        <AgentPnlChart snapshots={agent.pnlSnapshots || []} />
      </div>

      {/* Two Column Layout */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Holdings */}
        <div className="rounded-xl border border-border bg-surface p-4">
          <h3 className="mb-4 text-lg font-semibold">Current Holdings</h3>
          <HoldingsTable
            holdings={agent.holdings || []}
            mkeyBalance={agent.mkeyBalance}
          />
        </div>

        {/* Donors */}
        <div className="rounded-xl border border-border bg-surface p-4">
          <h3 className="mb-4 text-lg font-semibold">Top Donors</h3>
          <DonorList agentSlug={agent.slug} />
        </div>
      </div>

      {/* Trade History */}
      <div className="rounded-xl border border-border bg-surface p-4">
        <h3 className="mb-4 text-lg font-semibold">Trade History</h3>
        <TradeHistory trades={agent.trades || []} />
      </div>

      {/* Agent Decision Log */}
      <div className="rounded-xl border border-border bg-surface p-4">
        <h3 className="mb-4 text-lg font-semibold">Decision Log</h3>
        <AgentLog logs={agent.logs || []} />
      </div>
    </div>
  );
}
