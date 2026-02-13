/**
 * Next.js Instrumentation — runs once when the server starts.
 * Launches the continuous agent trading loop in the background.
 */

export async function register() {
  // Only run on the server (Node.js runtime), not on Edge or client
  if (process.env.NEXT_RUNTIME === "nodejs") {
    // Load .env file explicitly (Next.js doesn't auto-load in production)
    const { config } = await import("dotenv");
    config();

    // Start main agent trading loop
    const { startAgentLoop } = await import("@/lib/agents/agent-loop");
    startAgentLoop();

    // PHASE 3: Start real-time volume spike detector (10s polling)
    const { volumeSpikeDetector } = await import("@/lib/agents/volume-spike-detector");
    volumeSpikeDetector.start();

    // PHASE 3: Initialize whale tracker
    const { whaleTracker } = await import("@/lib/agents/whale-tracker");
    await whaleTracker.init();

    console.log("[Instrumentation] 🚀 Real-time monitoring + whale tracking started");
  }
}
