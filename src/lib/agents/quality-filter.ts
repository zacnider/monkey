/**
 * QUALITY FILTER - Katı kalite kontrolü
 *
 * 18% win rate kabul edilemez. Bu filtre SADECE KALİTELİ tokenları geçirir.
 */

import type { RecentToken } from "@/lib/nadfun/api";

export interface QualityCheckResult {
  passed: boolean;
  reason?: string;
  score: number; // 0-100, quality score
}

/**
 * STRICT quality check - tokenin gerçekten trade'e değer olup olmadığını kontrol et
 */
export function checkTokenQuality(token: RecentToken): QualityCheckResult {
  const info = token.token_info;
  const market = token.market_info;

  if (!market) {
    return { passed: false, reason: "No market data", score: 0 };
  }

  // ========================================
  // HARD REQUIREMENTS (bunlar OLMALI)
  // ========================================

  // 1. MİNİMUM LİKİDİTE: 3+ MON reserve (RELAXED for low volume market)
  const reserve = parseFloat(market.reserve_native || "0") / 1e18;
  if (reserve < 3) {
    return {
      passed: false,
      reason: `Insufficient liquidity: ${reserve.toFixed(1)} MON (need 3+)`,
      score: 0
    };
  }

  // 2. MİNİMUM HOLDERS: 30+ (RELAXED for low volume market)
  const holders = market.holder_count || 0;
  if (holders < 30) {
    return {
      passed: false,
      reason: `Too few holders: ${holders} (need 30+)`,
      score: 0
    };
  }

  // 3. GRADUATED TOKEN: Not strictly required in low volume market
  // Bonding curve tokens can be good opportunities if other metrics are strong
  const isGraduated = market.market_type === "DEX";
  // No hard rejection here - just score it later

  // 4. TOKEN YAŞI: En az 2 saat (RELAXED - fresh tokens can have opportunity)
  const ageSeconds = Math.floor(Date.now() / 1000) - info.created_at;
  const ageHours = ageSeconds / 3600;
  if (ageHours < 2) {
    return {
      passed: false,
      reason: `Too young: ${ageHours.toFixed(1)}h (need 2h+)`,
      score: 0
    };
  }

  // 5. FİYAT: Pozitif değer
  const price = parseFloat(market.price || "0");
  if (price <= 0) {
    return {
      passed: false,
      reason: "Invalid price",
      score: 0
    };
  }

  // ========================================
  // QUALITY SCORING (0-100)
  // ========================================

  let score = 50; // Base score

  // Price stability (recent price change from token.percent)
  const priceChange1h = token.percent || 0;

  // POZİTİF price action ÖNEMLİ
  if (priceChange1h > 10) {
    score += 20; // Strong uptrend
  } else if (priceChange1h > 0) {
    score += 10; // Mild uptrend
  } else if (priceChange1h > -5) {
    score += 5; // Stable
  } else if (priceChange1h > -15) {
    score -= 10; // Mild dump
  } else {
    // DUMPING token - çok riskli
    return {
      passed: false,
      reason: `Dumping hard: ${priceChange1h.toFixed(1)}% in 1h`,
      score: 0
    };
  }

  // Holder strength (daha fazla = daha iyi)
  if (holders > 500) {
    score += 15; // Very strong community
  } else if (holders > 200) {
    score += 10; // Strong community
  } else if (holders > 100) {
    score += 5; // Decent community
  }

  // Liquidity depth
  if (reserve > 100) {
    score += 15; // Very deep liquidity
  } else if (reserve > 50) {
    score += 10; // Good liquidity
  } else if (reserve > 25) {
    score += 5; // Okay liquidity
  }

  // Age maturity
  if (ageHours > 72) {
    score += 10; // Established token (3+ days)
  } else if (ageHours > 24) {
    score += 5; // 1+ day
  }

  // Volume check - SUSTAINABLE volume, not dump volume
  const volume24h = parseFloat(market.volume || "0") / 1e18;
  const volumeToReserveRatio = volume24h / reserve;

  if (volumeToReserveRatio > 20) {
    // TOO MUCH volume relative to liquidity = likely dumping
    score -= 15;
  } else if (volumeToReserveRatio > 5 && volumeToReserveRatio <= 10) {
    // Healthy activity
    score += 10;
  } else if (volumeToReserveRatio > 2 && volumeToReserveRatio <= 5) {
    // Moderate activity
    score += 5;
  }

  // Final score capping
  score = Math.max(0, Math.min(100, score));

  // Minimum quality threshold: 60/100
  if (score < 60) {
    return {
      passed: false,
      reason: `Low quality score: ${score}/100 (need 60+)`,
      score
    };
  }

  return {
    passed: true,
    score
  };
}

/**
 * Format quality check for logging
 */
export function formatQualityCheck(token: RecentToken, result: QualityCheckResult): string {
  const symbol = token.token_info.symbol;
  const market = token.market_info;

  if (!result.passed) {
    return `❌ ${symbol}: ${result.reason}`;
  }

  const reserve = parseFloat(market?.reserve_native || "0") / 1e18;
  const holders = market?.holder_count || 0;
  const priceChange = token.percent || 0;

  return `✅ ${symbol}: Quality ${result.score}/100 | Reserve: ${reserve.toFixed(1)} MON | Holders: ${holders} | Change: ${priceChange > 0 ? '+' : ''}${priceChange.toFixed(1)}%`;
}
