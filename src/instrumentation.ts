/**
 * Next.js Instrumentation — runs once when the server starts.
 * Launches the continuous agent trading loop in the background.
 */

export async function register() {
  // Only run on the server (Node.js runtime), not on Edge or client
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { startAgentLoop } = await import("@/lib/agents/agent-loop");
    startAgentLoop();
  }
}
