import OpenAI from "openai";
import { formatEther } from "viem";
import type { MarketSignal } from "./signal-engine";
import type { MarketRegime } from "./market-regime";

let llmClient: OpenAI | null = null;

function getLLMClient(): OpenAI {
  if (!llmClient) {
    // Primary: OpenRouter, Fallback: Groq
    const apiKey = process.env.OPENROUTER_API_KEY || process.env.GROQ_API_KEY;
    const baseURL = process.env.OPENROUTER_API_KEY
      ? "https://openrouter.ai/api/v1"
      : "https://api.groq.com/openai/v1";

    llmClient = new OpenAI({ apiKey, baseURL });
  }
  return llmClient;
}

interface LLMDecision {
  approved: boolean;
  reasoning: string;
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

const PERSONALITY_PROMPTS: Record<string, string> = {
  alpha_hunter:
    "You are Alpha Hunter, an aggressive token sniper. You love catching tokens within seconds of launch. You think fast, act fast, and trust early signals. If a token is fresh and showing activity, you're in. You learn from past trades - avoid repeating recent losses on similar tokens.",
  diamond_hands:
    "You are Diamond Hands, a patient long-term investor. You only buy tokens with solid fundamentals - good holder distribution, consistent volume, and positive trends. You never rush into trades. Your past performance guides your patience level.",
  swing_trader:
    "You are Swing Trader, a calculated technical trader. You look for price oscillations and volatility. You buy low swings and sell high swings. If the price isn't moving, you're not interested. Use your RSI and EMA data to make precise entries.",
  degen_ape:
    "You are Degen Ape, a fearless meme token enthusiast. You love the chaos of new launches, meme names, and massive pumps. You trust your gut and embrace high-risk plays. YOLO is your middle name. But even you learn from getting rekt.",
  volume_watcher:
    "You are Volume Watcher, a data-driven analyst. Volume is the most important metric for you. You believe price follows volume, and unusual volume spikes are the strongest buy signals. VWAP and volume trends are your best friends.",
  trend_follower:
    "You are Trend Follower, a disciplined momentum trader. You ride trends until they break. If price is going up across multiple timeframes with EMA confirmation, you want in. You never fight the trend. Adapt to the market regime.",
  contrarian:
    "You are Contrarian, a bold counter-trend trader. You buy when others panic (big drops, low RSI) and sell when others celebrate (big pumps, high RSI). You believe in mean reversion and market overreactions. Bear markets are your playground.",
  sniper:
    "You are Sniper, a precision new-token hunter. You specialize in buying tokens within the first 5 minutes of creation. Your edge is speed — detecting fresh launches with first buyer activity, rapid holder growth, and bonding curve momentum. You strike in the first minutes and exit quickly for 25-50% gains. Dead launches with no volume are avoided.",
};

/**
 * Build trade history context string for the LLM
 */
function buildTradeHistoryContext(trades: TradeRecord[]): string {
  if (!trades || trades.length === 0) return "No recent trade history.";

  const wins = trades.filter((t) => t.pnl && BigInt(t.pnl) > 0n);
  const losses = trades.filter((t) => t.pnl && BigInt(t.pnl) < 0n);
  const recentBuys = trades.filter((t) => t.type === "buy").slice(0, 5);

  let context = `Recent Performance: ${wins.length}W / ${losses.length}L out of last ${trades.length} trades.\n`;

  if (trades.length > 0) {
    const totalPnl = trades
      .filter((t) => t.pnl)
      .reduce((sum, t) => sum + BigInt(t.pnl || "0"), 0n);
    context += `Net PnL from recent trades: ${formatEther(totalPnl)} MON\n`;
  }

  context += "\nLast 5 trades:\n";
  for (const trade of trades.slice(0, 5)) {
    const pnlStr = trade.pnl
      ? ` (PnL: ${formatEther(BigInt(trade.pnl))} MON)`
      : "";
    const timeAgo = Math.floor((Date.now() - trade.createdAt.getTime()) / 60000);
    context += `- ${trade.type.toUpperCase()} ${trade.tokenSymbol} ${timeAgo}m ago${pnlStr}\n`;
  }

  if (recentBuys.length > 0) {
    const recentSymbols = recentBuys.map((t) => t.tokenSymbol).join(", ");
    context += `\nRecently bought tokens: ${recentSymbols} (avoid duplicate exposure)`;
  }

  return context;
}

export async function confirmTradeWithLLM(
  strategy: string,
  signal: MarketSignal,
  action: "buy" | "sell",
  currentHoldings: number,
  recentTrades?: TradeRecord[],
  regime?: MarketRegime
): Promise<LLMDecision> {
  const personalityPrompt =
    PERSONALITY_PROMPTS[strategy] || "You are a crypto trading agent.";

  const tradeHistory = buildTradeHistoryContext(recentTrades || []);

  const regimeContext = regime
    ? `\nMarket Regime: ${regime.toUpperCase()} market. ${
        regime === "bull"
          ? "Most tokens are trending up - good conditions for momentum plays."
          : regime === "bear"
          ? "Most tokens are declining - be more selective, focus on quality setups."
          : "Mixed/choppy market - pick your spots carefully."
      }`
    : "";

  const userPrompt = `
Analyze this ${action.toUpperCase()} signal and decide whether to proceed:

Token: ${signal.tokenName} (${signal.tokenSymbol})
Address: ${signal.tokenAddress}
Signal Score: ${signal.score}/100
Signal Reasons:
${signal.reasons.map((r) => `- ${r}`).join("\n")}

Metrics:
- Price: ${signal.metrics.price} MON
- 24h Volume: ${signal.metrics.volume24h} MON
- 1h Price Change: ${signal.metrics.priceChange1h}%
- 24h Price Change: ${signal.metrics.priceChange24h}%
- Holder Count: ${signal.metrics.holderCount}
- Curve Progress: ${Number(signal.metrics.curveProgress) / 100}%
- Token Age: ${signal.metrics.age}s
- RSI: ${signal.metrics.rsi ?? "N/A"}
- EMA Crossover: ${signal.metrics.emaCrossover ?? "N/A"}
- VWAP: ${signal.metrics.vwap ?? "N/A"}
- Volume Trend: ${signal.metrics.volumeTrend ?? "N/A"}
- Holder Concentration: ${signal.metrics.holderConcentration ?? "N/A"}
- Top 5 Holder %: ${signal.metrics.top5HolderPct ?? "N/A"}
${regimeContext}

Trade History:
${tradeHistory}

Current Holdings Count: ${currentHoldings}

Should you ${action} this token? Consider your recent performance and the current market regime. Respond with JSON only:
{"approved": true/false, "reasoning": "brief 1-2 sentence explanation"}`;

  try {
    // Use OpenRouter model if OPENROUTER_API_KEY is set, otherwise Groq
    const model = process.env.OPENROUTER_API_KEY
      ? "meta-llama/llama-3.1-8b-instruct" // Fast, cheap (~$0.05/1M tokens), good for trading decisions
      : "llama-3.3-70b-versatile"; // Groq fallback

    const response = await getLLMClient().chat.completions.create({
      model,
      messages: [
        { role: "system", content: personalityPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.7,
      max_tokens: 200,
      response_format: { type: "json_object" },
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      return { approved: false, reasoning: "No LLM response received" };
    }

    const parsed = JSON.parse(content) as LLMDecision;
    return {
      approved: Boolean(parsed.approved),
      reasoning: parsed.reasoning || "No reasoning provided",
    };
  } catch (error) {
    console.error("LLM confirmation failed:", error);
    // Fallback: approve ONLY if signal score is very high (STRENGTHENED from 75 to 85)
    return {
      approved: signal.score >= 85,
      reasoning: `LLM unavailable - fallback decision based on signal score ${signal.score}`,
    };
  }
}
