/**
 * LLM Decision Maker - Truly autonomous agent decisions
 *
 * For Moltiverse Hackathon:
 * - LLM makes THE decision (not just confirmation)
 * - Uses agent personality for context
 * - Learns from past trades
 * - NOT scripted if/then logic - genuine reasoning
 *
 * This replaces the old pattern:
 * OLD: if(score > 85) → ask LLM to confirm
 * NEW: LLM analyzes raw data → makes the decision
 */

import OpenAI from "openai";
import { formatEther } from "viem";
import type { RecentToken } from "@/lib/nadfun/api";
import { getPersonality, formatPersonalityContext } from "./agent-personalities";
import type { MarketRegime } from "./market-regime";
import { log, logError, logLLMDecision } from "@/lib/logger";

let llmClient: OpenAI | null = null;

function getLLMClient(): OpenAI {
  if (!llmClient) {
    const apiKey = process.env.OPENROUTER_API_KEY || process.env.GROQ_API_KEY;
    const baseURL = process.env.OPENROUTER_API_KEY
      ? "https://openrouter.ai/api/v1"
      : "https://api.groq.com/openai/v1";

    llmClient = new OpenAI({ apiKey, baseURL });
  }
  return llmClient;
}

export interface AgentDecision {
  action: "BUY" | "SKIP" | "SELL";
  confidence: number; // 0-100
  reasoning: string;
  targetAmount?: number; // In MON (only for BUY)
  narrative?: string; // What story is this token telling?
  risks?: string[]; // What could go wrong?
}

interface TradeRecord {
  type: string;
  tokenSymbol: string;
  amountIn: string;
  amountOut: string;
  pnl?: string | null;
  reason?: string | null;
  createdAt: Date;
}

interface TokenAnalysisData {
  token: RecentToken;
  age: number; // seconds
  holderGrowth?: number;
  priceChange1h?: number;
  volumeTrend?: string;
  marketRegime?: MarketRegime;
}

/**
 * Build learning context from past trades
 */
function buildLearningContext(trades: TradeRecord[]): string {
  if (!trades || trades.length === 0) {
    return "No trade history yet. You're starting fresh - be cautious but opportunistic.";
  }

  const wins = trades.filter((t) => t.pnl && BigInt(t.pnl) > 0n);
  const losses = trades.filter((t) => t.pnl && BigInt(t.pnl) < 0n);
  const winRate = trades.length > 0 ? (wins.length / trades.length) * 100 : 0;

  let context = `## YOUR PERFORMANCE\n`;
  context += `Win Rate: ${winRate.toFixed(1)}% (${wins.length}W / ${losses.length}L out of ${trades.length} trades)\n\n`;

  // Recent patterns
  const recentWins = wins.slice(0, 3);
  const recentLosses = losses.slice(0, 3);

  if (recentWins.length > 0) {
    context += `### What's Working (Recent Wins):\n`;
    for (const win of recentWins) {
      const pnl = formatEther(BigInt(win.pnl || "0"));
      context += `- ${win.tokenSymbol}: +${pnl} MON${win.reason ? ` - ${win.reason}` : ""}\n`;
    }
    context += "\n";
  }

  if (recentLosses.length > 0) {
    context += `### What's NOT Working (Recent Losses - AVOID REPEATING):\n`;
    for (const loss of recentLosses) {
      const pnl = formatEther(BigInt(loss.pnl || "0"));
      context += `- ${loss.tokenSymbol}: ${pnl} MON${loss.reason ? ` - ${loss.reason}` : ""}\n`;
    }
    context += "\n";
  }

  // Lessons learned
  if (winRate < 30) {
    context += `⚠️ ALERT: Your win rate is low. Be MORE selective. Quality over quantity.\n`;
  } else if (winRate > 50) {
    context += `✅ Strong performance. Continue with current strategy but stay sharp.\n`;
  }

  return context;
}

/**
 * Format token data for LLM analysis
 */
function formatTokenData(data: TokenAnalysisData): string {
  const { token, age, holderGrowth, priceChange1h, volumeTrend, marketRegime } = data;
  const info = token.token_info;
  const market = token.market_info;

  const ageMinutes = Math.floor(age / 60);
  const ageHours = Math.floor(age / 3600);
  const ageDisplay =
    ageHours > 0 ? `${ageHours}h ${ageMinutes % 60}m` : `${ageMinutes}m`;

  return `
## TOKEN DATA

**Name:** ${info.name} (${info.symbol})
**Address:** ${info.token_id}
**Age:** ${ageDisplay} (${age} seconds)

### Market Metrics
- **Price:** ${market?.price ? `${parseFloat(market.price) / 1e18} MON` : "N/A"}
- **Reserve:** ${market?.reserve_native ? `${parseFloat(market.reserve_native) / 1e18} MON` : "N/A"}
- **24h Volume:** ${market?.volume ? `${parseFloat(market.volume) / 1e18} MON` : "N/A"}
- **Holders:** ${market?.holder_count || "N/A"}
- **Holder Growth:** ${holderGrowth !== undefined ? `+${holderGrowth} holders` : "N/A"}

### Price Action
- **1h Price Change:** ${priceChange1h !== undefined ? `${priceChange1h.toFixed(2)}%` : "N/A"}
- **Volume Trend:** ${volumeTrend || "N/A"}

### Market Context
- **Market Regime:** ${marketRegime?.toUpperCase() || "UNKNOWN"}
${
  marketRegime === "bull"
    ? "- Most tokens trending up - momentum plays favored"
    : marketRegime === "bear"
    ? "- Most tokens declining - be extra selective"
    : "- Mixed market - pick your spots"
}

### Creator Info
- **Creator:** ${info.creator || "Unknown"}
- **Created:** ${info.created_at ? new Date(info.created_at).toLocaleString() : "N/A"}
`.trim();
}

/**
 * Ask LLM to make a trading decision
 * This is THE decision - not a confirmation
 */
export async function makeAgentDecision(
  strategy: string,
  tokenData: TokenAnalysisData,
  recentTrades: TradeRecord[],
  currentHoldings: number,
  maxPositions: number = 3
): Promise<AgentDecision> {
  const personality = getPersonality(strategy);

  const systemPrompt = `
${formatPersonalityContext(personality)}

## YOUR TASK

You are analyzing a token and must decide: BUY, SKIP, or SELL.

**IMPORTANT - This is NOT a confirmation task:**
- You are THE decision maker
- You analyze raw market data and decide
- You use your personality and philosophy
- You learn from your past trades
- You are autonomous - make the call

**Decision Format:**
Return JSON only:
{
  "action": "BUY" | "SKIP" | "SELL",
  "confidence": 0-100,
  "reasoning": "Why are you making this decision? 2-3 sentences.",
  "targetAmount": 5 (optional, in MON - only for BUY),
  "narrative": "What's the story here? Why is this interesting?",
  "risks": ["risk 1", "risk 2"]
}

**Rules:**
- BUY: Only if this fits your strategy AND you have conviction
- SKIP: If uncertain, not your style, or too risky
- SELL: If you currently hold this token and should exit
- Target amount: Usually 2-10 MON based on confidence
- Be honest about risks - don't YOLO blindly

Remember: Quality over quantity. A good SKIP is better than a bad BUY.
`.trim();

  const learningContext = buildLearningContext(recentTrades);
  const tokenDataFormatted = formatTokenData(tokenData);

  const userPrompt = `
${learningContext}

---

${tokenDataFormatted}

---

## YOUR DECISION

Current Holdings: ${currentHoldings}/${maxPositions} positions

Analyze this token using your personality, strategy, and past performance.
What's your decision?

Return JSON only.
`.trim();

  try {
    const model = process.env.OPENROUTER_API_KEY
      ? "meta-llama/llama-3.1-8b-instruct"
      : "llama-3.3-70b-versatile";

    const response = await getLLMClient().chat.completions.create({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.8, // Higher temp = more creative/autonomous
      max_tokens: 300,
      response_format: { type: "json_object" },
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      return {
        action: "SKIP",
        confidence: 0,
        reasoning: "No LLM response received",
      };
    }

    const parsed = JSON.parse(content) as AgentDecision;

    // Validate action
    if (!["BUY", "SKIP", "SELL"].includes(parsed.action)) {
      parsed.action = "SKIP";
    }

    // Ensure confidence is in range
    parsed.confidence = Math.max(0, Math.min(100, parsed.confidence || 50));

    // Default target amount for BUY
    if (parsed.action === "BUY" && !parsed.targetAmount) {
      parsed.targetAmount = parsed.confidence > 70 ? 10 : 5;
    }

    // Log successful decision
    logLLMDecision(personality.name, parsed);

    return parsed;
  } catch (error) {
    // DETAILED error logging for debugging
    const errorMsg = `[LLM Decision Maker] ❌ CRITICAL ERROR
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Error Type: ${error instanceof Error ? error.constructor.name : typeof error}
Error Message: ${error instanceof Error ? error.message : String(error)}
Model Used: ${process.env.OPENROUTER_API_KEY ? "meta-llama/llama-3.1-8b-instruct (OpenRouter)" : "llama-3.3-70b-versatile (Groq)"}
API Key Present: ${process.env.OPENROUTER_API_KEY ? "OpenRouter ✅" : process.env.GROQ_API_KEY ? "Groq ✅" : "❌ NO API KEY"}
Token Symbol: ${tokenData.token.token_info.symbol}
Strategy: ${strategy}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;

    logError(errorMsg, error);

    // Fallback: Conservative SKIP
    return {
      action: "SKIP",
      confidence: 0,
      reasoning: `LLM ERROR: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

/**
 * Quick LLM check for emergency situations
 * (e.g., post-buy monitoring, should we exit early?)
 */
export async function quickLLMCheck(
  strategy: string,
  question: string,
  context: Record<string, any>
): Promise<{ decision: string; reasoning: string }> {
  const personality = getPersonality(strategy);

  const systemPrompt = `You are ${personality.name}.
${personality.philosophy}

Answer the question briefly based on your personality. Return JSON:
{"decision": "your decision", "reasoning": "why"}`;

  const userPrompt = `${question}\n\nContext:\n${JSON.stringify(context, null, 2)}`;

  try {
    const model = process.env.OPENROUTER_API_KEY
      ? "meta-llama/llama-3.1-8b-instruct"
      : "llama-3.3-70b-versatile";

    const response = await getLLMClient().chat.completions.create({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.7,
      max_tokens: 150,
      response_format: { type: "json_object" },
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      return { decision: "SKIP", reasoning: "No response" };
    }

    return JSON.parse(content);
  } catch (error) {
    console.error("[Quick LLM Check] Error:", error);
    return { decision: "SKIP", reasoning: "LLM unavailable" };
  }
}
