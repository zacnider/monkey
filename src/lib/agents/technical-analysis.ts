/**
 * Technical analysis indicators computed from chart data.
 * Used by the signal engine to make smarter buy/sell decisions.
 */

export interface ChartCandle {
  timestamp: number;
  price: string;
  volume: string;
}

export interface TechnicalIndicators {
  rsi: number | null;            // 0-100 (>70 overbought, <30 oversold)
  smaShort: number | null;       // 5-period simple moving average
  smaLong: number | null;        // 20-period simple moving average
  emaShort: number | null;       // 5-period exponential moving average
  emaLong: number | null;        // 20-period exponential moving average
  vwap: number | null;           // Volume-weighted average price
  currentPrice: number;
  priceVsVwap: number | null;    // % above/below VWAP
  smaCrossover: "bullish" | "bearish" | "neutral"; // SMA short vs long
  emaCrossover: "bullish" | "bearish" | "neutral"; // EMA short vs long
  volatility: number | null;     // Standard deviation of returns
  volumeTrend: "increasing" | "decreasing" | "stable"; // Recent volume direction
  momentum: number | null;       // Rate of change (%)
}

/**
 * Calculate RSI (Relative Strength Index)
 * RSI = 100 - (100 / (1 + RS)), where RS = avgGain / avgLoss
 */
function calculateRSI(prices: number[], period: number = 14): number | null {
  if (prices.length < period + 1) return null;

  const changes: number[] = [];
  for (let i = 1; i < prices.length; i++) {
    changes.push(prices[i] - prices[i - 1]);
  }

  // Use last `period` changes
  const recentChanges = changes.slice(-period);

  let avgGain = 0;
  let avgLoss = 0;

  for (const change of recentChanges) {
    if (change > 0) avgGain += change;
    else avgLoss += Math.abs(change);
  }

  avgGain /= period;
  avgLoss /= period;

  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - 100 / (1 + rs);
}

/**
 * Calculate Simple Moving Average
 */
function calculateSMA(prices: number[], period: number): number | null {
  if (prices.length < period) return null;
  const slice = prices.slice(-period);
  return slice.reduce((sum, p) => sum + p, 0) / period;
}

/**
 * Calculate Exponential Moving Average
 */
function calculateEMA(prices: number[], period: number): number | null {
  if (prices.length < period) return null;

  const multiplier = 2 / (period + 1);
  // Start with SMA for first EMA value
  let ema = prices.slice(0, period).reduce((sum, p) => sum + p, 0) / period;

  for (let i = period; i < prices.length; i++) {
    ema = (prices[i] - ema) * multiplier + ema;
  }
  return ema;
}

/**
 * Calculate VWAP (Volume-Weighted Average Price)
 * VWAP = Σ(price × volume) / Σ(volume)
 */
function calculateVWAP(
  prices: number[],
  volumes: number[]
): number | null {
  if (prices.length === 0 || volumes.length === 0) return null;

  let cumPriceVolume = 0;
  let cumVolume = 0;

  for (let i = 0; i < prices.length; i++) {
    const vol = volumes[i] || 0;
    cumPriceVolume += prices[i] * vol;
    cumVolume += vol;
  }

  if (cumVolume === 0) return null;
  return cumPriceVolume / cumVolume;
}

/**
 * Calculate price volatility (standard deviation of returns)
 */
function calculateVolatility(prices: number[]): number | null {
  if (prices.length < 3) return null;

  const returns: number[] = [];
  for (let i = 1; i < prices.length; i++) {
    if (prices[i - 1] > 0) {
      returns.push((prices[i] - prices[i - 1]) / prices[i - 1]);
    }
  }

  if (returns.length === 0) return null;

  const mean = returns.reduce((s, r) => s + r, 0) / returns.length;
  const variance =
    returns.reduce((s, r) => s + (r - mean) ** 2, 0) / returns.length;
  return Math.sqrt(variance);
}

/**
 * Determine volume trend from recent candles
 */
function getVolumeTrend(
  volumes: number[]
): "increasing" | "decreasing" | "stable" {
  if (volumes.length < 4) return "stable";

  const recent = volumes.slice(-3);
  const prior = volumes.slice(-6, -3);

  if (prior.length === 0) return "stable";

  const recentAvg = recent.reduce((s, v) => s + v, 0) / recent.length;
  const priorAvg = prior.reduce((s, v) => s + v, 0) / prior.length;

  if (priorAvg === 0) return recentAvg > 0 ? "increasing" : "stable";

  const change = (recentAvg - priorAvg) / priorAvg;
  if (change > 0.2) return "increasing";
  if (change < -0.2) return "decreasing";
  return "stable";
}

/**
 * Compute all technical indicators from chart candle data
 */
export function computeIndicators(candles: ChartCandle[]): TechnicalIndicators {
  const prices = candles.map((c) => parseFloat(c.price)).filter((p) => p > 0);
  const volumes = candles.map((c) => parseFloat(c.volume)).filter((v) => !isNaN(v));

  const currentPrice = prices.length > 0 ? prices[prices.length - 1] : 0;

  const rsi = calculateRSI(prices, 14);
  const smaShort = calculateSMA(prices, 5);
  const smaLong = calculateSMA(prices, 20);
  const emaShort = calculateEMA(prices, 5);
  const emaLong = calculateEMA(prices, 20);
  const vwap = calculateVWAP(prices, volumes);
  const volatility = calculateVolatility(prices);

  // Crossover signals
  let smaCrossover: "bullish" | "bearish" | "neutral" = "neutral";
  if (smaShort !== null && smaLong !== null) {
    if (smaShort > smaLong * 1.01) smaCrossover = "bullish";
    else if (smaShort < smaLong * 0.99) smaCrossover = "bearish";
  }

  let emaCrossover: "bullish" | "bearish" | "neutral" = "neutral";
  if (emaShort !== null && emaLong !== null) {
    if (emaShort > emaLong * 1.01) emaCrossover = "bullish";
    else if (emaShort < emaLong * 0.99) emaCrossover = "bearish";
  }

  // Price vs VWAP
  let priceVsVwap: number | null = null;
  if (vwap !== null && vwap > 0) {
    priceVsVwap = ((currentPrice - vwap) / vwap) * 100;
  }

  // Momentum (rate of change over last 5 candles)
  let momentum: number | null = null;
  if (prices.length >= 6) {
    const oldPrice = prices[prices.length - 6];
    if (oldPrice > 0) {
      momentum = ((currentPrice - oldPrice) / oldPrice) * 100;
    }
  }

  return {
    rsi,
    smaShort,
    smaLong,
    emaShort,
    emaLong,
    vwap,
    currentPrice,
    priceVsVwap,
    smaCrossover,
    emaCrossover,
    volatility,
    volumeTrend: getVolumeTrend(volumes),
    momentum,
  };
}

/**
 * Generate a score adjustment (-30 to +30) based on technical indicators.
 * Different strategies weight indicators differently.
 */
export function technicalScoreAdjustment(
  ta: TechnicalIndicators,
  strategy: string
): { adjustment: number; reasons: string[] } {
  let adjustment = 0;
  const reasons: string[] = [];

  if (!ta.rsi && !ta.vwap && !ta.smaShort) {
    return { adjustment: 0, reasons: ["Insufficient chart data for TA"] };
  }

  // --- RSI ---
  if (ta.rsi !== null) {
    if (strategy === "contrarian") {
      // Contrarian loves oversold
      if (ta.rsi < 25) {
        adjustment += 20;
        reasons.push(`RSI deeply oversold (${ta.rsi.toFixed(0)}) - contrarian buy`);
      } else if (ta.rsi < 35) {
        adjustment += 10;
        reasons.push(`RSI oversold (${ta.rsi.toFixed(0)})`);
      } else if (ta.rsi > 75) {
        adjustment -= 15;
        reasons.push(`RSI overbought (${ta.rsi.toFixed(0)}) - avoid buying`);
      }
    } else if (strategy === "trend_follower" || strategy === "swing_trader") {
      // Trend followers prefer mid-range RSI (momentum zone)
      if (ta.rsi >= 40 && ta.rsi <= 65) {
        adjustment += 10;
        reasons.push(`RSI in momentum zone (${ta.rsi.toFixed(0)})`);
      } else if (ta.rsi > 80) {
        adjustment -= 15;
        reasons.push(`RSI overbought (${ta.rsi.toFixed(0)}) - overextended`);
      } else if (ta.rsi < 25) {
        adjustment -= 10;
        reasons.push(`RSI deeply oversold (${ta.rsi.toFixed(0)}) - no momentum`);
      }
    } else {
      // General RSI logic for other strategies
      if (ta.rsi > 80) {
        adjustment -= 10;
        reasons.push(`RSI overbought (${ta.rsi.toFixed(0)})`);
      } else if (ta.rsi < 25) {
        adjustment += 5;
        reasons.push(`RSI oversold (${ta.rsi.toFixed(0)})`);
      }
    }
  }

  // --- Moving Average Crossovers ---
  if (ta.emaCrossover !== "neutral") {
    if (strategy === "trend_follower" || strategy === "swing_trader") {
      if (ta.emaCrossover === "bullish") {
        adjustment += 15;
        reasons.push("EMA bullish crossover (short > long)");
      } else {
        adjustment -= 15;
        reasons.push("EMA bearish crossover (short < long)");
      }
    } else {
      if (ta.emaCrossover === "bullish") {
        adjustment += 8;
        reasons.push("EMA bullish signal");
      } else {
        adjustment -= 8;
        reasons.push("EMA bearish signal");
      }
    }
  }

  // --- VWAP ---
  if (ta.priceVsVwap !== null) {
    if (strategy === "contrarian") {
      // Contrarian buys below VWAP
      if (ta.priceVsVwap < -5) {
        adjustment += 10;
        reasons.push(`Price ${ta.priceVsVwap.toFixed(1)}% below VWAP - undervalued`);
      }
    } else if (strategy === "volume_watcher" || strategy === "trend_follower") {
      // These strategies like price above VWAP (buyer control)
      if (ta.priceVsVwap > 3) {
        adjustment += 8;
        reasons.push(`Price ${ta.priceVsVwap.toFixed(1)}% above VWAP - buyers in control`);
      } else if (ta.priceVsVwap < -5) {
        adjustment -= 5;
        reasons.push(`Price ${Math.abs(ta.priceVsVwap).toFixed(1)}% below VWAP`);
      }
    }
  }

  // --- Volume Trend ---
  if (ta.volumeTrend === "increasing") {
    if (strategy === "volume_watcher") {
      adjustment += 12;
      reasons.push("Volume trending up - confirming move");
    } else {
      adjustment += 5;
      reasons.push("Increasing volume");
    }
  } else if (ta.volumeTrend === "decreasing") {
    if (strategy === "volume_watcher") {
      adjustment -= 10;
      reasons.push("Volume declining - weak conviction");
    } else {
      adjustment -= 3;
      reasons.push("Declining volume");
    }
  }

  // --- Momentum ---
  if (ta.momentum !== null) {
    if (strategy === "alpha_hunter" || strategy === "degen_ape") {
      if (ta.momentum > 15) {
        adjustment += 10;
        reasons.push(`Strong momentum: +${ta.momentum.toFixed(1)}%`);
      }
    } else if (strategy === "contrarian") {
      if (ta.momentum < -15) {
        adjustment += 10;
        reasons.push(`Dropping fast (${ta.momentum.toFixed(1)}%) - reversion opportunity`);
      }
    }
  }

  // --- Volatility ---
  if (ta.volatility !== null) {
    if (strategy === "swing_trader") {
      if (ta.volatility > 0.1) {
        adjustment += 8;
        reasons.push(`High volatility (${(ta.volatility * 100).toFixed(1)}%) - swing opportunity`);
      }
    } else if (strategy === "diamond_hands") {
      if (ta.volatility > 0.2) {
        adjustment -= 8;
        reasons.push(`Too volatile (${(ta.volatility * 100).toFixed(1)}%) for long hold`);
      }
    }
  }

  // Clamp adjustment
  adjustment = Math.max(-30, Math.min(30, adjustment));

  return { adjustment, reasons };
}
