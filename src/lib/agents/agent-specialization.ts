/**
 * Agent Specialization - Time-based Market Segmentation
 *
 * Each agent focuses on different token age ranges to avoid competition
 * and maximize expertise in their specific time window.
 *
 * Benefits:
 * - Zero agent competition (different time windows)
 * - Specialized strategies for each market phase
 * - Better signal accuracy (agents become experts in their window)
 * - Full market coverage (fresh tokens to mature tokens)
 */

export interface TimeWindow {
  minAge?: number;        // Minimum token age in seconds
  maxAge?: number;        // Maximum token age in seconds
  minCurveProgress?: number; // For graduation sniping (0-10000 = 0-100%)
  maxCurveProgress?: number;
  requiresHistory?: boolean;  // Needs price history data
  enabled: boolean;
  description: string;
}

export const AGENT_TIME_WINDOWS: Record<string, TimeWindow> = {
  // SNIPER: Ultra-fresh tokens (1-3 minutes)
  // Strategy: First-mover advantage, catch immediate momentum
  sniper: {
    minAge: 60,          // 1 minute (minimum data available)
    maxAge: 180,         // 3 minutes (ultra-fresh)
    enabled: false,      // DISABLED - currently losing money (15% WR)
    description: "Fresh launch sniping - first mover advantage on new tokens"
  },

  // ALPHA HUNTER: Early momentum (3-10 minutes)
  // Strategy: Catch tokens with proven early traction
  alpha_hunter: {
    minAge: 180,         // 3 minutes
    maxAge: 600,         // 10 minutes
    enabled: false,      // DISABLED - currently losing money (0% WR)
    description: "Early momentum catching - tokens showing initial buyer interest"
  },

  // VOLUME WATCHER: Active trading phase (5 minutes - 2 hours) - RELAXED
  // Strategy: Volume spike detection, whale following
  volume_watcher: {
    minAge: 300,         // 5 minutes (RELAXED from 10min)
    maxAge: 7200,        // 2 hours (RELAXED from 1h - more opportunities)
    enabled: true,       // ACTIVE - 26.8% WR (best performer with Contrarian)
    description: "Volume spike backrunning - detecting and following whale activity"
  },

  // TREND FOLLOWER: Established trends (1-4 hours)
  // Strategy: Ride sustained momentum with EMA confirmation
  trend_follower: {
    minAge: 3600,        // 1 hour
    maxAge: 14400,       // 4 hours
    enabled: false,      // DISABLED - currently losing money (0% WR)
    description: "Trend riding - sustained momentum plays with technical confirmation"
  },

  // CONTRARIAN: Mature tokens (1+ hour) - RELAXED from 4h
  // Strategy: Buy panic dumps, mean reversion plays
  contrarian: {
    minAge: 3600,        // 1 hour (RELAXED from 4h - more opportunities)
    maxAge: Infinity,    // No max age
    enabled: true,       // ACTIVE - 29.5% WR (best performer!)
    description: "Dump buying - mean reversion after panic sells on established tokens"
  },

  // DIAMOND HANDS: Graduation sniping (SPECIAL - curve-based)
  // Strategy: Buy tokens 95-99% to bonding curve completion
  diamond_hands: {
    minCurveProgress: 9500,  // 95% curve progress
    maxCurveProgress: 9999,  // 99.99% (before graduation)
    enabled: false,          // DISABLED - currently losing money (19% WR)
    description: "Graduation sniping - buy before DEX listing, sell into graduation pump"
  },

  // SWING TRADER: Price oscillations (2+ hours with history)
  // Strategy: Buy support, sell resistance using technical analysis
  swing_trader: {
    minAge: 7200,        // 2 hours (need price history)
    requiresHistory: true,
    enabled: false,      // DISABLED - currently losing money (22% WR)
    description: "Swing trading - buy dips sell rips on established price patterns"
  },

  // DEGEN APE: DISABLED (terrible performance)
  degen_ape: {
    enabled: false,      // PERMANENTLY DISABLED - 0% WR, pure gambling
    description: "DISABLED - No edge detected in meme-only strategy"
  }
} as const;

/**
 * Check if a token is within an agent's time window
 */
export function isTokenInWindow(
  strategy: string,
  tokenAgeSeconds: number,
  curveProgress?: number
): { allowed: boolean; reason: string } {
  const window = AGENT_TIME_WINDOWS[strategy];

  if (!window) {
    return { allowed: false, reason: `Unknown strategy: ${strategy}` };
  }

  if (!window.enabled) {
    return { allowed: false, reason: `Agent disabled (poor performance)` };
  }

  // Special case: Diamond Hands (curve-based, not age-based)
  if (strategy === "diamond_hands") {
    if (curveProgress === undefined) {
      return { allowed: false, reason: "Curve progress not available" };
    }

    if (window.minCurveProgress !== undefined && curveProgress < window.minCurveProgress) {
      return {
        allowed: false,
        reason: `Curve too low: ${(curveProgress/100).toFixed(1)}% (need ${window.minCurveProgress/100}%+)`
      };
    }

    if (window.maxCurveProgress !== undefined && curveProgress > window.maxCurveProgress) {
      return {
        allowed: false,
        reason: `Curve too high: ${(curveProgress/100).toFixed(1)}% (need <${window.maxCurveProgress/100}%)`
      };
    }

    return { allowed: true, reason: `Curve ${(curveProgress/100).toFixed(1)}% - graduation target` };
  }

  // Age-based filtering
  if (window.minAge !== undefined && tokenAgeSeconds < window.minAge) {
    return {
      allowed: false,
      reason: `Too fresh: ${tokenAgeSeconds}s (need ${window.minAge}s+)`
    };
  }

  if (window.maxAge !== undefined && tokenAgeSeconds > window.maxAge) {
    return {
      allowed: false,
      reason: `Too old: ${tokenAgeSeconds}s (need <${window.maxAge}s)`
    };
  }

  // Format age for logging
  const ageStr = tokenAgeSeconds < 60
    ? `${tokenAgeSeconds}s`
    : tokenAgeSeconds < 3600
    ? `${(tokenAgeSeconds / 60).toFixed(0)}min`
    : `${(tokenAgeSeconds / 3600).toFixed(1)}h`;

  return { allowed: true, reason: `Age ${ageStr} - in window` };
}

/**
 * Get active agents (for monitoring)
 */
export function getActiveAgents(): string[] {
  return Object.entries(AGENT_TIME_WINDOWS)
    .filter(([_, window]) => window.enabled)
    .map(([strategy]) => strategy);
}

/**
 * Get agent statistics
 */
export function getAgentWindowStats() {
  const active = getActiveAgents();
  const disabled = Object.entries(AGENT_TIME_WINDOWS)
    .filter(([_, window]) => !window.enabled)
    .map(([strategy]) => strategy);

  return {
    totalAgents: Object.keys(AGENT_TIME_WINDOWS).length,
    activeAgents: active.length,
    disabledAgents: disabled.length,
    active,
    disabled,
    windows: AGENT_TIME_WINDOWS
  };
}
