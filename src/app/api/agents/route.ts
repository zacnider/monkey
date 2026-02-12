import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const agents = await prisma.agent.findMany({
    orderBy: { createdAt: "asc" },
    include: {
      _count: {
        select: {
          trades: true,
          donations: true,
          holdings: true,
        },
      },
    },
  });

  const data = agents.map((agent) => ({
    id: agent.id,
    name: agent.name,
    slug: agent.slug,
    personality: agent.personality,
    avatar: agent.avatar,
    walletAddress: agent.walletAddress,
    strategy: agent.strategy,
    riskLevel: agent.riskLevel,
    isActive: agent.isActive,
    totalDeposited: agent.totalDeposited,
    totalPnl: agent.totalPnl,
    totalDistributed: agent.totalDistributed,
    mkeyBalance: agent.mkeyBalance,
    monBalance: agent.monBalance,
    winCount: agent.winCount,
    lossCount: agent.lossCount,
    tradeCount: agent._count.trades,
    donorCount: agent._count.donations,
    holdingCount: agent._count.holdings,
  }));

  return NextResponse.json(data);
}
