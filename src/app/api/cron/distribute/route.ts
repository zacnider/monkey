import { NextResponse } from "next/server";

/**
 * Distribution is now handled automatically by the MonkeyVault smart contract.
 * When an agent sells a token profitably, the vault automatically:
 * - Allocates 80% of profit to donors (claimable via claimEarnings)
 * - Buys MKEY with 20% of profit
 *
 * This endpoint is kept for backwards compatibility but no longer needed.
 */
export async function POST(req: Request) {
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json({
    message: "Distribution is now handled on-chain by MonkeyVault contract. Donors can claim earnings via claimEarnings().",
  });
}
