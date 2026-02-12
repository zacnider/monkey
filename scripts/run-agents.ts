/**
 * Standalone agent runner script.
 * Starts all 8 agents and runs trade cycles in a continuous loop.
 *
 * Usage:
 *   npx tsx scripts/run-agents.ts
 *
 * Requires: OPERATOR_PRIVATE_KEY, GROQ_API_KEY, DATABASE_URL in .env
 */

import "dotenv/config";

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
const CRON_SECRET = process.env.CRON_SECRET || "";
const CYCLE_INTERVAL = parseInt(process.env.AGENT_CYCLE_INTERVAL || "60000"); // 60s default

async function runCycle(cycleNum: number) {
  const startTime = Date.now();
  console.log(`\n${"=".repeat(60)}`);
  console.log(`[Cycle ${cycleNum}] Starting at ${new Date().toLocaleTimeString()}`);
  console.log("=".repeat(60));

  try {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (CRON_SECRET) {
      headers["Authorization"] = `Bearer ${CRON_SECRET}`;
    }

    const res = await fetch(`${BASE_URL}/api/cron/trade`, {
      method: "POST",
      headers,
    });

    if (!res.ok) {
      const text = await res.text();
      console.error(`[Cycle ${cycleNum}] API error ${res.status}: ${text}`);
      return;
    }

    const data = await res.json();
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

    if (data.results) {
      for (const result of data.results) {
        const icon = result.status === "completed" ? "✅" : "❌";
        const errMsg = result.error ? ` — ${result.error}` : "";
        console.log(`  ${icon} ${result.agentName}: ${result.status}${errMsg}`);
      }

      const completed = data.results.filter((r: any) => r.status === "completed").length;
      const failed = data.results.filter((r: any) => r.status === "failed").length;
      console.log(`\n[Cycle ${cycleNum}] Done in ${elapsed}s — ${completed} completed, ${failed} failed`);
    } else {
      console.log(`[Cycle ${cycleNum}] Response:`, JSON.stringify(data));
    }
  } catch (error) {
    console.error(`[Cycle ${cycleNum}] Failed:`, error instanceof Error ? error.message : error);
  }
}

async function main() {
  console.log("🐒 MONKEY Agent Runner");
  console.log("=".repeat(60));
  console.log(`API URL:        ${BASE_URL}`);
  console.log(`Cycle interval: ${CYCLE_INTERVAL / 1000}s`);
  console.log(`Auth:           ${CRON_SECRET ? "Bearer token" : "No auth (CRON_SECRET empty)"}`);
  console.log("=".repeat(60));
  console.log("\nPress Ctrl+C to stop.\n");

  let cycle = 1;

  // Run first cycle immediately
  await runCycle(cycle++);

  // Then loop
  while (true) {
    console.log(`\n⏳ Waiting ${CYCLE_INTERVAL / 1000}s until next cycle...`);
    await new Promise((resolve) => setTimeout(resolve, CYCLE_INTERVAL));
    await runCycle(cycle++);
  }
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
