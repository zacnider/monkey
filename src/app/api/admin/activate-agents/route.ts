/**
 * Admin endpoint: Activate all agents
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const strategies = [
      "contrarian",
      "volume_watcher",
      "sniper",
      "alpha_hunter",
      "swing_trader",
      "trend_follower",
      "diamond_hands",
      "degen_ape",
    ];

    const results = [];

    for (const strategy of strategies) {
      const agent = await prisma.agent.findFirst({
        where: { strategy },
      });

      if (agent) {
        await prisma.agent.update({
          where: { id: agent.id },
          data: { isActive: true },
        });
        results.push({ strategy, status: "activated", id: agent.id });
      } else {
        results.push({ strategy, status: "not_found" });
      }
    }

    return NextResponse.json({
      success: true,
      message: "All agents activated",
      results,
    });
  } catch (error) {
    console.error("[Activate Agents] Error:", error);
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}
