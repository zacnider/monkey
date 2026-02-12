/**
 * Whale and holder distribution analysis.
 * Uses getTokenHolders() to detect concentration risks and smart money signals.
 */

export interface HolderData {
  address: string;
  balance: string;
  percentage: number;
}

export interface WhaleAnalysis {
  totalHolders: number;
  top1Pct: number;           // Top holder's % share
  top5Pct: number;           // Top 5 holders combined %
  top10Pct: number;          // Top 10 holders combined %
  whaleCount: number;        // Holders with > 5% each
  microHolders: number;      // Holders with < 0.1%
  concentration: "high" | "moderate" | "distributed"; // Overall assessment
  hasLargeWhale: boolean;    // Any single holder > 20%
}

export function analyzeHolders(holders: HolderData[]): WhaleAnalysis {
  const sorted = [...holders].sort((a, b) => b.percentage - a.percentage);
  const totalHolders = sorted.length;

  const top1Pct = sorted[0]?.percentage ?? 0;
  const top5Pct = sorted.slice(0, 5).reduce((sum, h) => sum + h.percentage, 0);
  const top10Pct = sorted.slice(0, 10).reduce((sum, h) => sum + h.percentage, 0);
  const whaleCount = sorted.filter((h) => h.percentage > 5).length;
  const microHolders = sorted.filter((h) => h.percentage < 0.1).length;
  const hasLargeWhale = top1Pct > 20;

  let concentration: "high" | "moderate" | "distributed" = "moderate";
  if (top5Pct > 70 || hasLargeWhale) concentration = "high";
  else if (top5Pct < 40 && totalHolders > 20) concentration = "distributed";

  return {
    totalHolders,
    top1Pct,
    top5Pct,
    top10Pct,
    whaleCount,
    microHolders,
    concentration,
    hasLargeWhale,
  };
}

/**
 * Generate a score adjustment (-20 to +20) based on whale/holder analysis.
 */
export function whaleScoreAdjustment(
  wa: WhaleAnalysis,
  strategy: string
): { adjustment: number; reasons: string[] } {
  let adjustment = 0;
  const reasons: string[] = [];

  if (wa.totalHolders === 0) {
    return { adjustment: 0, reasons: ["No holder data available"] };
  }

  // --- Holder count ---
  if (wa.totalHolders > 50) {
    adjustment += 8;
    reasons.push(`Strong holder base: ${wa.totalHolders} holders`);
  } else if (wa.totalHolders > 20) {
    adjustment += 4;
    reasons.push(`Decent holder count: ${wa.totalHolders}`);
  } else if (wa.totalHolders < 5) {
    adjustment -= 10;
    reasons.push(`Very few holders: ${wa.totalHolders} - high risk`);
  }

  // --- Concentration risk ---
  if (wa.hasLargeWhale) {
    if (strategy === "degen_ape") {
      // Degen ape doesn't care as much
      adjustment -= 3;
      reasons.push(`Whale alert: top holder has ${wa.top1Pct.toFixed(1)}%`);
    } else {
      adjustment -= 12;
      reasons.push(`Whale concentration risk: top holder ${wa.top1Pct.toFixed(1)}%`);
    }
  }

  if (wa.concentration === "distributed") {
    if (strategy === "diamond_hands") {
      adjustment += 12;
      reasons.push("Well distributed - healthy for long hold");
    } else {
      adjustment += 6;
      reasons.push("Distributed holder base");
    }
  } else if (wa.concentration === "high") {
    if (strategy !== "degen_ape" && strategy !== "alpha_hunter") {
      adjustment -= 8;
      reasons.push(`High concentration: top 5 hold ${wa.top5Pct.toFixed(1)}%`);
    }
  }

  // --- Whale count as smart money signal ---
  if (wa.whaleCount >= 3 && wa.whaleCount <= 6 && wa.concentration !== "high") {
    adjustment += 5;
    reasons.push(`Multiple whales (${wa.whaleCount}) showing interest`);
  }

  // --- Many micro holders = organic growth ---
  if (wa.microHolders > 30) {
    adjustment += 5;
    reasons.push(`Strong organic growth: ${wa.microHolders} small holders`);
  }

  // Clamp
  adjustment = Math.max(-20, Math.min(20, adjustment));

  return { adjustment, reasons };
}
