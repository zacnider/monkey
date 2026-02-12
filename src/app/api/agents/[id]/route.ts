import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const agent = await prisma.agent.findFirst({
    where: { OR: [{ id }, { slug: id }] },
    include: {
      holdings: { orderBy: { updatedAt: "desc" } },
      trades: { orderBy: { createdAt: "desc" }, take: 20 },
      donations: { orderBy: { createdAt: "desc" }, take: 20 },
      logs: { orderBy: { createdAt: "desc" }, take: 30 },
      pnlSnapshots: { orderBy: { timestamp: "desc" }, take: 100 },
      _count: { select: { trades: true, donations: true } },
    },
  });

  if (!agent) {
    return NextResponse.json({ error: "Agent not found" }, { status: 404 });
  }

  return NextResponse.json(agent);
}
