/**
 * Learning System - Agents adapt and improve over time
 *
 * For Moltiverse Hackathon:
 * - Agents learn from wins and losses
 * - Dynamically adjust thresholds based on performance
 * - Track pattern success rates
 * - Adaptive risk management
 *
 * This is NOT static rules - agents evolve based on results
 */

import { prisma } from "@/lib/db";

export interface AgentLearningProfile {
  agentId: string;
  strategy: string;

  // Performance metrics
  totalTrades: number;
  wins: number;
  losses: number;
  winRate: number;
  netPnL: number; // In MON

  // Adaptive parameters
  confidenceThreshold: number; // Minimum confidence to trade (starts 70, adapts)
  positionSize: number; // In MON (starts 5, adapts)
  maxPositions: number; // Max concurrent holdings

  // Pattern learning
  successfulPatterns: string[]; // Patterns that worked
  failedPatterns: string[]; // Patterns that failed

  // Timestamps
  lastUpdated: Date;
}

/**
 * Load or create learning profile for an agent
 */
export async function getAgentLearningProfile(agentId: string): Promise<AgentLearningProfile> {
  // Get agent info
  const agent = await prisma.agent.findUnique({
    where: { id: agentId },
    include: {
      trades: {
        orderBy: { createdAt: "desc" },
        take: 100, // Last 100 trades for learning
      },
    },
  });

  if (!agent) {
    throw new Error(`Agent ${agentId} not found`);
  }

  // Calculate performance metrics
  const trades = agent.trades;
  const totalTrades = trades.length;
  const wins = trades.filter((t) => t.pnl && BigInt(t.pnl) > 0n).length;
  const losses = trades.filter((t) => t.pnl && BigInt(t.pnl) < 0n).length;
  const winRate = totalTrades > 0 ? wins / totalTrades : 0;

  const netPnL = trades.reduce((sum, t) => {
    return sum + (t.pnl ? Number(BigInt(t.pnl)) / 1e18 : 0);
  }, 0);

  // Adaptive thresholds based on performance
  const confidenceThreshold = calculateAdaptiveConfidence(winRate, totalTrades);
  const positionSize = calculateAdaptivePositionSize(winRate, netPnL);
  const maxPositions = calculateMaxPositions(winRate);

  // Pattern learning (simplified for now)
  const successfulPatterns = extractSuccessfulPatterns(trades);
  const failedPatterns = extractFailedPatterns(trades);

  return {
    agentId,
    strategy: agent.strategy,
    totalTrades,
    wins,
    losses,
    winRate,
    netPnL,
    confidenceThreshold,
    positionSize,
    maxPositions,
    successfulPatterns,
    failedPatterns,
    lastUpdated: new Date(),
  };
}

/**
 * Adaptive confidence threshold
 * - High win rate → Lower threshold (more aggressive)
 * - Low win rate → Higher threshold (more selective)
 */
function calculateAdaptiveConfidence(winRate: number, totalTrades: number): number {
  // Start conservative if not enough data
  if (totalTrades < 10) {
    return 75; // Need 75% confidence to trade
  }

  if (winRate >= 0.5) {
    // Winning consistently → be more aggressive
    return 60; // Lower threshold
  } else if (winRate >= 0.35) {
    // Decent performance → maintain standard
    return 70;
  } else {
    // Poor performance → still allow trading to learn (was 85, too restrictive)
    return 70; // Same as standard - agents need trades to improve
  }
}

/**
 * Adaptive position sizing
 * - Winning → Increase size (within limits)
 * - Losing → Decrease size (risk management)
 */
function calculateAdaptivePositionSize(winRate: number, netPnL: number): number {
  const baseSize = 5; // 5 MON base

  // If losing money, reduce size
  if (netPnL < -10) {
    return 2; // Minimum size until recovery
  }

  // If winning consistently, increase size
  if (winRate >= 0.5 && netPnL > 10) {
    return 10; // Max size
  }

  if (winRate >= 0.4) {
    return 7; // Medium-high size
  }

  return baseSize;
}

/**
 * Adaptive max positions
 * - Good performance → Hold more positions
 * - Poor performance → Focus on fewer, better trades
 */
function calculateMaxPositions(winRate: number): number {
  if (winRate >= 0.5) {
    return 5; // Can handle more positions
  } else if (winRate >= 0.35) {
    return 3; // Standard
  } else {
    return 2; // Focus on quality
  }
}

/**
 * Extract successful patterns from wins
 * (Simplified - can be enhanced with ML later)
 */
function extractSuccessfulPatterns(
  trades: Array<{ type: string; pnl: string | null; reason: string | null }>
): string[] {
  const wins = trades.filter((t) => t.pnl && BigInt(t.pnl) > 0n && t.reason);

  const patterns = wins
    .map((t) => t.reason || "")
    .filter((r) => r.length > 0)
    .slice(0, 10); // Top 10 winning patterns

  return patterns;
}

/**
 * Extract failed patterns to avoid
 */
function extractFailedPatterns(
  trades: Array<{ type: string; pnl: string | null; reason: string | null }>
): string[] {
  const losses = trades.filter((t) => t.pnl && BigInt(t.pnl) < 0n && t.reason);

  const patterns = losses
    .map((t) => t.reason || "")
    .filter((r) => r.length > 0)
    .slice(0, 10); // Top 10 losing patterns

  return patterns;
}

/**
 * Record a trade outcome for learning
 */
export async function recordTradeOutcome(
  agentId: string,
  tokenSymbol: string,
  pattern: string,
  pnl: number, // In MON
  success: boolean
): Promise<void> {
  // This gets stored in the Trade record
  // The learning system reads from Trade records
  console.log(
    `[Learning] Agent ${agentId}: ${success ? "✅ WIN" : "❌ LOSS"} on ${tokenSymbol} (${pnl.toFixed(2)} MON) - Pattern: ${pattern}`
  );
}

/**
 * Get learning insights for an agent
 */
export async function getAgentLearningInsights(agentId: string): Promise<string> {
  const profile = await getAgentLearningProfile(agentId);

  if (profile.totalTrades === 0) {
    return "No trades yet - learning mode enabled. Starting conservative.";
  }

  let insights = `## Learning Insights\n\n`;
  insights += `**Performance:** ${profile.wins}W / ${profile.losses}L (${(profile.winRate * 100).toFixed(1)}% win rate)\n`;
  insights += `**Net PnL:** ${profile.netPnL > 0 ? "+" : ""}${profile.netPnL.toFixed(2)} MON\n\n`;

  insights += `**Adaptive Settings:**\n`;
  insights += `- Confidence Threshold: ${profile.confidenceThreshold}% (${profile.winRate >= 0.5 ? "AGGRESSIVE" : profile.winRate >= 0.35 ? "STANDARD" : "SELECTIVE"})\n`;
  insights += `- Position Size: ${profile.positionSize} MON (${profile.netPnL >= 10 ? "INCREASED" : profile.netPnL <= -10 ? "REDUCED" : "STANDARD"})\n`;
  insights += `- Max Positions: ${profile.maxPositions} (${profile.winRate >= 0.5 ? "CONFIDENT" : "FOCUSED"})\n\n`;

  if (profile.successfulPatterns.length > 0) {
    insights += `**What's Working:**\n`;
    profile.successfulPatterns.slice(0, 3).forEach((p) => {
      insights += `- ${p}\n`;
    });
    insights += "\n";
  }

  if (profile.failedPatterns.length > 0) {
    insights += `**What to Avoid:**\n`;
    profile.failedPatterns.slice(0, 3).forEach((p) => {
      insights += `- ${p}\n`;
    });
  }

  return insights;
}

/**
 * Check if agent should take a trade based on learning
 */
export function shouldTakeTradeBasedOnLearning(
  profile: AgentLearningProfile,
  confidence: number,
  currentPositions: number
): { allowed: boolean; reason: string } {
  // Check confidence threshold
  if (confidence < profile.confidenceThreshold) {
    return {
      allowed: false,
      reason: `Confidence ${confidence}% below threshold ${profile.confidenceThreshold}% (adaptive based on ${(profile.winRate * 100).toFixed(1)}% win rate)`,
    };
  }

  // Check max positions
  if (currentPositions >= profile.maxPositions) {
    return {
      allowed: false,
      reason: `Max positions reached (${currentPositions}/${profile.maxPositions}) - adaptive limit based on performance`,
    };
  }

  return {
    allowed: true,
    reason: `Learning system approved: ${confidence}% confidence > ${profile.confidenceThreshold}% threshold`,
  };
}

/**
 * Get recommended position size based on learning
 */
export function getRecommendedPositionSize(
  profile: AgentLearningProfile,
  confidence: number
): number {
  const baseSize = profile.positionSize;

  // Scale by confidence (50-100% confidence = 0.5x-1.5x base size)
  const confidenceMultiplier = 0.5 + (confidence / 100);

  return Math.min(15, Math.max(2, baseSize * confidenceMultiplier)); // 2-15 MON range
}
