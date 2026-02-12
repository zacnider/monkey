import type { TokenMarketData, RecentToken } from "@/lib/nadfun/api";
import type { TechnicalIndicators } from "./technical-analysis";
import type { WhaleAnalysis } from "./whale-analysis";
import type { MarketRegime } from "./market-regime";
import { technicalScoreAdjustment } from "./technical-analysis";
import { whaleScoreAdjustment } from "./whale-analysis";
import { regimeStrategyBonus } from "./market-regime";

export interface MarketSignal {
  tokenAddress: string;
  tokenSymbol: string;
  tokenName: string;
  score: number; // 0-100
  reasons: string[];
  metrics: Record<string, number | string>;
}

interface TokenContext {
  token: RecentToken;
  market: TokenMarketData | null;
  curveProgress?: number; // 0-10000 (0-100%)
  ageSeconds: number;
  technical?: TechnicalIndicators | null;
  whaleData?: WhaleAnalysis | null;
  regime?: MarketRegime;
}

/* ------------------------------------------------------------------ */
/*  Volume conversion: API returns wei, we need MON                    */
/* ------------------------------------------------------------------ */
function volumeToMon(raw: string | number): number {
  const wei = typeof raw === "string" ? parseFloat(raw) : raw;
  if (!wei || isNaN(wei)) return 0;
  return wei / 1e18;
}

/* ------------------------------------------------------------------ */
/*  Base scoring — shared foundation for all strategies                */
/*  Starts at 35 — tokens must EARN their way to the 75 threshold     */
/* ------------------------------------------------------------------ */
function baseScore(ctx: TokenContext): { score: number; reasons: string[] } {
  let score = 35;
  const reasons: string[] = [];

  if (!ctx.market) {
    return { score: 5, reasons: ["No market data available"] };
  }

  // Convert volume from wei to MON
  const vol = volumeToMon(ctx.market.volume_24h || "0");

  // Volume quality — 1 MON ≈ $0.017, so meaningful volume starts at 100K+ MON ($1.7K+)
  // Median active token volume: ~11M MON ($187K)
  if (vol > 10_000_000) {
    score += 15;
    reasons.push(`Massive volume: ${(vol / 1_000_000).toFixed(1)}M MON`);
  } else if (vol > 1_000_000) {
    score += 10;
    reasons.push(`Strong volume: ${(vol / 1_000_000).toFixed(1)}M MON`);
  } else if (vol > 100_000) {
    score += 6;
    reasons.push(`Good volume: ${(vol / 1000).toFixed(0)}K MON`);
  } else if (vol > 10_000) {
    score += 2;
    reasons.push(`Low volume: ${(vol / 1000).toFixed(0)}K MON`);
  }
  // < 10K MON ($170) = no bonus (dead token)

  // Holder quality (more holders = less rug risk)
  if (ctx.market.holder_count && ctx.market.holder_count > 100) {
    score += 10;
    reasons.push(`Strong holder base: ${ctx.market.holder_count}`);
  } else if (ctx.market.holder_count && ctx.market.holder_count > 30) {
    score += 6;
    reasons.push(`Decent holders: ${ctx.market.holder_count}`);
  } else if (ctx.market.holder_count && ctx.market.holder_count > 10) {
    score += 3;
    reasons.push(`Some holders: ${ctx.market.holder_count}`);
  }

  // Positive 1h momentum = safer entry
  if (ctx.market.price_change_1h && ctx.market.price_change_1h > 5) {
    score += 5;
    reasons.push(`Upward momentum: +${ctx.market.price_change_1h.toFixed(1)}%`);
  } else if (ctx.market.price_change_1h && ctx.market.price_change_1h < -10) {
    score -= 10;
    reasons.push(`Dumping: ${ctx.market.price_change_1h.toFixed(1)}%`);
  }

  // --- Technical Analysis adjustment ---
  if (ctx.technical) {
    const ta = technicalScoreAdjustment(ctx.technical, "base");
    score += ta.adjustment;
    reasons.push(...ta.reasons);
  }

  // --- Whale/Holder analysis adjustment ---
  if (ctx.whaleData) {
    const wa = whaleScoreAdjustment(ctx.whaleData, "base");
    score += wa.adjustment;
    reasons.push(...wa.reasons);
  }

  return { score, reasons };
}

// Strategy-specific TA + whale adjustments (applied on top of base)
function strategyOverlay(
  ctx: TokenContext,
  strategy: string,
  score: number,
  reasons: string[]
): { score: number; reasons: string[] } {
  // Strategy-specific TA weighting (different from base)
  if (ctx.technical) {
    const ta = technicalScoreAdjustment(ctx.technical, strategy);
    score += ta.adjustment;
    reasons.push(...ta.reasons);
  }

  // Strategy-specific whale weighting
  if (ctx.whaleData) {
    const wa = whaleScoreAdjustment(ctx.whaleData, strategy);
    score += wa.adjustment;
    reasons.push(...wa.reasons);
  }

  // Market regime bonus
  if (ctx.regime) {
    const rb = regimeStrategyBonus(ctx.regime, strategy);
    score += rb.adjustment;
    if (rb.reason) reasons.push(rb.reason);
  }

  return { score, reasons };
}

/* ================================================================== */
/*  SNIPER — Hunts NEWLY CREATED tokens                               */
/*  Fastest entry on fresh launches with early traction signals        */
/*  Key: age < 5min, first buyers, bonding curve momentum              */
/* ================================================================== */
export function scoreSniper(ctx: TokenContext): MarketSignal {
  let { score, reasons } = baseScore(ctx);
  const vol = volumeToMon(ctx.market?.volume_24h || "0");
  const holders = ctx.market?.holder_count || 0;

  // === AGE IS EVERYTHING for sniping ===
  // Under 2 minutes = prime sniping window
  // Even 500 MON ($8.5) volume on a brand-new token means someone is buying
  if (ctx.ageSeconds < 120) {
    if (vol > 5000) {
      score += 30;
      reasons.push(`Ultra-fresh token (${ctx.ageSeconds}s) with ${(vol / 1000).toFixed(1)}K MON — prime snipe`);
    } else if (vol > 500) {
      score += 20;
      reasons.push(`Fresh launch (${ctx.ageSeconds}s) — ${vol.toFixed(0)} MON initial buying`);
    } else if (vol > 100) {
      score += 10;
      reasons.push(`Very new (${ctx.ageSeconds}s) with small activity`);
    }
  }
  // 2-5 minutes = still early
  else if (ctx.ageSeconds < 300) {
    if (vol > 20_000 && holders > 5) {
      score += 25;
      reasons.push(`New token (${Math.floor(ctx.ageSeconds / 60)}m) with strong interest: ${holders} holders, ${(vol / 1000).toFixed(0)}K MON`);
    } else if (vol > 5000 && holders > 3) {
      score += 15;
      reasons.push(`New token (${Math.floor(ctx.ageSeconds / 60)}m): ${(vol / 1000).toFixed(1)}K MON, ${holders} holders`);
    } else if (vol > 1000) {
      score += 5;
      reasons.push(`Recently launched (${Math.floor(ctx.ageSeconds / 60)}m) with some activity`);
    }
  }
  // 5-10 minutes = late entry but needs more proof
  else if (ctx.ageSeconds < 600) {
    if (vol > 50_000 && holders > 10) {
      score += 15;
      reasons.push(`Early token (${Math.floor(ctx.ageSeconds / 60)}m) with confirmed demand: ${(vol / 1000).toFixed(0)}K MON`);
    }
  }
  // Over 10 minutes = not a snipe anymore
  else {
    score -= 20;
    reasons.push("Token too old for sniping");
  }

  // Fast holder growth on new token = very strong signal
  if (holders > 8 && ctx.ageSeconds < 180) {
    score += 15;
    reasons.push(`Rapid holder growth: ${holders} holders in ${Math.floor(ctx.ageSeconds / 60)}m`);
  } else if (holders > 5 && ctx.ageSeconds < 300) {
    score += 8;
    reasons.push(`Growing holders: ${holders} in ${Math.floor(ctx.ageSeconds / 60)}m`);
  }

  // Bonding curve progress on new token = real money flowing in
  if (ctx.curveProgress !== undefined && ctx.ageSeconds < 600) {
    const progressPct = ctx.curveProgress / 100;
    if (progressPct > 10) {
      score += 12;
      reasons.push(`Strong curve progress: ${progressPct.toFixed(1)}% — significant buying pressure`);
    } else if (progressPct > 3) {
      score += 6;
      reasons.push(`Early curve progress: ${progressPct.toFixed(1)}%`);
    }
  }

  // Positive early price action
  if (ctx.market?.price_change_1h && ctx.market.price_change_1h > 0 && ctx.ageSeconds < 600) {
    score += 5;
    reasons.push("Positive price since launch");
  }

  ({ score, reasons } = strategyOverlay(ctx, "sniper", score, reasons));
  return buildSignal(ctx, score, reasons);
}

/* ================================================================== */
/*  ALPHA HUNTER — Early-bird with volume proof                       */
/*  Targets 2-15 min old tokens that have proven initial demand        */
/* ================================================================== */
export function scoreAlphaHunter(ctx: TokenContext): MarketSignal {
  let { score, reasons } = baseScore(ctx);
  const vol = volumeToMon(ctx.market?.volume_24h || "0");
  const holders = ctx.market?.holder_count || 0;

  // Sweet spot: 2-15 minutes old with real volume ($170+ = 10K+ MON)
  if (ctx.ageSeconds >= 120 && ctx.ageSeconds < 300 && vol > 10_000) {
    score += 25;
    reasons.push(`Alpha window: ${Math.floor(ctx.ageSeconds / 60)}m old, ${(vol / 1000).toFixed(0)}K MON traded`);
  } else if (ctx.ageSeconds >= 300 && ctx.ageSeconds < 900 && vol > 50_000) {
    score += 15;
    reasons.push(`Early token with volume proof: ${Math.floor(ctx.ageSeconds / 60)}m old, ${(vol / 1000).toFixed(0)}K MON`);
  } else if (ctx.ageSeconds < 120 && vol > 2000) {
    score += 15;
    reasons.push(`Very new with activity: ${ctx.ageSeconds}s old, ${(vol / 1000).toFixed(1)}K MON`);
  } else if (ctx.ageSeconds > 1800) {
    score -= 15;
    reasons.push("Token too old for alpha hunting");
  }

  // Holder growth rate matters
  if (holders > 10 && ctx.ageSeconds < 600) {
    score += 10;
    reasons.push(`Fast adoption: ${holders} holders in ${Math.floor(ctx.ageSeconds / 60)}m`);
  }

  // Volume acceleration with price = confirmed interest
  if (vol > 50_000 && ctx.market?.price_change_1h && ctx.market.price_change_1h > 5) {
    score += 10;
    reasons.push(`Volume-backed pump: ${(vol / 1000).toFixed(0)}K MON + ${ctx.market.price_change_1h.toFixed(1)}%`);
  }

  ({ score, reasons } = strategyOverlay(ctx, "alpha_hunter", score, reasons));
  return buildSignal(ctx, score, reasons);
}

/* ================================================================== */
/*  DIAMOND HANDS — Long hold on strong, established projects          */
/*  High holders, consistent volume, positive multi-TF trends          */
/* ================================================================== */
export function scoreDiamondHands(ctx: TokenContext): MarketSignal {
  let { score, reasons } = baseScore(ctx);
  const vol = volumeToMon(ctx.market?.volume_24h || "0");
  const holders = ctx.market?.holder_count || 0;

  // Must be established (survived > 1 hour)
  if (ctx.ageSeconds > 3600) {
    score += 10;
    reasons.push("Established token (1h+)");
  } else {
    score -= 10;
    reasons.push("Too young for diamond hands");
  }

  // Strong holder base is essential
  if (holders > 200) {
    score += 15;
    reasons.push(`Excellent holder base: ${holders}`);
  } else if (holders > 50) {
    score += 8;
    reasons.push(`Good holder count: ${holders}`);
  } else if (holders < 20) {
    score -= 10;
    reasons.push("Insufficient holders for long hold");
  }

  // Consistent high volume = real project (need $850+ = 50K+ MON minimum)
  if (vol > 5_000_000) {
    score += 12;
    reasons.push(`Very high volume: ${(vol / 1_000_000).toFixed(1)}M MON`);
  } else if (vol > 500_000) {
    score += 8;
    reasons.push(`Consistent volume: ${(vol / 1000).toFixed(0)}K MON`);
  } else if (vol < 50_000) {
    score -= 5;
    reasons.push(`Weak volume for long hold: ${(vol / 1000).toFixed(0)}K MON`);
  }

  // Positive multi-timeframe trend
  if (ctx.market?.price_change_24h && ctx.market.price_change_24h > 0) {
    score += 8;
    reasons.push(`Positive 24h trend: +${ctx.market.price_change_24h.toFixed(1)}%`);
  }
  if (ctx.market?.price_change_1h && ctx.market.price_change_1h > 0) {
    score += 5;
    reasons.push(`Positive 1h trend: +${ctx.market.price_change_1h.toFixed(1)}%`);
  }

  // Graduated to DEX = strongest project signal
  if (ctx.market?.is_graduated) {
    score += 10;
    reasons.push("Graduated to DEX — proven demand");
  }

  ({ score, reasons } = strategyOverlay(ctx, "diamond_hands", score, reasons));
  return buildSignal(ctx, score, reasons);
}

/* ================================================================== */
/*  SWING TRADER — Buys upward swings with volume confirmation         */
/*  Technical-driven: EMA crossovers, RSI momentum zone                */
/* ================================================================== */
export function scoreSwingTrader(ctx: TokenContext): MarketSignal {
  let { score, reasons } = baseScore(ctx);
  const vol = volumeToMon(ctx.market?.volume_24h || "0");

  // Needs sufficient liquidity for clean entries/exits ($8.5K+ = 500K+ MON)
  if (vol < 100_000) {
    score -= 10;
    reasons.push("Insufficient liquidity for swing trade");
  } else if (vol > 1_000_000) {
    score += 8;
    reasons.push(`Good liquidity: ${(vol / 1_000_000).toFixed(1)}M MON`);
  }

  // Only buy UPWARD swings (not volatile dumps)
  if (ctx.market?.price_change_1h) {
    if (ctx.market.price_change_1h > 15) {
      score += 20;
      reasons.push(`Strong upswing: +${ctx.market.price_change_1h.toFixed(1)}% in 1h`);
    } else if (ctx.market.price_change_1h > 5) {
      score += 12;
      reasons.push(`Moderate upswing: +${ctx.market.price_change_1h.toFixed(1)}% in 1h`);
    } else if (ctx.market.price_change_1h < -5) {
      score -= 15;
      reasons.push(`Downswing — not buying: ${ctx.market.price_change_1h.toFixed(1)}%`);
    }
  }

  // Volume confirms the swing (not just low-liquidity noise)
  if (
    ctx.market?.price_change_1h && ctx.market.price_change_1h > 5 &&
    vol > 500_000
  ) {
    score += 10;
    reasons.push("Volume-confirmed price swing");
  }

  ({ score, reasons } = strategyOverlay(ctx, "swing_trader", score, reasons));
  return buildSignal(ctx, score, reasons);
}

/* ================================================================== */
/*  DEGEN APE — High risk meme plays (but not blind!)                  */
/*  Meme names + volume momentum = ape in                              */
/* ================================================================== */
export function scoreDegenApe(ctx: TokenContext): MarketSignal {
  let { score, reasons } = baseScore(ctx);
  const vol = volumeToMon(ctx.market?.volume_24h || "0");
  const holders = ctx.market?.holder_count || 0;

  // Love new tokens with activity (not dead launches, need $170+ = 10K+ MON)
  if (ctx.ageSeconds < 600 && vol > 10_000 && holders > 5) {
    score += 15;
    reasons.push(`Fresh active token — aping in: ${(vol / 1000).toFixed(0)}K MON vol, ${holders} holders`);
  }

  // Meme names get bonus (culture matters for meme tokens)
  const name = ctx.token.token_info.name.toLowerCase();
  const memeWords = ["meme", "pepe", "doge", "moon", "ape", "chad", "wojak", "based", "giga", "monkey", "cat", "dog", "frog", "nyan", "shib", "bonk", "cope", "wagmi"];
  if (memeWords.some((w) => name.includes(w))) {
    score += 8;
    reasons.push("Meme vibes detected");
  }

  // Big pump WITH volume = legit momentum (need $1.7K+ = 100K+ MON)
  if (
    ctx.market?.price_change_1h && ctx.market.price_change_1h > 30 &&
    vol > 1_000_000
  ) {
    score += 20;
    reasons.push(`Volume-backed moon: +${ctx.market.price_change_1h.toFixed(1)}% with ${(vol / 1_000_000).toFixed(1)}M MON`);
  } else if (
    ctx.market?.price_change_1h && ctx.market.price_change_1h > 15 &&
    vol > 100_000
  ) {
    score += 12;
    reasons.push(`Pumping with volume: +${ctx.market.price_change_1h.toFixed(1)}%, ${(vol / 1000).toFixed(0)}K MON`);
  } else if (ctx.market?.price_change_1h && ctx.market.price_change_1h > 10 && vol > 50_000) {
    score += 5;
    reasons.push(`Pumping: +${ctx.market.price_change_1h.toFixed(1)}%`);
  }

  // Holder growth on meme = organic interest
  if (holders > 20 && ctx.ageSeconds < 1800) {
    score += 8;
    reasons.push(`${holders} holders in ${Math.floor(ctx.ageSeconds / 60)}m — organic growth`);
  }

  ({ score, reasons } = strategyOverlay(ctx, "degen_ape", score, reasons));
  return buildSignal(ctx, score, reasons);
}

/* ================================================================== */
/*  VOLUME WATCHER — Follows volume spikes and anomalies               */
/*  Primary signal: volume magnitude and acceleration                  */
/* ================================================================== */
export function scoreVolumeWatcher(ctx: TokenContext): MarketSignal {
  let { score, reasons } = baseScore(ctx);
  const vol = volumeToMon(ctx.market?.volume_24h || "0");

  // Volume tiers — median active token: 11M MON ($187K)
  if (vol > 50_000_000) {
    score += 25;
    reasons.push(`Massive volume: ${(vol / 1_000_000).toFixed(0)}M MON`);
  } else if (vol > 5_000_000) {
    score += 18;
    reasons.push(`Very high volume: ${(vol / 1_000_000).toFixed(1)}M MON`);
  } else if (vol > 1_000_000) {
    score += 12;
    reasons.push(`Strong volume: ${(vol / 1_000_000).toFixed(1)}M MON`);
  } else if (vol > 100_000) {
    score += 5;
    reasons.push(`Moderate volume: ${(vol / 1000).toFixed(0)}K MON`);
  }

  // Volume + price increase = strong buy signal
  if (
    ctx.market?.price_change_1h && ctx.market.price_change_1h > 5 &&
    vol > 1_000_000
  ) {
    score += 15;
    reasons.push("Volume-confirmed price increase");
  }

  // Volume + positive 24h = sustained momentum
  if (
    ctx.market?.price_change_24h && ctx.market.price_change_24h > 0 &&
    vol > 5_000_000
  ) {
    score += 8;
    reasons.push("Sustained volume with positive 24h trend");
  }

  ({ score, reasons } = strategyOverlay(ctx, "volume_watcher", score, reasons));
  return buildSignal(ctx, score, reasons);
}

/* ================================================================== */
/*  TREND FOLLOWER — Rides momentum across timeframes                  */
/*  Multi-TF alignment, EMA confirmation, don't fight the trend        */
/* ================================================================== */
export function scoreTrendFollower(ctx: TokenContext): MarketSignal {
  let { score, reasons } = baseScore(ctx);
  const vol = volumeToMon(ctx.market?.volume_24h || "0");

  // Need minimum liquidity ($1.7K+ = 100K+ MON)
  if (vol < 100_000) {
    score -= 8;
    reasons.push("Low liquidity for trend following");
  }

  // Strong 1h uptrend
  if (ctx.market?.price_change_1h && ctx.market.price_change_1h > 10) {
    score += 18;
    reasons.push(`Strong 1h trend: +${ctx.market.price_change_1h.toFixed(1)}%`);
  } else if (ctx.market?.price_change_1h && ctx.market.price_change_1h > 3) {
    score += 8;
    reasons.push(`Positive 1h: +${ctx.market.price_change_1h.toFixed(1)}%`);
  }

  // Strong 24h uptrend
  if (ctx.market?.price_change_24h && ctx.market.price_change_24h > 20) {
    score += 12;
    reasons.push(`Strong 24h trend: +${ctx.market.price_change_24h.toFixed(1)}%`);
  } else if (ctx.market?.price_change_24h && ctx.market.price_change_24h > 5) {
    score += 6;
    reasons.push(`Positive 24h: +${ctx.market.price_change_24h.toFixed(1)}%`);
  }

  // Multi-timeframe alignment = strongest signal
  if (
    ctx.market?.price_change_1h && ctx.market.price_change_1h > 3 &&
    ctx.market?.price_change_24h && ctx.market.price_change_24h > 0
  ) {
    score += 12;
    reasons.push("Multi-timeframe trend alignment");
  }

  // Don't chase downtrends
  if (ctx.market?.price_change_1h && ctx.market.price_change_1h < -5) {
    score -= 20;
    reasons.push("Downtrend — avoiding");
  }

  ({ score, reasons } = strategyOverlay(ctx, "trend_follower", score, reasons));
  return buildSignal(ctx, score, reasons);
}

/* ================================================================== */
/*  CONTRARIAN — Buys quality dips on established tokens               */
/*  Requires: high holders + volume + oversold conditions               */
/* ================================================================== */
export function scoreContrarian(ctx: TokenContext): MarketSignal {
  let { score, reasons } = baseScore(ctx);
  const vol = volumeToMon(ctx.market?.volume_24h || "0");
  const holders = ctx.market?.holder_count || 0;

  // MUST have proven demand — dip buying a dead token is suicide ($1.7K+ = 100K+ MON)
  if (vol < 100_000 || holders < 20) {
    score -= 20;
    reasons.push("Insufficient liquidity/holders for contrarian play");
  }

  // Oversold = buy opportunity on quality tokens
  if (ctx.market?.price_change_1h && ctx.market.price_change_1h < -15 && holders > 50) {
    score += 25;
    reasons.push(`Deeply oversold quality token: ${ctx.market.price_change_1h.toFixed(1)}% drop, ${holders} holders`);
  } else if (ctx.market?.price_change_1h && ctx.market.price_change_1h < -8 && holders > 20) {
    score += 15;
    reasons.push(`Dipping with holder base: ${ctx.market.price_change_1h.toFixed(1)}%, ${holders} holders`);
  } else if (ctx.market?.price_change_1h && ctx.market.price_change_1h < -5 && holders > 15) {
    score += 8;
    reasons.push(`Minor dip: ${ctx.market.price_change_1h.toFixed(1)}%`);
  }

  // Recovery after dump = best mean reversion signal
  if (
    ctx.market?.price_change_24h && ctx.market.price_change_24h < -20 &&
    ctx.market?.price_change_1h && ctx.market.price_change_1h > 0
  ) {
    score += 20;
    reasons.push("Recovery after dump — mean reversion play");
  }

  // Overpumped = avoid (would sell, not buy)
  if (ctx.market?.price_change_1h && ctx.market.price_change_1h > 30) {
    score -= 15;
    reasons.push("Overpumped — would sell, not buy");
  }

  // Graduated tokens are safer for dip buying
  if (ctx.market?.is_graduated && vol > 500_000) {
    score += 8;
    reasons.push("Graduated token on dip — higher recovery chance");
  }

  ({ score, reasons } = strategyOverlay(ctx, "contrarian", score, reasons));
  return buildSignal(ctx, score, reasons);
}

/* ================================================================== */
/*  Build the final signal object                                      */
/* ================================================================== */
function buildSignal(ctx: TokenContext, score: number, reasons: string[]): MarketSignal {
  return {
    tokenAddress: ctx.token.token_info.token_id,
    tokenSymbol: ctx.token.token_info.symbol,
    tokenName: ctx.token.token_info.name,
    score: Math.max(0, Math.min(100, score)),
    reasons,
    metrics: {
      age: ctx.ageSeconds,
      price: ctx.market?.price || "0",
      volume24h: ctx.market?.volume_24h || "0",
      volumeMon: volumeToMon(ctx.market?.volume_24h || "0"),
      priceChange1h: ctx.market?.price_change_1h || 0,
      priceChange24h: ctx.market?.price_change_24h || 0,
      holderCount: ctx.market?.holder_count || 0,
      curveProgress: ctx.curveProgress || 0,
      // TA summary
      rsi: ctx.technical?.rsi ?? "N/A",
      emaCrossover: ctx.technical?.emaCrossover ?? "N/A",
      vwap: ctx.technical?.vwap ?? "N/A",
      volumeTrend: ctx.technical?.volumeTrend ?? "N/A",
      // Whale summary
      holderConcentration: ctx.whaleData?.concentration ?? "N/A",
      top5HolderPct: ctx.whaleData?.top5Pct ?? "N/A",
      // Regime
      marketRegime: ctx.regime ?? "unknown",
    },
  };
}

// Strategy to scorer map
export const STRATEGY_SCORERS: Record<
  string,
  (ctx: TokenContext) => MarketSignal
> = {
  alpha_hunter: scoreAlphaHunter,
  diamond_hands: scoreDiamondHands,
  swing_trader: scoreSwingTrader,
  degen_ape: scoreDegenApe,
  volume_watcher: scoreVolumeWatcher,
  trend_follower: scoreTrendFollower,
  contrarian: scoreContrarian,
  sniper: scoreSniper,
};

export { volumeToMon };
export type { TokenContext };
