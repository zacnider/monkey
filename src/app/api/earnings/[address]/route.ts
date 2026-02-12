import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ address: string }> }
) {
  const { address } = await params;
  const normalizedAddress = address.toLowerCase();

  // Get all donations by this address
  const donations = await prisma.donation.findMany({
    where: { donorAddress: normalizedAddress },
    include: { agent: true },
    orderBy: { createdAt: "desc" },
  });

  if (donations.length === 0) {
    return NextResponse.json({
      address: normalizedAddress,
      totalDonated: "0",
      totalEarned: "0",
      roi: 0,
      byAgent: [],
      recentDonations: [],
    });
  }

  // Aggregate donations by agent
  const agentDonations = new Map<
    string,
    {
      agentId: string;
      agentName: string;
      agentSlug: string;
      agentAvatar: string;
      userDonated: bigint;
      donationCount: number;
    }
  >();

  for (const d of donations) {
    const existing = agentDonations.get(d.agentId) || {
      agentId: d.agentId,
      agentName: d.agent.name,
      agentSlug: d.agent.slug,
      agentAvatar: d.agent.avatar,
      userDonated: 0n,
      donationCount: 0,
    };
    existing.userDonated += BigInt(d.amount);
    existing.donationCount++;
    agentDonations.set(d.agentId, existing);
  }

  // Get agent data for PnL and totalDistributed
  const agentIds = Array.from(agentDonations.keys());
  const agents = await prisma.agent.findMany({
    where: { id: { in: agentIds } },
    select: {
      id: true,
      totalDeposited: true,
      totalDistributed: true,
      totalPnl: true,
      winCount: true,
      lossCount: true,
    },
  });

  const agentDataMap = new Map(agents.map((a) => [a.id, a]));

  // Calculate user's share of each agent's distributed profits
  // User's earnings = (userDonated / agentTotalDeposited) * agentTotalDistributed
  let totalDonated = 0n;
  let totalEarned = 0n;

  const byAgent = Array.from(agentDonations.values()).map((ad) => {
    const agentData = agentDataMap.get(ad.agentId);
    const agentTotalDeposited = agentData ? BigInt(agentData.totalDeposited) : 0n;
    const agentTotalDistributed = agentData ? BigInt(agentData.totalDistributed) : 0n;
    const agentPnl = agentData ? BigInt(agentData.totalPnl) : 0n;

    // Calculate user's proportional share of distributed profits
    let userEarned = 0n;
    if (agentTotalDeposited > 0n && agentTotalDistributed > 0n) {
      userEarned = (ad.userDonated * agentTotalDistributed) / agentTotalDeposited;
    }

    // Also calculate user's proportional PnL (includes unrealized)
    let userPnl = 0n;
    if (agentTotalDeposited > 0n) {
      userPnl = (ad.userDonated * agentPnl) / agentTotalDeposited;
    }

    totalDonated += ad.userDonated;
    totalEarned += userEarned;

    return {
      agentId: ad.agentId,
      agentName: ad.agentName,
      agentSlug: ad.agentSlug,
      agentAvatar: ad.agentAvatar,
      totalDonated: ad.userDonated.toString(),
      totalEarned: userEarned.toString(),
      totalPnl: userPnl.toString(),
      donationCount: ad.donationCount,
      winCount: agentData?.winCount ?? 0,
      lossCount: agentData?.lossCount ?? 0,
      roi:
        ad.userDonated > 0n
          ? Number((userPnl * 10000n) / ad.userDonated) / 100
          : 0,
    };
  });

  // Overall ROI based on PnL
  const totalPnl = byAgent.reduce((s, a) => s + BigInt(a.totalPnl), 0n);

  return NextResponse.json({
    address: normalizedAddress,
    totalDonated: totalDonated.toString(),
    totalEarned: totalEarned.toString(),
    totalPnl: totalPnl.toString(),
    roi:
      totalDonated > 0n
        ? Number((totalPnl * 10000n) / totalDonated) / 100
        : 0,
    byAgent,
    recentDonations: donations.slice(0, 10).map((d) => ({
      agentName: d.agent.name,
      amount: d.amount,
      txHash: d.txHash,
      createdAt: d.createdAt,
    })),
  });
}
