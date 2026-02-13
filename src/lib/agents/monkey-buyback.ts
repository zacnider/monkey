/**
 * MONKEY Token Buyback Helpers
 *
 * NOTE: MonkeyVault contract automatically handles MKEY buyback on-chain
 * - 20% of all profits → $MKEY buyback
 * - This happens during sell transactions in the vault
 * - These helpers are just for logging/display purposes
 */

import { MKEY, networkConfig } from "@/lib/config";

const BUYBACK_PERCENTAGE = 0.2; // 20% of profit
const MIN_PROFIT_FOR_BUYBACK = 1; // Minimum 1 MON profit to trigger buyback

/**
 * Calculate and log $MKEY buyback (vault does this automatically)
 */
export async function executeMKEYBuyback(
  _agentId: string,
  agentName: string,
  profitMON: number
): Promise<{ success: boolean; mkeyBought: number; monSpent: number }> {
  // NOTE: Vault contract automatically handles MKEY buyback on-chain
  // This function is just for display/logging

  if (profitMON < MIN_PROFIT_FOR_BUYBACK) {
    return { success: false, mkeyBought: 0, monSpent: 0 };
  }

  const buybackAmount = profitMON * BUYBACK_PERCENTAGE;

  console.log(
    `[MKEY Buyback] 🐒 ${agentName}: Vault auto-buyback ~${buybackAmount.toFixed(2)} MON worth of $MKEY (20% of ${profitMON.toFixed(2)} MON profit)`
  );

  // Vault handles this automatically on-chain
  return {
    success: true,
    mkeyBought: 0, // Actual amount handled by vault
    monSpent: buybackAmount,
  };
}

/**
 * Get quote for buying $MKEY from nad.fun
 */
async function getQuoteForMKEY(monAmount: number): Promise<{
  success: boolean;
  expectedMKEY: number;
  error?: string;
}> {
  try {
    const response = await fetch(`${networkConfig.apiUrl}/tokens/${MKEY.address}`);

    if (!response.ok) {
      return { success: false, expectedMKEY: 0, error: "Failed to fetch MKEY info" };
    }

    const tokenData = await response.json();
    const price = parseFloat(tokenData.market_info?.price || "0") / 1e18; // Price in MON

    if (price === 0) {
      return { success: false, expectedMKEY: 0, error: "Invalid MKEY price" };
    }

    const expectedMKEY = monAmount / price;

    return {
      success: true,
      expectedMKEY,
    };
  } catch (error) {
    console.error("[MKEY Quote] Error:", error);
    return { success: false, expectedMKEY: 0, error: String(error) };
  }
}

/**
 * Check if $MKEY is on bonding curve or graduated to DEX
 */
export async function isMKEYGraduated(): Promise<boolean> {
  try {
    const response = await fetch(`${networkConfig.apiUrl}/tokens/${MKEY.address}`);

    if (!response.ok) {
      return false;
    }

    const tokenData = await response.json();
    const marketType = tokenData.market_info?.market_type;

    return marketType === "DEX"; // Graduated if on DEX
  } catch (error) {
    console.error("[MKEY Status] Error:", error);
    return false;
  }
}

/**
 * Format buyback summary for logging
 */
export function formatBuybackSummary(
  profitMON: number,
  buybackMON: number,
  mkeyBought: number
): string {
  return `
🐒 $MKEY BUYBACK SUMMARY
━━━━━━━━━━━━━━━━━━━━━━━━━
💰 Profit: ${profitMON.toFixed(2)} MON
🔄 Buyback: ${buybackMON.toFixed(2)} MON (20%)
🎯 $MKEY Bought: ${mkeyBought > 0 ? mkeyBought.toFixed(4) : "handled by vault"} MKEY
💼 Remaining for Trading: ${(profitMON - buybackMON).toFixed(2)} MON
━━━━━━━━━━━━━━━━━━━━━━━━━
  `.trim();
}

/**
 * Get total $MKEY buyback stats (placeholder)
 */
export async function getTotalMKEYBuyback(): Promise<{
  totalMONSpent: number;
  totalMKEYBought: number;
}> {
  // This would query vault contract or database
  // For now, return placeholder
  return {
    totalMONSpent: 0,
    totalMKEYBought: 0,
  };
}
