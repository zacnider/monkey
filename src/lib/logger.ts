/**
 * File-based logger for production debugging
 */

import fs from "fs";
import path from "path";

const LOG_DIR = "/tmp/monkey-logs";
const LOG_FILE = path.join(LOG_DIR, "agent-activity.log");

// Ensure log directory exists
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

export function log(message: string, level: "INFO" | "ERROR" | "WARN" = "INFO") {
  const timestamp = new Date().toISOString();
  const logLine = `[${timestamp}] [${level}] ${message}\n`;

  // Console (for PM2 logs, if they work)
  console.log(logLine.trim());

  // File (always works)
  try {
    fs.appendFileSync(LOG_FILE, logLine, "utf8");
  } catch (error) {
    // Fail silently if file write fails
  }
}

export function logError(message: string, error?: any) {
  const errorDetails = error instanceof Error ? error.stack : String(error);
  log(`${message}\n${errorDetails || ""}`, "ERROR");
}

export function logLLMDecision(agent: string, decision: any) {
  log(
    `[LLM Decision] ${agent}: ${decision.action} (confidence: ${decision.confidence}%) - ${decision.reasoning}`,
    "INFO"
  );
}

export function logTrade(agent: string, action: string, token: string, details: string) {
  log(`[TRADE] ${agent} ${action} ${token} - ${details}`, "INFO");
}

export function getRecentLogs(lines: number = 50): string {
  try {
    if (!fs.existsSync(LOG_FILE)) {
      return "No logs yet";
    }

    const content = fs.readFileSync(LOG_FILE, "utf8");
    const allLines = content.split("\n");
    const recentLines = allLines.slice(-lines);
    return recentLines.join("\n");
  } catch (error) {
    return `Error reading logs: ${error}`;
  }
}
