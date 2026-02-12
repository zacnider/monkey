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

  const holdings = await prisma.holding.findMany({
    where: { agentId: agent.id },
    orderBy: { updatedAt: "desc" },
  });

  return NextResponse.json(holdings);
}
