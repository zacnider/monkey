/**
 * Market regime detection.
 * Analyzes aggregate recent token data to determine overall market conditions.
 * Agents adjust their behavior based on the detected regime.
 */

import type { RecentToken, TokenMarketData } from "@/lib/nadfun/api";

export type MarketRegime = "bull" | "bear" | "sideways";

export interface RegimeAnalysis {
  regime: MarketRegime;
  confidence: number;          // 0-100
  avgPriceChange1h: number;
  avgPriceChange24h: number;
  positiveTokenPct: number;    // % of tokens with positive 1h change
  avgVolume: number;
  newTokenRate: number;        // New tokens per hour
  reasons: string[];
}

/**
 * Analyze the overall market regime from a batch of recent tokens + their market data.
 */
export function detectMarketRegime(
  tokenDataPairs: Array<{ token: RecentToken; market: TokenMarketData | null }>
): RegimeAnalysis {
  const reasons: string[] = [];
  const withMarket = tokenDataPairs.filter((p) => p.market !== null);

  if (withMarket.length < 5) {
    return {
      regime: "sideways",
      confidence: 20,
      avgPriceChange1h: 0,
      avgPriceChange24h: 0,
      positiveTokenPct: 50,
      avgVolume: 0,
      newTokenRate: 0,
      reasons: ["Insufficient data for regime detection"],
    };
  }

  // Compute aggregate metrics
  const priceChanges1h = withMarket
    .map((p) => p.market!.price_change_1h ?? 0)
    .filter((c) => Math.abs(c) < 500); // filter outliers
  const priceChanges24h = withMarket
    .map((p) => p.market!.price_change_24h ?? 0)
    .filter((c) => Math.abs(c) < 1000);
  // Convert volume from wei to MON
  const volumes = withMarket.map((p) => parseFloat(p.market!.volume_24h || "0") / 1e18);

  const avgPriceChange1h =
    priceChanges1h.reduce((s, c) => s + c, 0) / priceChanges1h.length;
  const avgPriceChange24h =
    priceChanges24h.reduce((s, c) => s + c, 0) / priceChanges24h.length;
  const positiveTokenPct =
    (priceChanges1h.filter((c) => c > 0).length / priceChanges1h.length) * 100;
  const avgVolume =
    volumes.reduce((s, v) => s + v, 0) / volumes.length;

  // New token creation rate
  const now = Math.floor(Date.now() / 1000);
  const recentTokens = tokenDataPairs.filter(
    (p) => now - p.token.token_info.created_at < 3600
  );
  const newTokenRate = recentTokens.length;

  // Score-based regime detection
  let bullScore = 0;
  let bearScore = 0;

  // Price trend
  if (avgPriceChange1h > 5) {
    bullScore += 30;
    reasons.push(`Avg 1h change: +${avgPriceChange1h.toFixed(1)}%`);
  } else if (avgPriceChange1h < -5) {
    bearScore += 30;
    reasons.push(`Avg 1h change: ${avgPriceChange1h.toFixed(1)}%`);
  }

  if (avgPriceChange24h > 10) {
    bullScore += 20;
    reasons.push(`Avg 24h change: +${avgPriceChange24h.toFixed(1)}%`);
  } else if (avgPriceChange24h < -10) {
    bearScore += 20;
    reasons.push(`Avg 24h change: ${avgPriceChange24h.toFixed(1)}%`);
  }

  // Breadth (% of tokens positive)
  if (positiveTokenPct > 65) {
    bullScore += 25;
    reasons.push(`${positiveTokenPct.toFixed(0)}% tokens positive - broad rally`);
  } else if (positiveTokenPct < 35) {
    bearScore += 25;
    reasons.push(`Only ${positiveTokenPct.toFixed(0)}% tokens positive - broad decline`);
  }

  // Volume (now in MON after wei conversion)
  if (avgVolume > 50000) {
    bullScore += 10;
    reasons.push(`High avg volume: ${(avgVolume / 1000).toFixed(0)}K MON`);
  } else if (avgVolume < 100) {
    bearScore += 5;
    reasons.push(`Low volume: ${avgVolume.toFixed(0)} MON`);
  }

  // New token creation (high activity = bullish sentiment)
  if (newTokenRate > 20) {
    bullScore += 15;
    reasons.push(`Active token creation: ${newTokenRate} in last hour`);
  } else if (newTokenRate < 5) {
    bearScore += 10;
    reasons.push(`Low token creation: ${newTokenRate} in last hour`);
  }

  // Determine regime
  let regime: MarketRegime;
  let confidence: number;

  if (bullScore > bearScore + 15) {
    regime = "bull";
    confidence = Math.min(90, 50 + bullScore - bearScore);
    reasons.push("REGIME: Bull market detected");
  } else if (bearScore > bullScore + 15) {
    regime = "bear";
    confidence = Math.min(90, 50 + bearScore - bullScore);
    reasons.push("REGIME: Bear market detected");
  } else {
    regime = "sideways";
    confidence = Math.max(30, 70 - Math.abs(bullScore - bearScore));
    reasons.push("REGIME: Sideways/choppy market");
  }

  return {
    regime,
    confidence,
    avgPriceChange1h,
    avgPriceChange24h,
    positiveTokenPct,
    avgVolume,
    newTokenRate,
    reasons,
  };
}

/**
 * Adjust signal threshold based on market regime.
 * In bull markets, lower the bar slightly. In bear markets, raise it.
 */
export function regimeThresholdAdjustment(
  regime: MarketRegime,
  baseThreshold: number
): number {
  switch (regime) {
    case "bull":
      return Math.max(85, baseThreshold - 5); // STRENGTHENED: only slight reduction in bull (was -10, now -5)
    case "bear":
      return Math.min(95, baseThreshold + 15); // STRENGTHENED: much harder in bear (was +10, now +15)
    case "sideways":
    default:
      return baseThreshold;
  }
}

/**
 * Get strategy-specific regime score adjustment.
 * Some strategies perform better in certain regimes.
 */
export function regimeStrategyBonus(
  regime: MarketRegime,
  strategy: string
): { adjustment: number; reason: string } {
  const bonuses: Record<MarketRegime, Record<string, number>> = {
    bull: {
      alpha_hunter: 10,
      degen_ape: 15,
      trend_follower: 12,
      volume_watcher: 8,
      swing_trader: 5,
      diamond_hands: 5,
      sniper: 8,
      contrarian: -10, // Contrarian shouldn't buy in bull peaks
    },
    bear: {
      contrarian: 15,
      diamond_hands: -5,
      alpha_hunter: -10,
      degen_ape: -15,
      trend_follower: -10,
      volume_watcher: -5,
      swing_trader: 5,
      sniper: -5,
    },
    sideways: {
      swing_trader: 10,
      contrarian: 5,
      volume_watcher: 5,
      alpha_hunter: 0,
      diamond_hands: 0,
      degen_ape: 0,
      trend_follower: -5,
      sniper: 0,
    },
  };

  const adj = bonuses[regime]?.[strategy] ?? 0;
  const reason =
    adj !== 0
      ? `${regime} market ${adj > 0 ? "favors" : "penalizes"} ${strategy} (${adj > 0 ? "+" : ""}${adj})`
      : "";

  return { adjustment: adj, reason };
}
