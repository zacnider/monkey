import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const encoder = new TextEncoder();
  let closed = false;
  let pollInterval: ReturnType<typeof setInterval> | null = null;
  let pingInterval: ReturnType<typeof setInterval> | null = null;

  const stream = new ReadableStream({
    async start(controller) {
      let lastId = "";

      const sendTrades = async () => {
        if (closed) return;

        try {
          const where = lastId
            ? { createdAt: { gt: new Date(lastId) } }
            : {};

          const trades = await prisma.trade.findMany({
            where,
            orderBy: { createdAt: "desc" },
            take: 10,
            include: {
              agent: {
                select: { name: true, slug: true, avatar: true },
              },
            },
          });

          if (trades.length > 0 && !closed) {
            lastId = trades[0].createdAt.toISOString();

            for (const trade of trades.reverse()) {
              if (closed) break;
              const data = JSON.stringify({
                id: trade.id,
                agentName: trade.agent.name,
                agentSlug: trade.agent.slug,
                agentAvatar: trade.agent.avatar,
                tokenSymbol: trade.tokenSymbol,
                tokenName: trade.tokenName,
                type: trade.type,
                amountIn: trade.amountIn,
                amountOut: trade.amountOut,
                pnl: trade.pnl,
                reason: trade.reason,
                txHash: trade.txHash,
                createdAt: trade.createdAt,
              });

              try {
                controller.enqueue(encoder.encode(`data: ${data}\n\n`));
              } catch {
                closed = true;
                break;
              }
            }
          }
        } catch (error) {
          if (!closed) console.error("SSE error:", error);
        }
      };

      // Initial send
      try {
        controller.enqueue(encoder.encode(": connected\n\n"));
      } catch {
        closed = true;
        return;
      }

      await sendTrades();

      // Poll every 3 seconds
      pollInterval = setInterval(sendTrades, 3000);

      // Keep-alive ping every 30s
      pingInterval = setInterval(() => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(": ping\n\n"));
        } catch {
          closed = true;
        }
      }, 30000);
    },
    cancel() {
      closed = true;
      if (pollInterval) clearInterval(pollInterval);
      if (pingInterval) clearInterval(pingInterval);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
