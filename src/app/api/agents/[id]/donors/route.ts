import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const agent = await prisma.agent.findFirst({
    where: { OR: [{ id }, { slug: id }] },
  });

  if (!agent) {
    return NextResponse.json({ error: "Agent not found" }, { status: 404 });
  }

  // Get all donations for this agent
  const allDonations = await prisma.donation.findMany({
    where: { agentId: agent.id },
    orderBy: { createdAt: "desc" },
  });

  // Aggregate by donor address
  const donorMap = new Map<string, { total: bigint; count: number }>();
  for (const d of allDonations) {
    const existing = donorMap.get(d.donorAddress) || { total: 0n, count: 0 };
    existing.total += BigInt(d.amount);
    existing.count++;
    donorMap.set(d.donorAddress, existing);
  }

  // Get distributions for each donor
  const donors = await Promise.all(
    Array.from(donorMap.entries()).map(async ([address, info]) => {
      const distributions = await prisma.distribution.findMany({
        where: {
          agentId: agent.id,
          recipientAddress: address,
          status: "sent",
        },
      });

      const totalEarned = distributions.reduce(
        (sum, d) => sum + BigInt(d.amount),
        0n
      );

      return {
        address,
        totalDonated: info.total.toString(),
        donationCount: info.count,
        totalEarned: totalEarned.toString(),
      };
    })
  );

  // Sort by donation amount descending
  donors.sort((a, b) =>
    Number(BigInt(b.totalDonated) - BigInt(a.totalDonated))
  );

  return NextResponse.json(donors);
}
