/**
 * Agent Coordinator - Prevents agents from competing with each other
 *
 * Problem: Multiple agents trying to buy the same token = competing with our own money
 * Solution: Token claiming system - first agent to claim a token gets exclusive access
 *
 * How it works:
 * 1. Agent finds a good signal for token X
 * 2. Agent tries to claim token X (atomic operation)
 * 3. If claim succeeds → proceed with trade
 * 4. If claim fails → another agent already claimed it, skip
 * 5. After trade completes (buy or rejection) → release the claim
 */

interface TokenClaim {
  tokenAddress: string;
  agentId: string;
  agentName: string;
  claimedAt: number;
  expiresAt: number;
  reason: string; // Why this token was claimed (for debugging)
}

export class AgentCoordinator {
  private static claims: Map<string, TokenClaim> = new Map();
  private static readonly DEFAULT_LOCK_DURATION = 300000; // 5 minutes
  private static readonly MAX_LOCK_DURATION = 600000; // 10 minutes

  /**
   * Try to claim a token for exclusive trading rights
   * Returns true if successful, false if another agent already claimed it
   */
  static claimToken(
    tokenAddress: string,
    agentId: string,
    agentName: string,
    reason: string = "standard trade",
    durationMs: number = this.DEFAULT_LOCK_DURATION
  ): boolean {
    const now = Date.now();
    const normalizedAddress = tokenAddress.toLowerCase();

    // Clean up expired claims first
    this.cleanupExpiredClaims();

    // Check if token is already claimed
    const existing = this.claims.get(normalizedAddress);

    if (existing) {
      // Check if claim is still valid
      if (existing.expiresAt >= now) {
        // Same agent trying to claim again? Allow it (re-claim/extend)
        if (existing.agentId === agentId) {
          console.log(
            `[Coordinator] ♻️  ${agentName} re-claiming ${tokenAddress.substring(0, 10)}...`
          );

          // Extend the lock
          this.claims.set(normalizedAddress, {
            ...existing,
            expiresAt: now + durationMs,
          });
          return true;
        }

        // Different agent - claim blocked
        console.log(
          `[Coordinator] ❌ ${agentName} BLOCKED: ${tokenAddress.substring(0, 10)}... already claimed by ${existing.agentName} (${Math.round((existing.expiresAt - now) / 1000)}s remaining)`
        );
        return false;
      }

      // Claim expired - remove it
      this.claims.delete(normalizedAddress);
    }

    // Claim is available - take it!
    const clampedDuration = Math.min(durationMs, this.MAX_LOCK_DURATION);

    this.claims.set(normalizedAddress, {
      tokenAddress: normalizedAddress,
      agentId,
      agentName,
      claimedAt: now,
      expiresAt: now + clampedDuration,
      reason,
    });

    console.log(
      `[Coordinator] ✅ ${agentName} claimed ${tokenAddress.substring(0, 10)}... for ${reason} (${clampedDuration / 1000}s)`
    );

    return true;
  }

  /**
   * Release a token claim (after trade or rejection)
   */
  static releaseToken(tokenAddress: string, agentId: string): void {
    const normalizedAddress = tokenAddress.toLowerCase();
    const existing = this.claims.get(normalizedAddress);

    if (!existing) {
      console.log(
        `[Coordinator] ⚠️  Attempted to release unclaimed token ${tokenAddress.substring(0, 10)}...`
      );
      return;
    }

    // Only the claiming agent can release
    if (existing.agentId !== agentId) {
      console.log(
        `[Coordinator] ❌ Agent ${agentId} cannot release token claimed by ${existing.agentId}`
      );
      return;
    }

    this.claims.delete(normalizedAddress);
    console.log(
      `[Coordinator] 🔓 ${existing.agentName} released ${tokenAddress.substring(0, 10)}...`
    );
  }

  /**
   * Check if a token is available for claiming
   */
  static isTokenAvailable(tokenAddress: string): boolean {
    const now = Date.now();
    const normalizedAddress = tokenAddress.toLowerCase();
    const existing = this.claims.get(normalizedAddress);

    if (!existing) return true;

    // Expired claims are available
    if (existing.expiresAt < now) {
      this.claims.delete(normalizedAddress);
      return true;
    }

    return false;
  }

  /**
   * Get claim info for a token (debugging)
   */
  static getClaimInfo(tokenAddress: string): TokenClaim | null {
    const normalizedAddress = tokenAddress.toLowerCase();
    return this.claims.get(normalizedAddress) || null;
  }

  /**
   * Get all active claims (monitoring)
   */
  static getAllClaims(): TokenClaim[] {
    this.cleanupExpiredClaims();
    return Array.from(this.claims.values());
  }

  /**
   * Force release all claims by an agent (emergency cleanup)
   */
  static releaseAllByAgent(agentId: string): number {
    let released = 0;

    for (const [address, claim] of this.claims.entries()) {
      if (claim.agentId === agentId) {
        this.claims.delete(address);
        released++;
      }
    }

    if (released > 0) {
      console.log(`[Coordinator] 🧹 Released ${released} claims by agent ${agentId}`);
    }

    return released;
  }

  /**
   * Clean up expired claims
   */
  private static cleanupExpiredClaims(): void {
    const now = Date.now();
    const expired: string[] = [];

    for (const [address, claim] of this.claims.entries()) {
      if (claim.expiresAt < now) {
        expired.push(address);
      }
    }

    for (const address of expired) {
      const claim = this.claims.get(address);
      this.claims.delete(address);
      console.log(
        `[Coordinator] 🧹 Expired claim removed: ${claim?.tokenAddress.substring(0, 10)}... (${claim?.agentName})`
      );
    }
  }

  /**
   * Get statistics (for monitoring/debugging)
   */
  static getStats(): {
    activeClaims: number;
    claimsByAgent: Record<string, number>;
  } {
    this.cleanupExpiredClaims();

    const claimsByAgent: Record<string, number> = {};

    for (const claim of this.claims.values()) {
      claimsByAgent[claim.agentName] = (claimsByAgent[claim.agentName] || 0) + 1;
    }

    return {
      activeClaims: this.claims.size,
      claimsByAgent,
    };
  }

  /**
   * Reset all claims (for testing)
   */
  static reset(): void {
    const count = this.claims.size;
    this.claims.clear();
    console.log(`[Coordinator] 🔄 Reset: cleared ${count} claims`);
  }
}
