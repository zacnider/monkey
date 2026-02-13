/**
 * Post-Buy Monitoring System
 *
 * LOW VOLUME MARKET STRATEGY:
 * - Monitor token momentum AFTER we buy
 * - Wait 15-30min minimum for tokens to develop
 * - Target 15-25%+ gains, hold longer positions
 * - Stop loss at -5% after 30min minimum
 */

import { getTokenPrice, getTokenHolders } from "../nadfun/api";
import { deadTokenBlacklist } from "./dead-token-blacklist";

interface BuyMetrics {
  tokenAddress: string;
  tokenSymbol?: string;
  buyTime: number;
  buyPrice: number;
  buyHolderCount: number;
  buyVolume: number;
  buyCurveProgress: number;
}

interface MomentumSnapshot {
  timestamp: number;
  holderCount: number;
  volume: number;
  price: number;
  curveProgress: number;
}

interface MonitoringResult {
  action: "HOLD" | "SELL_DEMAND_SPIKE" | "SELL_DEAD_TOKEN" | "SELL_MOMENTUM_DYING";
  reason: string;
  confidence: number; // 0-100
  metrics?: {
    holderGrowth: number;
    volumeGrowth: number;
    priceChange: number;
    momentum: "ACCELERATING" | "STABLE" | "DYING" | "DEAD";
  };
}

export class PostBuyMonitor {
  private snapshots: Map<string, MomentumSnapshot[]> = new Map();
  private twoMinCheckDone: Map<string, boolean> = new Map(); // Track if 2min check already done
  private fiveMinCheckDone: Map<string, boolean> = new Map(); // Track if 5min check already done

  /**
   * Start monitoring a token after buying
   */
  async startMonitoring(buyMetrics: BuyMetrics): Promise<void> {
    this.snapshots.set(buyMetrics.tokenAddress, [
      {
        timestamp: buyMetrics.buyTime,
        holderCount: buyMetrics.buyHolderCount,
        volume: buyMetrics.buyVolume,
        price: buyMetrics.buyPrice,
        curveProgress: buyMetrics.buyCurveProgress,
      },
    ]);
  }

  /**
   * Check token momentum at specific intervals (15min, 30min) - LOW VOLUME STRATEGY
   */
  async checkMomentum(
    tokenAddress: string,
    buyMetrics: BuyMetrics
  ): Promise<MonitoringResult> {
    const elapsedSeconds = (Date.now() - buyMetrics.buyTime) / 1000;
    const elapsedMin = (elapsedSeconds / 60).toFixed(1);

    console.log(`[PostBuyMonitor] checkMomentum called for ${tokenAddress.substring(0, 10)}... (elapsed: ${elapsedMin}min)`);

    try {
      // Get current metrics (combine price + holders data)
      const [marketData, holdersData] = await Promise.all([
        getTokenPrice(tokenAddress),
        getTokenHolders(tokenAddress).catch(() => null),
      ]);

      if (!marketData) {
        console.log(`[PostBuyMonitor] No market data available for ${tokenAddress.substring(0, 10)}...`);
        return {
          action: "HOLD",
          reason: "Unable to fetch token data",
          confidence: 0,
        };
      }

      const currentPrice = parseFloat(marketData.price);
      const currentVolume = parseFloat(marketData.volume_24h || "0");
      const currentHolders = marketData.holder_count || (holdersData?.length ?? buyMetrics.buyHolderCount);

      // Add snapshot
      const snapshots = this.snapshots.get(tokenAddress) || [];
      snapshots.push({
        timestamp: Date.now(),
        holderCount: currentHolders,
        volume: currentVolume,
        price: currentPrice,
        curveProgress: 0, // Not available in quick check
      });
      this.snapshots.set(tokenAddress, snapshots);

      // Calculate growth metrics
      const holderGrowth = currentHolders - buyMetrics.buyHolderCount;
      const volumeGrowth = currentVolume / buyMetrics.buyVolume;
      const priceChange = ((currentPrice - buyMetrics.buyPrice) / buyMetrics.buyPrice) * 100;

      console.log(`[PostBuyMonitor] Metrics: holders ${buyMetrics.buyHolderCount}→${currentHolders} (+${holderGrowth}), price ${priceChange.toFixed(1)}%`);

      // === EARLY CHECK (15+ minutes) - LOW VOLUME MARKET: Need more time for tokens to develop ===
      if (elapsedSeconds >= 900 && !this.twoMinCheckDone.get(tokenAddress)) {
        this.twoMinCheckDone.set(tokenAddress, true);
        console.log(`[PostBuyMonitor] 🔥 EARLY CHECK (${elapsedMin}min)`);

        // Strong demand spike: 30+ new holders AND 15%+ price gain (LOW VOLUME: meaningful moves take time)
        if (holderGrowth >= 30 && priceChange >= 15) {
          return {
            action: "SELL_DEMAND_SPIKE",
            reason: `Strong post-buy demand: +${holderGrowth} holders, +${priceChange.toFixed(1)}% price in ${elapsedMin}min`,
            confidence: 95,
            metrics: {
              holderGrowth,
              volumeGrowth,
              priceChange,
              momentum: "ACCELERATING",
            },
          };
        }

        // Moderate demand: 15+ holders AND 10%+ price (LOW VOLUME: quality over speed)
        if (holderGrowth >= 15 && priceChange >= 10) {
          return {
            action: "SELL_DEMAND_SPIKE",
            reason: `Good follow-up: +${holderGrowth} holders, +${priceChange.toFixed(1)}% in ${elapsedMin}min`,
            confidence: 85,
            metrics: {
              holderGrowth,
              volumeGrowth,
              priceChange,
              momentum: "ACCELERATING",
            },
          };
        }

        // Dead token: Less than 5 new holders in 15min AND losing money (LOW VOLUME: give tokens time)
        if (holderGrowth <= 4 && priceChange < -3) {
          // Add to blacklist to prevent re-buying
          deadTokenBlacklist.add(
            tokenAddress,
            buyMetrics.tokenSymbol || tokenAddress.substring(0, 10),
            holderGrowth,
            `Dead launch: only +${holderGrowth} holders in ${elapsedMin}min`
          );

          return {
            action: "SELL_DEAD_TOKEN",
            reason: `No follow-up buyers: only +${holderGrowth} holders in ${elapsedMin}min - dead launch`,
            confidence: 90,
            metrics: {
              holderGrowth,
              volumeGrowth,
              priceChange,
              momentum: "DEAD",
            },
          };
        }
      }

      // === MID CHECK (30+ minutes) - LOW VOLUME MARKET: Patient approach ===
      if (elapsedSeconds >= 1800 && !this.fiveMinCheckDone.get(tokenAddress)) {
        this.fiveMinCheckDone.set(tokenAddress, true);
        console.log(`[PostBuyMonitor] 🔥 MID CHECK (${elapsedMin}min)`);

        // Massive pump: 50+ holders AND 25%+ gain (LOW VOLUME: meaningful pumps are rare but big)
        if (holderGrowth >= 50 && priceChange >= 25) {
          return {
            action: "SELL_DEMAND_SPIKE",
            reason: `Massive pump detected: +${holderGrowth} holders, +${priceChange.toFixed(1)}% in ${elapsedMin}min`,
            confidence: 98,
            metrics: {
              holderGrowth,
              volumeGrowth,
              priceChange,
              momentum: "ACCELERATING",
            },
          };
        }

        // Momentum dying: Less than 8 holders in 30min AND price down (LOW VOLUME: be patient)
        if (holderGrowth <= 7 && priceChange < -2) {
          // Add to blacklist to prevent re-buying
          deadTokenBlacklist.add(
            tokenAddress,
            buyMetrics.tokenSymbol || tokenAddress.substring(0, 10),
            holderGrowth,
            `Momentum dying: only +${holderGrowth} holders in ${elapsedMin}min`
          );

          return {
            action: "SELL_MOMENTUM_DYING",
            reason: `Momentum dead: only +${holderGrowth} holders in ${elapsedMin}min, price ${priceChange > 0 ? '+' : ''}${priceChange.toFixed(1)}%`,
            confidence: 85,
            metrics: {
              holderGrowth,
              volumeGrowth,
              priceChange,
              momentum: "DYING",
            },
          };
        }
      }

      // === MOMENTUM ANALYSIS (any time after 10min) - LOW VOLUME: Need time to see real trends ===
      if (elapsedSeconds >= 600 && snapshots.length >= 3) {
        const momentum = this.analyzeMomentumTrend(snapshots);

        // Momentum accelerating with good profit → take it (LOW VOLUME: target 20%+ gains)
        if (momentum === "ACCELERATING" && priceChange >= 20) {
          return {
            action: "SELL_DEMAND_SPIKE",
            reason: `Accelerating momentum with +${priceChange.toFixed(1)}% gain - selling into strength`,
            confidence: 90,
            metrics: {
              holderGrowth,
              volumeGrowth,
              priceChange,
              momentum: "ACCELERATING",
            },
          };
        }

        // Momentum dying and losing → cut loss (LOW VOLUME: -5% stop loss after 30min)
        if (momentum === "DYING" && priceChange < -5 && elapsedSeconds >= 1800) {
          return {
            action: "SELL_MOMENTUM_DYING",
            reason: `Dying momentum with -${Math.abs(priceChange).toFixed(1)}% loss - cutting at stop loss`,
            confidence: 80,
            metrics: {
              holderGrowth,
              volumeGrowth,
              priceChange,
              momentum: "DYING",
            },
          };
        }
      }

      // Default: continue holding
      return {
        action: "HOLD",
        reason: `Monitoring: +${holderGrowth} holders, ${priceChange > 0 ? '+' : ''}${priceChange.toFixed(1)}% (${elapsedSeconds.toFixed(0)}s elapsed)`,
        confidence: 50,
        metrics: {
          holderGrowth,
          volumeGrowth,
          priceChange,
          momentum: this.classifyMomentum(holderGrowth, elapsedSeconds),
        },
      };

    } catch (error) {
      console.error(`[PostBuyMonitor] Failed to check momentum for ${tokenAddress}:`, error);
      return {
        action: "HOLD",
        reason: "Monitoring error - holding position",
        confidence: 30,
      };
    }
  }

  /**
   * Analyze momentum trend from snapshots
   */
  private analyzeMomentumTrend(snapshots: MomentumSnapshot[]): "ACCELERATING" | "STABLE" | "DYING" {
    if (snapshots.length < 3) return "STABLE";

    // Get last 3 snapshots
    const recent = snapshots.slice(-3);

    // Calculate holder growth rate between snapshots
    const growthRate1 = recent[1].holderCount - recent[0].holderCount;
    const growthRate2 = recent[2].holderCount - recent[1].holderCount;

    // Accelerating: growth rate increasing
    if (growthRate2 > growthRate1 && growthRate2 >= 3) {
      return "ACCELERATING";
    }

    // Dying: growth rate decreasing significantly
    if (growthRate2 < growthRate1 && growthRate2 <= 1) {
      return "DYING";
    }

    return "STABLE";
  }

  /**
   * Classify current momentum state
   */
  private classifyMomentum(holderGrowth: number, elapsedSeconds: number): "ACCELERATING" | "STABLE" | "DYING" | "DEAD" {
    const holderGrowthRate = holderGrowth / (elapsedSeconds / 60); // holders per minute

    if (holderGrowthRate >= 5) return "ACCELERATING"; // 5+ holders/min
    if (holderGrowthRate >= 2) return "STABLE";       // 2-5 holders/min
    if (holderGrowthRate >= 0.5) return "DYING";      // 0.5-2 holders/min
    return "DEAD";                                     // <0.5 holders/min
  }

  /**
   * Stop monitoring a token (after sell)
   */
  stopMonitoring(tokenAddress: string): void {
    this.snapshots.delete(tokenAddress);
    this.twoMinCheckDone.delete(tokenAddress);
    this.fiveMinCheckDone.delete(tokenAddress);
  }

  /**
   * Get current snapshots for a token (for debugging)
   */
  getSnapshots(tokenAddress: string): MomentumSnapshot[] {
    return this.snapshots.get(tokenAddress) || [];
  }
}

// Singleton instance
export const postBuyMonitor = new PostBuyMonitor();
