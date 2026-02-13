/**
 * Whale Tracker - Track successful wallets and copy their next moves
 *
 * Simple approach for Nad.fun:
 * 1. Track large buyers (>5 MON purchases)
 * 2. Monitor their profitability over time
 * 3. Add successful wallets to "whale list"
 * 4. When whale buys a new token, we copy it
 */

import { prisma } from "@/lib/db";
import { getTokenHolders } from "@/lib/nadfun/api";

interface WhaleProfile {
  address: string;
  firstSeen: number;
  totalBuys: number;
  estimatedProfitRate: number; // 0-1 (percentage of wins)
  avgBuySize: number; // in MON
  lastActive: number;
  reputation: "potential" | "proven" | "legendary";
}

interface WhaleActivity {
  whaleAddress: string;
  tokenAddress: string;
  tokenSymbol: string;
  buyAmount: number;
  timestamp: number;
}

export class WhaleTracker {
  private whales: Map<string, WhaleProfile> = new Map();
  private recentActivity: WhaleActivity[] = [];
  private activityCallbacks: ((activity: WhaleActivity) => void)[] = [];

  // Config
  private readonly MIN_BUY_SIZE = 5; // 5 MON minimum to track
  private readonly MIN_BUYS_FOR_WHALE = 3; // Need 3+ buys to be considered
  private readonly MIN_WIN_RATE = 0.6; // 60% win rate to be "whale"
  private readonly ACTIVITY_HISTORY_SIZE = 100;

  /**
   * Initialize whale tracker from database
   */
  async init() {
    console.log("[WhaleTracker] 🐋 Initializing whale tracker...");

    // Load historical successful traders from our database
    await this.loadHistoricalWhales();

    console.log(`[WhaleTracker] Loaded ${this.whales.size} potential whales`);
  }

  /**
   * Load whales from our trade history
   */
  private async loadHistoricalWhales() {
    try {
      // Find addresses that made multiple large profitable trades
      // This would require tracking external wallet addresses in trades
      // For now, start with empty list and build over time

      // TODO: Add external wallet tracking to Trade model
      // Then query for profitable addresses

    } catch (error) {
      console.error("[WhaleTracker] Error loading whales:", error);
    }
  }

  /**
   * Analyze a token's recent buyers for whale activity
   */
  async analyzeTokenBuyers(tokenAddress: string, tokenSymbol: string) {
    try {
      const holders = await getTokenHolders(tokenAddress);

      // Look for large holders (potential whales)
      for (const holder of holders) {
        const balance = parseFloat(holder.balance || "0") / 1e18;

        // If they hold a significant amount, they likely bought big
        if (balance >= this.MIN_BUY_SIZE) {
          this.trackWalletActivity(holder.address, tokenAddress, tokenSymbol, balance);
        }
      }

    } catch (error) {
      // Holder data not available
    }
  }

  /**
   * Track wallet activity
   */
  private trackWalletActivity(
    walletAddress: string,
    tokenAddress: string,
    tokenSymbol: string,
    amount: number
  ) {
    const normalized = walletAddress.toLowerCase();

    // Get or create whale profile
    let profile = this.whales.get(normalized);
    if (!profile) {
      profile = {
        address: normalized,
        firstSeen: Date.now(),
        totalBuys: 0,
        estimatedProfitRate: 0.5, // Start neutral
        avgBuySize: 0,
        lastActive: Date.now(),
        reputation: "potential",
      };
      this.whales.set(normalized, profile);
    }

    // Update profile
    profile.totalBuys++;
    profile.avgBuySize = (profile.avgBuySize * (profile.totalBuys - 1) + amount) / profile.totalBuys;
    profile.lastActive = Date.now();

    // Update reputation based on activity
    if (profile.totalBuys >= this.MIN_BUYS_FOR_WHALE) {
      if (profile.estimatedProfitRate >= 0.7) {
        profile.reputation = "legendary";
      } else if (profile.estimatedProfitRate >= this.MIN_WIN_RATE) {
        profile.reputation = "proven";
      }
    }

    // Record activity
    const activity: WhaleActivity = {
      whaleAddress: normalized,
      tokenAddress,
      tokenSymbol,
      buyAmount: amount,
      timestamp: Date.now(),
    };

    this.recentActivity.push(activity);

    // Keep activity history limited
    if (this.recentActivity.length > this.ACTIVITY_HISTORY_SIZE) {
      this.recentActivity.shift();
    }

    // If this is a proven whale, notify callbacks
    if (profile.reputation === "proven" || profile.reputation === "legendary") {
      console.log(
        `[WhaleTracker] 🐋 ${profile.reputation.toUpperCase()} WHALE ACTIVE: ` +
        `${normalized.substring(0, 10)}... bought ${tokenSymbol} (${amount.toFixed(1)} tokens)`
      );

      this.activityCallbacks.forEach(cb => {
        try {
          cb(activity);
        } catch (error) {
          console.error("[WhaleTracker] Callback error:", error);
        }
      });
    }
  }

  /**
   * Register callback for whale activity
   */
  onWhaleActivity(callback: (activity: WhaleActivity) => void) {
    this.activityCallbacks.push(callback);
  }

  /**
   * Get all tracked whales
   */
  getWhales(): WhaleProfile[] {
    return Array.from(this.whales.values())
      .filter(w => w.reputation !== "potential")
      .sort((a, b) => b.estimatedProfitRate - a.estimatedProfitRate);
  }

  /**
   * Check if an address is a known whale
   */
  isWhale(address: string): boolean {
    const profile = this.whales.get(address.toLowerCase());
    return profile?.reputation === "proven" || profile?.reputation === "legendary";
  }

  /**
   * Get tracker statistics
   */
  getStats() {
    const whales = Array.from(this.whales.values());
    const proven = whales.filter(w => w.reputation === "proven" || w.reputation === "legendary");

    return {
      totalTracked: whales.length,
      provenWhales: proven.length,
      recentActivity: this.recentActivity.length,
      callbacksRegistered: this.activityCallbacks.length,
    };
  }
}

// Singleton instance
export const whaleTracker = new WhaleTracker();
