import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { searchParams } = new URL(req.url);
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "20");

  const agent = await prisma.agent.findFirst({
    where: { OR: [{ id }, { slug: id }] },
  });

  if (!agent) {
    return NextResponse.json({ error: "Agent not found" }, { status: 404 });
  }

  const [trades, total] = await Promise.all([
    prisma.trade.findMany({
      where: { agentId: agent.id },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.trade.count({ where: { agentId: agent.id } }),
  ]);

  return NextResponse.json({
    trades,
    total,
    page,
    pages: Math.ceil(total / limit),
  });
}
