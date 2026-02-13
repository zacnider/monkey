/**
 * Admin endpoint: Read agent activity logs
 */

import { NextRequest, NextResponse } from "next/server";
import { getRecentLogs } from "@/lib/logger";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const lines = parseInt(searchParams.get("lines") || "100");

  try {
    const logs = getRecentLogs(lines);

    return new NextResponse(logs, {
      headers: {
        "Content-Type": "text/plain",
      },
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}
