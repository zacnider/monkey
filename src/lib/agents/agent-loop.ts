/**
 * Continuous agent trading loop.
 * Runs all 8 agents in sequence, then waits, then repeats forever.
 * Started automatically by Next.js instrumentation when the server boots.
 */

import { TRADE_CONFIG } from "@/lib/config";
import { runAllAgentCycles } from "./runner";

let isRunning = false;
let cycleCount = 0;

function log(msg: string) {
  const time = new Date().toLocaleTimeString();
  console.log(`[🐒 AgentLoop ${time}] ${msg}`);
}

export function startAgentLoop() {
  if (isRunning) {
    log("Already running, skipping duplicate start");
    return;
  }

  // Check required env vars
  if (!process.env.OPERATOR_PRIVATE_KEY) {
    log("⚠️  OPERATOR_PRIVATE_KEY not set — agent loop disabled");
    return;
  }

  isRunning = true;
  const interval = TRADE_CONFIG.TRADE_CYCLE_INTERVAL; // 60s default

  log(`Starting continuous agent loop (interval: ${interval / 1000}s)`);

  // Run the loop asynchronously (non-blocking)
  (async () => {
    // Initial delay to let the server fully boot
    await sleep(5000);

    while (isRunning) {
      cycleCount++;
      log(`=== Cycle #${cycleCount} starting ===`);

      try {
        const { results } = await runAllAgentCycles();

        const completed = results.filter((r) => r.status === "completed").length;
        const failed = results.filter((r) => r.status === "failed").length;

        for (const r of results) {
          if (r.status === "failed") {
            log(`  ❌ ${r.agentName}: ${r.error}`);
          } else {
            log(`  ✅ ${r.agentName}: completed`);
          }
        }

        log(`=== Cycle #${cycleCount} done — ${completed} ok, ${failed} failed ===`);
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        log(`=== Cycle #${cycleCount} CRASHED: ${msg} ===`);
      }

      // Wait before next cycle
      await sleep(interval);
    }
  })();
}

export function stopAgentLoop() {
  log("Stopping agent loop...");
  isRunning = false;
}

export function getAgentLoopStatus() {
  return { isRunning, cycleCount };
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
