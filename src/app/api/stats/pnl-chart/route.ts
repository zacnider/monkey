import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { formatEther } from "viem";

export const dynamic = "force-dynamic";

export async function GET() {
  // Get PnL snapshots from all agents, grouped by time
  // Each agent creates a snapshot per trade cycle (~60s)
  const snapshots = await prisma.pnlSnapshot.findMany({
    orderBy: { timestamp: "asc" },
    select: {
      pnl: true,
      monBalance: true,
      timestamp: true,
    },
  });

  // Get trade counts grouped by hour for the "trades" metric
  const trades = await prisma.trade.findMany({
    orderBy: { createdAt: "asc" },
    select: { createdAt: true },
  });

  if (snapshots.length === 0) {
    return NextResponse.json([]);
  }

  // Group snapshots by time bucket (every 5 minutes)
  // Sum PnL across all agents at each time point
  const bucketMs = 5 * 60 * 1000; // 5 min buckets
  const bucketMap = new Map<
    number,
    { totalPnl: bigint; count: number; tradeCount: number }
  >();

  for (const snap of snapshots) {
    const bucketTime =
      Math.floor(snap.timestamp.getTime() / bucketMs) * bucketMs;
    const existing = bucketMap.get(bucketTime) || {
      totalPnl: 0n,
      count: 0,
      tradeCount: 0,
    };
    existing.totalPnl += BigInt(snap.pnl);
    existing.count += 1;
    bucketMap.set(bucketTime, existing);
  }

  // Count trades per bucket
  for (const trade of trades) {
    const bucketTime =
      Math.floor(trade.createdAt.getTime() / bucketMs) * bucketMs;
    const existing = bucketMap.get(bucketTime);
    if (existing) {
      existing.tradeCount += 1;
    }
  }

  // Convert to chart data array
  const chartData = Array.from(bucketMap.entries())
    .sort(([a], [b]) => a - b)
    .map(([timestamp, data]) => {
      const date = new Date(timestamp);
      const hours = date.getHours().toString().padStart(2, "0");
      const minutes = date.getMinutes().toString().padStart(2, "0");

      // Average PnL per snapshot in this bucket (multiple agents)
      // We want cumulative platform PnL, so sum all agents
      const pnlMon = parseFloat(formatEther(data.totalPnl));
      // Divide by count to get per-snapshot average, but we actually want
      // the sum across agents at this time point. Each cycle has 8 snapshots.
      // So divide by number of agents that reported (count / cycles)
      const avgPnl = data.count > 0 ? pnlMon / (data.count / 8) : 0;

      return {
        time: `${hours}:${minutes}`,
        pnl: parseFloat(pnlMon.toFixed(6)),
        trades: data.tradeCount,
        timestamp,
      };
    });

  // Keep last 50 data points max
  const trimmed = chartData.slice(-50);

  return NextResponse.json(trimmed);
}
