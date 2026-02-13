/**
 * Dead Token Blacklist Manager
 *
 * Tracks tokens that were detected as "dead" (no follow-up buyers) in post-buy monitoring
 * Prevents re-buying the same dead token within 1 hour
 */

interface DeadTokenEntry {
  tokenAddress: string;
  tokenSymbol: string;
  detectedAt: number;
  holderGrowth: number;
  reason: string;
}

export class DeadTokenBlacklist {
  private blacklist: Map<string, DeadTokenEntry> = new Map();
  private readonly BLACKLIST_DURATION = 60 * 60 * 1000; // 1 hour

  /**
   * Add a dead token to blacklist
   */
  add(tokenAddress: string, tokenSymbol: string, holderGrowth: number, reason: string): void {
    const entry: DeadTokenEntry = {
      tokenAddress: tokenAddress.toLowerCase(),
      tokenSymbol,
      detectedAt: Date.now(),
      holderGrowth,
      reason,
    };
    this.blacklist.set(entry.tokenAddress, entry);
    console.log(`[DeadTokenBlacklist] Added ${tokenSymbol} (${tokenAddress.substring(0, 10)}...) - ${reason}`);
  }

  /**
   * Check if a token is blacklisted (dead in last 1 hour)
   */
  isBlacklisted(tokenAddress: string): boolean {
    this.cleanup(); // Remove expired entries first
    return this.blacklist.has(tokenAddress.toLowerCase());
  }

  /**
   * Get blacklist info for a token (for logging)
   */
  getInfo(tokenAddress: string): DeadTokenEntry | null {
    this.cleanup();
    return this.blacklist.get(tokenAddress.toLowerCase()) || null;
  }

  /**
   * Remove expired entries (older than 1 hour)
   */
  private cleanup(): void {
    const now = Date.now();
    const expired: string[] = [];

    for (const [addr, entry] of this.blacklist.entries()) {
      if (now - entry.detectedAt > this.BLACKLIST_DURATION) {
        expired.push(addr);
      }
    }

    for (const addr of expired) {
      const entry = this.blacklist.get(addr);
      console.log(`[DeadTokenBlacklist] Removed ${entry?.tokenSymbol} from blacklist (1 hour expired)`);
      this.blacklist.delete(addr);
    }
  }

  /**
   * Get current blacklist size (for monitoring)
   */
  size(): number {
    this.cleanup();
    return this.blacklist.size;
  }

  /**
   * Get all blacklisted tokens (for debugging)
   */
  getAll(): DeadTokenEntry[] {
    this.cleanup();
    return Array.from(this.blacklist.values());
  }
}

// Singleton instance
export const deadTokenBlacklist = new DeadTokenBlacklist();
