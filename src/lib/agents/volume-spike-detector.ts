/**
 * Volume Spike Detector - Real-time MEV-style monitoring
 *
 * Monitors token volume changes every 10 seconds
 * Detects sudden volume increases (whale activity)
 * Triggers immediate buy signal to Volume Watcher agent
 */

import { fetchRecentTokens, type RecentToken } from "@/lib/nadfun/api";

interface VolumeSnapshot {
  tokenAddress: string;
  volume24h: number;
  timestamp: number;
  holderCount: number;
}

interface VolumeSpike {
  tokenAddress: string;
  tokenSymbol: string;
  volumeIncrease: number; // percentage
  previousVolume: number;
  currentVolume: number;
  holderGrowth: number;
  detectedAt: number;
}

export class VolumeSpikeDetector {
  private volumeHistory: Map<string, VolumeSnapshot[]> = new Map();
  private spikeCallbacks: ((spike: VolumeSpike) => void)[] = [];
  private isRunning = false;
  private intervalId: NodeJS.Timeout | null = null;

  // Config
  private readonly CHECK_INTERVAL = 10000; // 10 seconds
  private readonly MIN_VOLUME_INCREASE = 0.5; // 50% increase
  private readonly MIN_BASE_VOLUME = 10; // Minimum 10 MON base volume
  private readonly SNAPSHOT_HISTORY_SIZE = 6; // Keep last 6 snapshots (1 minute history)

  /**
   * Start monitoring for volume spikes
   */
  start() {
    if (this.isRunning) {
      console.log("[VolumeSpikeDetector] Already running");
      return;
    }

    console.log("[VolumeSpikeDetector] 🚀 Starting real-time monitoring (10s interval)");
    this.isRunning = true;

    // Run immediately
    this.checkVolumeSpikes();

    // Then every 10 seconds
    this.intervalId = setInterval(() => {
      this.checkVolumeSpikes();
    }, this.CHECK_INTERVAL);
  }

  /**
   * Stop monitoring
   */
  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isRunning = false;
    console.log("[VolumeSpikeDetector] ⏸️  Stopped monitoring");
  }

  /**
   * Register a callback for volume spikes
   */
  onVolumeSpike(callback: (spike: VolumeSpike) => void) {
    this.spikeCallbacks.push(callback);
  }

  /**
   * Check all tokens for volume spikes
   */
  private async checkVolumeSpikes() {
    try {
      const tokens = await fetchRecentTokens(100); // Get last 100 tokens

      for (const tokenData of tokens) {
        await this.analyzeToken(tokenData);
      }

      // Cleanup old history
      this.cleanupOldSnapshots();

    } catch (error) {
      console.error("[VolumeSpikeDetector] Error checking spikes:", error);
    }
  }

  /**
   * Analyze a single token for volume spike
   */
  private async analyzeToken(tokenData: RecentToken) {
    const tokenAddress = tokenData.token_info.token_id.toLowerCase();
    const currentVolume = parseFloat(tokenData.market_info?.volume || "0") / 1e18; // Convert to MON
    const holderCount = tokenData.market_info?.holder_count || 0;

    // Skip if volume too low
    if (currentVolume < this.MIN_BASE_VOLUME) {
      return;
    }

    // Get or create history
    let history = this.volumeHistory.get(tokenAddress);
    if (!history) {
      history = [];
      this.volumeHistory.set(tokenAddress, history);
    }

    // Add current snapshot
    const snapshot: VolumeSnapshot = {
      tokenAddress,
      volume24h: currentVolume,
      timestamp: Date.now(),
      holderCount,
    };
    history.push(snapshot);

    // Keep only recent snapshots
    if (history.length > this.SNAPSHOT_HISTORY_SIZE) {
      history.shift();
    }

    // Need at least 2 snapshots to detect spike
    if (history.length < 2) {
      return;
    }

    // Compare with previous snapshot
    const previous = history[history.length - 2];
    const volumeIncrease = (currentVolume - previous.volume24h) / previous.volume24h;
    const holderGrowth = holderCount - previous.holderCount;

    // Check if this is a significant spike
    if (volumeIncrease >= this.MIN_VOLUME_INCREASE && holderGrowth >= 3) {
      const spike: VolumeSpike = {
        tokenAddress,
        tokenSymbol: tokenData.token_info.symbol,
        volumeIncrease: volumeIncrease * 100, // Convert to percentage
        previousVolume: previous.volume24h,
        currentVolume,
        holderGrowth,
        detectedAt: Date.now(),
      };

      console.log(
        `[VolumeSpikeDetector] 🐋 SPIKE DETECTED: ${spike.tokenSymbol} - ` +
        `Volume +${spike.volumeIncrease.toFixed(0)}% (${previous.volume24h.toFixed(0)} → ${currentVolume.toFixed(0)} MON), ` +
        `Holders +${holderGrowth}`
      );

      // Notify all callbacks
      this.spikeCallbacks.forEach(cb => {
        try {
          cb(spike);
        } catch (error) {
          console.error("[VolumeSpikeDetector] Callback error:", error);
        }
      });
    }
  }

  /**
   * Cleanup old snapshots (keep last hour only)
   */
  private cleanupOldSnapshots() {
    const oneHourAgo = Date.now() - (60 * 60 * 1000);

    for (const [address, history] of this.volumeHistory.entries()) {
      // Filter out snapshots older than 1 hour
      const recent = history.filter(s => s.timestamp > oneHourAgo);

      if (recent.length === 0) {
        this.volumeHistory.delete(address);
      } else {
        this.volumeHistory.set(address, recent);
      }
    }
  }

  /**
   * Get current monitoring stats
   */
  getStats() {
    return {
      isRunning: this.isRunning,
      tokensTracked: this.volumeHistory.size,
      checkInterval: this.CHECK_INTERVAL,
      callbacksRegistered: this.spikeCallbacks.length,
    };
  }
}

// Singleton instance
export const volumeSpikeDetector = new VolumeSpikeDetector();
