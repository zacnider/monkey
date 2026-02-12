import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const [agents, tradeCount, donations, distributions, uniqueDonors] =
    await Promise.all([
      prisma.agent.findMany(),
      prisma.trade.count(),
      prisma.donation.findMany(),
      prisma.distribution.findMany({ where: { status: "sent" } }),
      prisma.donation.groupBy({ by: ["donorAddress"] }),
    ]);

  const totalPnl = agents.reduce(
    (sum, a) => sum + BigInt(a.totalPnl),
    0n
  );
  const totalMkey = agents.reduce(
    (sum, a) => sum + BigInt(a.mkeyBalance),
    0n
  );
  const totalBalance = agents.reduce(
    (sum, a) => sum + BigInt(a.monBalance),
    0n
  );
  const activeAgents = agents.filter((a) => a.isActive).length;
  const totalWins = agents.reduce((sum, a) => sum + a.winCount, 0);
  const totalLosses = agents.reduce((sum, a) => sum + a.lossCount, 0);

  const totalDonated = donations.reduce(
    (sum, d) => sum + BigInt(d.amount),
    0n
  );
  const totalDistributed = distributions.reduce(
    (sum, d) => sum + BigInt(d.amount),
    0n
  );

  return NextResponse.json({
    totalPnl: totalPnl.toString(),
    totalBalance: totalBalance.toString(),
    totalTrades: tradeCount,
    totalDonated: totalDonated.toString(),
    totalDistributed: totalDistributed.toString(),
    totalMkeyHeld: totalMkey.toString(),
    activeAgents,
    totalAgents: agents.length,
    uniqueDonors: uniqueDonors.length,
    winRate:
      totalWins + totalLosses > 0
        ? ((totalWins / (totalWins + totalLosses)) * 100).toFixed(1)
        : "0",
    totalWins,
    totalLosses,
  });
}
