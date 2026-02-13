import { formatEther, parseEther } from "viem";
import type { PublicClient, WalletClient } from "viem";
import type { PrivateKeyAccount } from "viem/accounts";
import { prisma } from "@/lib/db";
import { TRADE_CONFIG, MKEY } from "@/lib/config";
import {
  buyToken,
  sellToken,
  getCurveProgress,
} from "@/lib/blockchain/trading";
import { getQuote, getVaultAgentInfo, getVaultAgentHolding } from "@/lib/blockchain/vault";
import {
  fetchRecentTokens,
  getTokenPrice,
  getTokenChart,
  getTokenHolders,
  type RecentToken,
} from "@/lib/nadfun/api";
import {
  STRATEGY_SCORERS,
  volumeToMon,
  type MarketSignal,
  type TokenContext,
} from "./signal-engine";
import { makeAgentDecision, type AgentDecision } from "./llm-decision-maker";
import { getAgentLearningProfile, shouldTakeTradeBasedOnLearning, getRecommendedPositionSize, recordTradeOutcome } from "./learning-system";
import { executeMKEYBuyback, formatBuybackSummary } from "./monkey-buyback";
import { getPersonality } from "./agent-personalities";
import { postTradeToMoltbook } from "./moltbook-poster";
import { computeIndicators } from "./technical-analysis";
import { log as fileLog } from "@/lib/logger";
import { analyzeHolders } from "./whale-analysis";
import { checkTokenQuality, formatQualityCheck } from "./quality-filter";
import {
  detectMarketRegime,
  regimeThresholdAdjustment,
  type MarketRegime,
} from "./market-regime";
import { postBuyMonitor } from "./post-buy-monitor";
import { deadTokenBlacklist } from "./dead-token-blacklist";
import { AgentCoordinator } from "./agent-coordinator";
import { isTokenInWindow } from "./agent-specialization";

/* ------------------------------------------------------------------ */
/*  Trailing stop state (in-memory per agent instance)                 */
/* ------------------------------------------------------------------ */
interface TrailingState {
  peakPnlPct: number;   // Highest PnL % seen since entry
  lastUpdated: number;   // timestamp
}

/* ------------------------------------------------------------------ */
/*  Hold duration: how many cycles a holding has been evaluated        */
/* ------------------------------------------------------------------ */
const STALE_HOLD_MINUTES = 90; // Force sell after 90 minutes (extended from 30min for longer holds)

export class BaseAgent {
  public dbAgentId: string;
  public vaultAgentId: number;
  public strategy: string;
  public name: string;
  private publicClient: PublicClient;
  private walletClient: WalletClient;
  private account: PrivateKeyAccount;
  // Trailing stop tracking: tokenAddress -> peak PnL state
  private trailingStops: Map<string, TrailingState> = new Map();

  constructor(
    dbAgentId: string,
    vaultAgentId: number,
    strategy: string,
    name: string,
    publicClient: PublicClient,
    walletClient: WalletClient,
    account: PrivateKeyAccount
  ) {
    this.dbAgentId = dbAgentId;
    this.vaultAgentId = vaultAgentId;
    this.strategy = strategy;
    this.name = name;
    this.publicClient = publicClient;
    this.walletClient = walletClient;
    this.account = account;
  }

  /**
   * Run a full trade cycle. Returns addresses of tokens bought (for cross-agent blacklist).
   */
  async runCycle(
    sharedRecentTokens?: RecentToken[],
    crossAgentBlacklist?: Set<string>
  ): Promise<string[]> {
    const boughtTokens: string[] = [];
    try {
      await this.log("decision", `Starting trade cycle for ${this.name}`);

      // Get agent balance from vault contract
      const vaultInfo = await getVaultAgentInfo(this.publicClient, this.vaultAgentId);
      const monBalance = vaultInfo.balance;

      // Sync vault state to DB
      await prisma.agent.update({
        where: { id: this.dbAgentId },
        data: {
          monBalance: monBalance.toString(),
          totalPnl: vaultInfo.totalPnl.toString(),
          mkeyBalance: vaultInfo.mkeyBalance.toString(),
          totalDistributed: vaultInfo.totalDistributed.toString(),
        },
      });

      // Check existing holdings for sell signals
      await this.evaluateHoldings();

      // Scan for new buy opportunities
      const bought = await this.scanAndBuy(monBalance, sharedRecentTokens, crossAgentBlacklist);
      if (bought) boughtTokens.push(bought);

      // Snapshot PnL
      await prisma.pnlSnapshot.create({
        data: {
          agentId: this.dbAgentId,
          pnl: vaultInfo.totalPnl.toString(),
          monBalance: monBalance.toString(),
        },
      });
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Unknown error";
      await this.log("error", `Trade cycle failed: ${msg}`);
    }
    return boughtTokens;
  }

  /**
   * Returns the token address that was bought, or null if no buy happened.
   */
  private async scanAndBuy(
    monBalance: bigint,
    sharedRecentTokens?: RecentToken[],
    crossAgentBlacklist?: Set<string>
  ): Promise<string | null> {
    const minAmount = parseEther(TRADE_CONFIG.MIN_TRADE_AMOUNT);
    if (monBalance < minAmount) {
      await this.log("decision", "Insufficient vault balance for trading");
      return null;
    }

    const holdings = await prisma.holding.findMany({
      where: { agentId: this.dbAgentId },
    });
    if (holdings.length >= TRADE_CONFIG.MAX_HOLDINGS_PER_AGENT) {
      await this.log("decision", "Max holdings reached, waiting for sells");
      return null;
    }

    // Use shared tokens from runner (fetched once per cycle)
    // Only fallback to individual fetch if no shared data was provided (e.g. runSingleAgentCycle)
    const recentTokens = sharedRecentTokens !== undefined
      ? sharedRecentTokens
      : await fetchRecentTokens(50);
    if (recentTokens.length === 0) {
      await this.log("decision", "No tokens available to analyze (API may be rate-limited)");
      return null;
    }

    // --- Market regime detection (uses inline market_info to avoid API rate limits) ---
    const tokenMarketPairs: Array<{ token: (typeof recentTokens)[0]; market: Awaited<ReturnType<typeof getTokenPrice>> }> = [];
    for (const token of recentTokens.slice(0, 20)) {
      const m = token.market_info;
      if (m) {
        tokenMarketPairs.push({
          token,
          market: {
            price: m.price_native || m.price || "0",
            market_cap: m.reserve_native || "0",
            volume_24h: m.volume || "0",
            price_change_1h: (token as any).percent_1h ?? 0,
            price_change_24h: token.percent ?? 0,
            holder_count: m.holder_count ?? 0,
            total_supply: m.total_supply,
            is_graduated: m.market_type === "DEX",
          },
        });
      }
    }
    const regimeAnalysis = detectMarketRegime(tokenMarketPairs);
    const regime: MarketRegime = regimeAnalysis.regime;

    // Adjust signal threshold based on market regime
    const dynamicThreshold = regimeThresholdAdjustment(
      regime,
      TRADE_CONFIG.SIGNAL_THRESHOLD
    );

    await this.log(
      "decision",
      `Market regime: ${regime} (confidence: ${regimeAnalysis.confidence}%) | Threshold: ${dynamicThreshold} | ${regimeAnalysis.reasons.slice(-2).join("; ")}`
    );

    // --- Build blacklist: held tokens + MKEY + recently sold + cross-agent bought ---
    const blacklist = new Set(
      holdings.map((h) => h.tokenAddress.toLowerCase())
    );
    blacklist.add(MKEY.address.toLowerCase());

    // Add cross-agent blacklist (tokens bought by other agents this cycle)
    if (crossAgentBlacklist) {
      for (const addr of crossAgentBlacklist) {
        blacklist.add(addr);
      }
    }

    // Add recently sold tokens (cooldown: don't re-buy within 30 minutes)
    const recentSells = await prisma.trade.findMany({
      where: {
        agentId: this.dbAgentId,
        type: "sell",
        createdAt: { gte: new Date(Date.now() - 30 * 60 * 1000) },
      },
      select: { tokenAddress: true },
    });
    for (const sell of recentSells) {
      blacklist.add(sell.tokenAddress.toLowerCase());
    }

    if (crossAgentBlacklist && crossAgentBlacklist.size > 0) {
      await this.log("decision", `Blacklisted ${blacklist.size} tokens (${crossAgentBlacklist.size} from other agents this cycle, ${recentSells.length} recently sold)`);
    }

    const scorer = STRATEGY_SCORERS[this.strategy];
    if (!scorer) {
      await this.log("error", `Unknown strategy: ${this.strategy}`);
      return null;
    }

    const signals: MarketSignal[] = [];

    // Limit detailed analysis to top candidates (avoid excessive API calls)
    let detailedCount = 0;
    const MAX_DETAILED = 5; // Only fetch chart/holders for top 5 promising tokens

    for (const token of recentTokens) {
      const tokenAddress = token.token_info.token_id.toLowerCase();
      if (blacklist.has(tokenAddress)) continue;

      // Use inline market_info first, fallback to cached regime data, then API
      const m = token.market_info;
      let market: Awaited<ReturnType<typeof getTokenPrice>> = null;
      if (m) {
        market = {
          price: m.price_native || m.price || "0",
          market_cap: m.reserve_native || "0",
          volume_24h: m.volume || "0",
          price_change_1h: (token as any).percent_1h ?? 0,
          price_change_24h: token.percent ?? 0,
          holder_count: m.holder_count ?? 0,
          total_supply: m.total_supply,
          is_graduated: m.market_type === "DEX",
        };
      } else {
        const cached = tokenMarketPairs.find(
          (p) => p.token.token_info.token_id.toLowerCase() === tokenAddress
        );
        market = cached?.market ?? null;
      }
      if (!market) continue;

      // ═══ HARD QUALITY FILTERS — reject garbage tokens before wasting API calls ═══

      // FILTER 1: Skip blacklisted dead tokens (detected as dead in last 1 hour)
      if (deadTokenBlacklist.isBlacklisted(tokenAddress)) {
        const info = deadTokenBlacklist.getInfo(tokenAddress);
        console.log(`[${this.strategy}] SKIP ${token.token_info.symbol}: BLACKLISTED - ${info?.reason}`);
        continue;
      }

      // FILTER 2: QUALITY CHECK - Only proceed with high-quality tokens (18% win rate fix)
      const qualityCheck = checkTokenQuality(token);
      if (!qualityCheck.passed) {
        console.log(`[${this.strategy}] ${formatQualityCheck(token, qualityCheck)}`);
        continue;
      }
      // Token passed quality check - log it
      console.log(`[${this.strategy}] ${formatQualityCheck(token, qualityCheck)}`);

      // FILTER 3: Must have non-zero price (redundant after quality check, but keep for safety)
      if (!market.price || parseFloat(market.price) <= 0) continue;

      // FILTER 3: Must have minimum volume (convert from wei to MON)
      // LOW VOLUME MARKET: Much lower thresholds to match market conditions
      const vol24hMon = volumeToMon(market.volume_24h || "0");
      const minVolume = (this.strategy === "sniper" || this.strategy === "alpha_hunter") ? 100 : 1_000; // LOW VOLUME: 5K→1K
      if (vol24hMon < minVolume) {
        console.log(`[${this.strategy}] SKIP ${token.token_info.symbol}: Low volume ${vol24hMon.toFixed(0)} MON (need ${minVolume})`);
        continue;
      }

      // FILTER 4: Must have minimum 30 holders (LOW VOLUME: matches quality filter)
      // Match quality filter requirements for consistency
      const MIN_HOLDERS = 30;
      if (market.holder_count !== undefined && market.holder_count < MIN_HOLDERS) {
        console.log(`[${this.strategy}] SKIP ${token.token_info.symbol}: Only ${market.holder_count} holders (need ${MIN_HOLDERS})`);
        continue;
      }

      // FILTER 5: Skip tokens actively dumping hard (except contrarian strategy)
      if (this.strategy !== "contrarian") {
        const change1h = market.price_change_1h ?? 0;
        if (change1h < -20) continue; // Crashing token, stay away
      }

      const ageSeconds =
        Math.floor(Date.now() / 1000) - token.token_info.created_at;

      let curveProgress: number | undefined;
      try {
        const progress = await getCurveProgress(
          this.publicClient,
          tokenAddress as `0x${string}`
        );
        curveProgress = Number(progress);
      } catch {
        // Token might not be on curve
      }

      // FILTER 6: Agent specialization - TIME WINDOW enforcement
      // Each agent only looks at tokens in their time window to prevent competition
      const windowCheck = isTokenInWindow(this.strategy, ageSeconds, curveProgress);
      if (!windowCheck.allowed) {
        console.log(`[${this.strategy}] SKIP ${token.token_info.symbol}: ${windowCheck.reason}`);
        continue;
      }

      // --- Fetch chart + holder data only for limited number of tokens ---
      let technical = null;
      let whaleData = null;
      if (detailedCount < MAX_DETAILED) {
        try {
          // Throttle API calls (500ms between requests)
          await new Promise((r) => setTimeout(r, 500));
          const chart = await getTokenChart(tokenAddress, "1h");
          if (chart.length >= 5) {
            technical = computeIndicators(chart);
          }
        } catch {
          // Chart data unavailable
        }

        try {
          await new Promise((r) => setTimeout(r, 500));
          const holders = await getTokenHolders(tokenAddress);
          if (holders.length > 0) {
            whaleData = analyzeHolders(holders);
          }
        } catch {
          // Holder data unavailable
        }
        detailedCount++;
      }

      const ctx: TokenContext = {
        token,
        market,
        curveProgress,
        ageSeconds,
        technical,
        whaleData,
        regime,
      };
      const signal = scorer(ctx);
      if (signal.score >= dynamicThreshold) {
        signals.push(signal);
      }
    }

    signals.sort((a, b) => b.score - a.score);

    if (signals.length === 0) {
      await this.log("decision", `No tokens passed dynamic threshold (${dynamicThreshold}) in ${regime} market`);
      return null;
    }

    // 🧠 HACKATHON MODE: LLM-First Decision Making
    // Instead of: "Pick top signal → LLM confirms"
    // Now: "Get top 5 candidates → LLM decides which one (or SKIP)"

    const topCandidates = signals.slice(0, Math.min(5, signals.length));

    await this.log(
      "decision",
      `Found ${signals.length} candidates above threshold. Asking LLM to analyze top ${topCandidates.length}...`
    );

    // Load agent learning profile
    const learningProfile = await getAgentLearningProfile(this.dbAgentId);
    const personality = getPersonality(this.strategy);

    await this.log(
      "personality",
      `🎭 ${personality.name}: "${personality.philosophy}" | Win Rate: ${(learningProfile.winRate * 100).toFixed(1)}% | Confidence Threshold: ${learningProfile.confidenceThreshold}%`
    );

    // Fetch recent trade history for learning
    const recentTrades = await prisma.trade.findMany({
      where: { agentId: this.dbAgentId },
      orderBy: { createdAt: "desc" },
      take: 20,
    });

    // Ask LLM to make THE decision (not just confirm)
    let chosenToken: { signal: MarketSignal; decision: AgentDecision } | null = null;

    for (const signal of topCandidates) {
      const tokenData = recentTokens.find(
        (t) => t.token_info.token_id.toLowerCase() === signal.tokenAddress.toLowerCase()
      );
      if (!tokenData) continue;

      const agentDecision = await makeAgentDecision(
        this.strategy,
        {
          token: tokenData,
          age: Math.floor(Date.now() / 1000) - tokenData.token_info.created_at,
          holderGrowth: undefined,
          priceChange1h: signal.metrics.priceChange1h as number | undefined,
          volumeTrend: signal.metrics.volumeTrend as string | undefined,
          marketRegime: regime,
        },
        recentTrades,
        holdings.length,
        learningProfile.maxPositions
      );

      await this.log(
        "llm_decision",
        `LLM Decision for ${signal.tokenSymbol}: ${agentDecision.action} (confidence: ${agentDecision.confidence}%) - ${agentDecision.reasoning}`
      );

      if (agentDecision.action === "BUY") {
        // Check learning system approval
        const learningCheck = shouldTakeTradeBasedOnLearning(
          learningProfile,
          agentDecision.confidence,
          holdings.length
        );

        if (!learningCheck.allowed) {
          await this.log(
            "learning",
            `❌ Learning system blocked trade: ${learningCheck.reason}`
          );
          continue;
        }

        chosenToken = { signal, decision: agentDecision };
        break;
      }
    }

    if (!chosenToken) {
      await this.log("decision", `LLM analyzed ${topCandidates.length} candidates and decided to SKIP all`);
      return null;
    }

    const { signal: topSignal, decision: llmDecision } = chosenToken;

    // 🔒 CROSS-AGENT COORDINATION: Claim this token exclusively
    const claimed = AgentCoordinator.claimToken(
      topSignal.tokenAddress,
      this.dbAgentId,
      this.name,
      `LLM decision: ${llmDecision.confidence}% confidence`,
      300000
    );

    if (!claimed) {
      await this.log(
        "decision",
        `Token ${topSignal.tokenSymbol} already claimed by another agent - avoiding competition`
      );
      return null;
    }

    await this.log(
      "decision",
      `🎯 LLM CHOSE: ${topSignal.tokenSymbol} (confidence: ${llmDecision.confidence}%, signal: ${topSignal.score}) | ${llmDecision.reasoning}`,
      JSON.stringify({ signal: topSignal, llm: llmDecision, regime, personality: personality.name })
    );

    // --- Learning-based position sizing ---
    const tradeAmount = llmDecision.targetAmount || getRecommendedPositionSize(learningProfile, llmDecision.confidence);
    const tradeAmountStr = tradeAmount.toFixed(4);

    const tradeWei = parseEther(tradeAmountStr);
    if (tradeWei > monBalance) {
      await this.log("decision", "Trade amount exceeds vault balance");
      AgentCoordinator.releaseToken(topSignal.tokenAddress, this.dbAgentId);
      return null;
    }

    try {
      const result = await buyToken(
        this.publicClient,
        this.walletClient,
        this.account,
        this.vaultAgentId,
        topSignal.tokenAddress as `0x${string}`,
        tradeAmountStr
      );

      await prisma.trade.create({
        data: {
          agentId: this.dbAgentId,
          tokenAddress: topSignal.tokenAddress,
          tokenSymbol: topSignal.tokenSymbol,
          tokenName: topSignal.tokenName,
          type: "buy",
          amountIn: result.amountIn.toString(),
          amountOut: result.amountOut.toString(),
          priceAtTrade: topSignal.metrics.price as string,
          txHash: result.txHash,
          reason: `${topSignal.reasons.join("; ")} | LLM: ${llmDecision.reasoning} | Size: ${tradeAmountStr} MON (confidence: ${llmDecision.confidence}%, regime: ${regime})`,
          signal: JSON.stringify(topSignal),
          llmApproval: true,
        },
      });

      await prisma.holding.upsert({
        where: {
          agentId_tokenAddress: {
            agentId: this.dbAgentId,
            tokenAddress: topSignal.tokenAddress,
          },
        },
        create: {
          agentId: this.dbAgentId,
          tokenAddress: topSignal.tokenAddress,
          tokenSymbol: topSignal.tokenSymbol,
          tokenName: topSignal.tokenName,
          amount: result.amountOut.toString(),
          costBasis: result.amountIn.toString(),
        },
        update: {
          amount: result.amountOut.toString(),
          costBasis: result.amountIn.toString(),
        },
      });

      // Initialize trailing stop for this position
      this.trailingStops.set(topSignal.tokenAddress.toLowerCase(), {
        peakPnlPct: 0,
        lastUpdated: Date.now(),
      });

      // Start post-buy monitoring (MEV/sniper style)
      await postBuyMonitor.startMonitoring({
        tokenAddress: topSignal.tokenAddress,
        tokenSymbol: topSignal.tokenSymbol,
        buyTime: Date.now(),
        buyPrice: parseFloat(topSignal.metrics.price as string),
        buyHolderCount: Number(topSignal.metrics.holderCount),
        buyVolume: volumeToMon(topSignal.metrics.volume24h as string),
        buyCurveProgress: Number(topSignal.metrics.curveProgress) / 100,
      });

      await this.log(
        "trade",
        `BUY ${topSignal.tokenSymbol}: ${tradeAmountStr} MON → ${formatEther(result.amountOut)} tokens (LLM confidence: ${llmDecision.confidence}%, regime: ${regime}) | Post-buy monitoring started`,
        JSON.stringify({ txHash: result.txHash, narrative: llmDecision.narrative, risks: llmDecision.risks })
      );

      // 📱 MOLTBOOK: Post buy to social network (async, non-blocking)
      postTradeToMoltbook(
        this.strategy,
        topSignal.tokenSymbol,
        "BUY",
        undefined,
        llmDecision.reasoning
      ).catch((err) => console.error("[Moltbook] Post failed:", err));

      return topSignal.tokenAddress.toLowerCase();
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Unknown error";
      await this.log("error", `Buy failed for ${topSignal.tokenSymbol}: ${msg}`);

      // Release token claim on error
      AgentCoordinator.releaseToken(topSignal.tokenAddress, this.dbAgentId);

      return null;
    }
  }

  /* ------------------------------------------------------------------ */
  /*  Dynamic position sizing - percentage of vault balance              */
  /*  Conservative: 5-10% of balance based on signal strength            */
  /* ------------------------------------------------------------------ */
  private calculatePositionSize(signalScore: number, regime: MarketRegime, agentBalance: bigint): string {
    const minTrade = parseFloat(TRADE_CONFIG.MIN_TRADE_AMOUNT);
    const balanceInMon = parseFloat(formatEther(agentBalance));

    // Normalize score (threshold is 90, max 100 → range 90-100 maps to 0-1)
    const normalized = Math.max(0, Math.min(1, (signalScore - 90) / 10));

    // Base size: 5-10% of balance based on signal score
    // Low signals (90) → 5% of balance
    // High signals (100) → 10% of balance
    const basePercent = 5 + normalized * 5; // 5% to 10%
    let size = balanceInMon * (basePercent / 100);

    // Regime adjustment
    if (regime === "bull") {
      size *= 1.15; // +15% in bull market
    } else if (regime === "bear") {
      size *= 0.6; // -40% in bear market
    }

    // Strategy risk adjustment
    if (this.strategy === "sniper" || this.strategy === "alpha_hunter") {
      size *= 0.7; // Smaller positions for high-risk early plays
    } else if (this.strategy === "diamond_hands") {
      size *= 1.1; // Slightly larger for conviction holds
    }

    // Ensure minimum trade size (avoid dust trades)
    size = Math.max(minTrade, size);

    // Cap at 15% of balance for safety (even with 100 score + bull market)
    const maxSafeSize = balanceInMon * 0.15;
    size = Math.min(size, maxSafeSize);

    return size.toFixed(4);
  }

  /* ------------------------------------------------------------------ */
  /*  Holdings evaluation with trailing stop + partial exits             */
  /* ------------------------------------------------------------------ */
  private async evaluateHoldings(): Promise<void> {
    const holdings = await prisma.holding.findMany({
      where: { agentId: this.dbAgentId },
    });

    for (const holding of holdings) {
      if (holding.tokenAddress.toLowerCase() === MKEY.address.toLowerCase()) {
        continue;
      }

      try {
        // Get holding from vault contract
        let balance = 0n;
        try {
          const vaultHolding = await getVaultAgentHolding(
            this.publicClient,
            this.vaultAgentId,
            holding.tokenAddress as `0x${string}`
          );
          balance = vaultHolding.amount;
        } catch (err) {
          // If vault read fails, use DB amount as fallback
          await this.log("decision", `Vault read failed for ${holding.tokenSymbol}, using DB amount`);
          balance = BigInt(holding.amount || "0");
        }

        if (balance <= 0n) {
          await prisma.holding.delete({ where: { id: holding.id } });
          this.trailingStops.delete(holding.tokenAddress.toLowerCase());
          await this.log("decision", `Removed ${holding.tokenSymbol} — zero balance`);
          continue;
        }

        // Get sell quote (how much MON we'd get for selling)
        let monValue = 0n;
        try {
          const { amountOut } = await getQuote(
            this.publicClient,
            holding.tokenAddress as `0x${string}`,
            balance,
            false
          );
          monValue = amountOut;
        } catch {
          await this.log("decision", `Cannot quote ${holding.tokenSymbol} — skipping evaluation`);
          continue;
        }

        const costBasis = BigInt(holding.costBasis);
        const unrealizedPnl = monValue - costBasis;
        const pnlPercent = costBasis > 0n
          ? Number((unrealizedPnl * 10000n) / costBasis) / 100
          : 0;

        // Calculate how long we've held this position
        const holdDurationMinutes = holding.acquiredAt
          ? (Date.now() - new Date(holding.acquiredAt).getTime()) / 60000
          : 0;

        await prisma.holding.update({
          where: { id: holding.id },
          data: {
            amount: balance.toString(),
            currentValue: monValue.toString(),
            unrealizedPnl: unrealizedPnl.toString(),
          },
        });

        await this.log(
          "decision",
          `Evaluating ${holding.tokenSymbol}: value ${formatEther(monValue)} MON, cost ${formatEther(costBasis)} MON, PnL ${pnlPercent.toFixed(1)}%, held ${holdDurationMinutes.toFixed(0)}min`
        );

        // --- Post-Buy Momentum Check (first 10 minutes - extended window for cycle timing) ---
        if (holding.acquiredAt && holdDurationMinutes <= 10) {
          try {
            console.log(`[POST-BUY] Checking ${holding.tokenSymbol} (age: ${holdDurationMinutes.toFixed(1)}min)`);

            const buyTime = new Date(holding.acquiredAt).getTime();
            // Get initial metrics from first trade
            const initialTrade = await prisma.trade.findFirst({
              where: {
                agentId: this.dbAgentId,
                tokenAddress: holding.tokenAddress,
                type: "buy",
              },
              orderBy: { createdAt: "asc" },
              select: { signal: true },
            });

            if (!initialTrade?.signal) {
              console.log(`[POST-BUY] No signal data found for ${holding.tokenSymbol}`);
              await this.log("decision", `⚠️ Post-buy check skipped for ${holding.tokenSymbol}: no signal data`);
            } else {
              const signalData = JSON.parse(initialTrade.signal as string);
              console.log(`[POST-BUY] Signal data: holders=${signalData.metrics?.holderCount}, price=${signalData.metrics?.price}`);

              const momentumCheck = await postBuyMonitor.checkMomentum(
                holding.tokenAddress,
                {
                  tokenAddress: holding.tokenAddress,
                  buyTime,
                  buyPrice: parseFloat(signalData.metrics?.price || "0"),
                  buyHolderCount: Number(signalData.metrics?.holderCount || 0),
                  buyVolume: volumeToMon(signalData.metrics?.volume24h || "0"),
                  buyCurveProgress: Number(signalData.metrics?.curveProgress || 0) / 100,
                }
              );

              console.log(`[POST-BUY] Momentum result: ${momentumCheck.action} - ${momentumCheck.reason}`);
              await this.log("decision", `📊 Post-buy momentum: ${holding.tokenSymbol} → ${momentumCheck.action} (${momentumCheck.confidence}%)`);

              if (momentumCheck.action !== "HOLD") {
                await this.log(
                  "trade",
                  `🎯 POST-BUY MOMENTUM TRIGGER: ${holding.tokenSymbol} → ${momentumCheck.action} | ${momentumCheck.reason}`
                );

                // Execute early exit based on momentum
                const isEarlyProfit = momentumCheck.action === "SELL_DEMAND_SPIKE";
                const sellAmount = isEarlyProfit ? balance : balance; // Full exit for now

                await this.executeSell(
                  holding,
                  sellAmount,
                  monValue,
                  costBasis,
                  `POST-BUY MOMENTUM: ${momentumCheck.reason}`,
                  true // full exit
                );
                continue; // Skip normal sell evaluation
              }
            }
          } catch (err) {
            const errMsg = err instanceof Error ? err.message : String(err);
            console.error(`[POST-BUY] Error for ${holding.tokenSymbol}:`, errMsg);
            await this.log("error", `Post-buy momentum check failed for ${holding.tokenSymbol}: ${errMsg}`);
            // Continue with normal evaluation
          }
        }

        // --- Update trailing stop ---
        const tokenKey = holding.tokenAddress.toLowerCase();
        let trailing = this.trailingStops.get(tokenKey);
        if (!trailing) {
          trailing = { peakPnlPct: pnlPercent, lastUpdated: Date.now() };
          this.trailingStops.set(tokenKey, trailing);
        }
        if (pnlPercent > trailing.peakPnlPct) {
          trailing.peakPnlPct = pnlPercent;
          trailing.lastUpdated = Date.now();
        }

        // --- Check sell conditions ---
        const sellDecision = this.evaluateSellCondition(
          holding.tokenSymbol,
          costBasis,
          monValue,
          unrealizedPnl,
          trailing,
          holdDurationMinutes
        );

        if (sellDecision.sell) {
          // All sell decisions are executed immediately — evaluateSellCondition already
          // does thorough analysis (PnL thresholds, time-based, trailing stops).
          // LLM confirmation was blocking profitable sells when Groq is rate-limited.
          await this.log("decision", `Sell triggered for ${holding.tokenSymbol}: ${sellDecision.reason}`);

          const sellAmount = this.calculateSellAmount(
            balance,
            pnlPercent,
            sellDecision.exitType
          );

          await this.executeSell(
            holding,
            sellAmount,
            monValue,
            costBasis,
            `${sellDecision.reason} | Exit: ${sellDecision.exitType} (${((Number(sellAmount) / Number(balance)) * 100).toFixed(0)}%)`,
            sellAmount === balance // isFullExit
          );
        }
      } catch (error) {
        const msg = error instanceof Error ? error.message : "Unknown error";
        await this.log("error", `Failed to evaluate holding ${holding.tokenSymbol}: ${msg}`);
      }
    }
  }

  /* ------------------------------------------------------------------ */
  /*  Sell condition evaluation with trailing stop + time-based exit      */
  /*  Meme tokens move 10-50% in minutes — calibrated accordingly        */
  /* ------------------------------------------------------------------ */
  private evaluateSellCondition(
    _symbol: string,
    costBasis: bigint,
    _currentValue: bigint,
    unrealizedPnl: bigint,
    trailing: TrailingState,
    holdDurationMinutes: number
  ): { sell: boolean; reason: string; exitType: "partial" | "full" } {
    if (costBasis <= 0n) return { sell: false, reason: "No cost basis", exitType: "full" };

    const pnlPercent = Number((unrealizedPnl * 10000n) / costBasis) / 100;

    // ═══ STRATEGY-SPECIFIC PROFIT TARGETS (check first — take profits early!) ═══
    const profitCheck = this.checkStrategyProfitTargets(pnlPercent);
    if (profitCheck.sell) return profitCheck;

    // ═══ IMMEDIATE EXITS — hard stop-loss ═══
    // Tightened stop-loss to cut losses faster (was -10/-12, now -5/-7)
    // Sniper/Alpha use tighter stops since they're in early
    const stopLoss = (this.strategy === "sniper" || this.strategy === "alpha_hunter") ? -5 : -7;
    if (pnlPercent <= stopLoss) {
      return {
        sell: true,
        reason: `Stop loss: ${pnlPercent.toFixed(1)}% loss`,
        exitType: "full",
      };
    }

    // ═══ TRAILING STOP (lock in gains) ═══
    const trailingDropPct = trailing.peakPnlPct - pnlPercent;
    const trailingThreshold = this.getTrailingStopThreshold();

    // Trailing activates once we've seen meaningful profit (>5%)
    if (trailing.peakPnlPct > 5 && trailingDropPct > trailingThreshold) {
      return {
        sell: true,
        reason: `Trailing stop: dropped ${trailingDropPct.toFixed(1)}% from peak of +${trailing.peakPnlPct.toFixed(1)}%`,
        exitType: pnlPercent > 0 ? "full" : "full",
      };
    }

    // ═══ TIME-BASED EXITS (Softened thresholds to avoid premature exits) ═══

    // After 20 minutes with good profit: take it
    if (holdDurationMinutes >= 20 && pnlPercent >= 8) {
      return {
        sell: true,
        reason: `Time profit: +${pnlPercent.toFixed(1)}% after ${holdDurationMinutes.toFixed(0)}min`,
        exitType: "full",
      };
    }

    // After 30 minutes: take decent profit
    if (holdDurationMinutes >= 30 && pnlPercent >= 3) {
      return {
        sell: true,
        reason: `Time profit: +${pnlPercent.toFixed(1)}% after ${holdDurationMinutes.toFixed(0)}min`,
        exitType: "full",
      };
    }

    // After 40 minutes: cut meaningful losses (tolerate small dips)
    if (holdDurationMinutes >= 40 && pnlPercent <= -3) {
      return {
        sell: true,
        reason: `Time stop: ${pnlPercent.toFixed(1)}% loss after ${holdDurationMinutes.toFixed(0)}min`,
        exitType: "full",
      };
    }

    // After 60 minutes: sell if losing significantly (extended patience)
    if (holdDurationMinutes >= 60 && pnlPercent <= -5) {
      return {
        sell: true,
        reason: `Extended hold: ${pnlPercent.toFixed(1)}% loss after ${holdDurationMinutes.toFixed(0)}min`,
        exitType: "full",
      };
    }

    // After 90 minutes: stale position (was 30min, now much longer)
    if (holdDurationMinutes >= STALE_HOLD_MINUTES) {
      return {
        sell: true,
        reason: `Stale position: held ${holdDurationMinutes.toFixed(0)}min, PnL ${pnlPercent.toFixed(1)}%`,
        exitType: "full",
      };
    }

    return { sell: false, reason: "Hold", exitType: "full" };
  }

  /* ------------------------------------------------------------------ */
  /*  Strategy-specific profit targets                                    */
  /*  Reduced targets for faster profit realization (was 25-100%, now 12-60%) */
  /* ------------------------------------------------------------------ */
  private checkStrategyProfitTargets(
    pnlPercent: number
  ): { sell: boolean; reason: string; exitType: "partial" | "full" } {
    switch (this.strategy) {
      case "sniper":
        // Sniper: fast in, fast out — take 15% quickly, 30% for big wins (reduced from 25/50)
        if (pnlPercent >= 30) return { sell: true, reason: `Snipe moon: +${pnlPercent.toFixed(1)}%`, exitType: "full" };
        if (pnlPercent >= 15) return { sell: true, reason: `Snipe profit: +${pnlPercent.toFixed(1)}%`, exitType: "partial" };
        break;
      case "alpha_hunter":
        // Alpha: quick flip, 12-20% targets (reduced from 15/30)
        if (pnlPercent >= 20) return { sell: true, reason: `Alpha moon: +${pnlPercent.toFixed(1)}%`, exitType: "full" };
        if (pnlPercent >= 12) return { sell: true, reason: `Alpha profit: +${pnlPercent.toFixed(1)}%`, exitType: "partial" };
        break;
      case "diamond_hands":
        // Diamond: hold for big moves, 20-60% targets (reduced from 30-100%)
        if (pnlPercent >= 60) return { sell: true, reason: `Diamond 60%: +${pnlPercent.toFixed(1)}%`, exitType: "full" };
        if (pnlPercent >= 30) return { sell: true, reason: `Diamond big win: +${pnlPercent.toFixed(1)}%`, exitType: "partial" };
        if (pnlPercent >= 20) return { sell: true, reason: `Diamond partial: +${pnlPercent.toFixed(1)}%`, exitType: "partial" };
        break;
      case "swing_trader":
        // Swing: ride the swing, 8-18% targets (reduced from 10/25)
        if (pnlPercent >= 18) return { sell: true, reason: `Swing target: +${pnlPercent.toFixed(1)}%`, exitType: "full" };
        if (pnlPercent >= 8) return { sell: true, reason: `Swing partial: +${pnlPercent.toFixed(1)}%`, exitType: "partial" };
        break;
      case "degen_ape":
        // Degen: ride to the moon or die, 15-60% targets (reduced from 20-100%)
        if (pnlPercent >= 60) return { sell: true, reason: `Degen 60%: +${pnlPercent.toFixed(1)}%`, exitType: "full" };
        if (pnlPercent >= 30) return { sell: true, reason: `Degen big win: +${pnlPercent.toFixed(1)}%`, exitType: "partial" };
        if (pnlPercent >= 15) return { sell: true, reason: `Degen partial: +${pnlPercent.toFixed(1)}%`, exitType: "partial" };
        break;
      case "volume_watcher":
        // Volume: follow the flow, 12-20% targets (reduced from 15/30)
        if (pnlPercent >= 20) return { sell: true, reason: `Volume target: +${pnlPercent.toFixed(1)}%`, exitType: "full" };
        if (pnlPercent >= 12) return { sell: true, reason: `Volume partial: +${pnlPercent.toFixed(1)}%`, exitType: "partial" };
        break;
      case "trend_follower":
        // Trend: ride the trend, 12-25% targets (reduced from 15/40)
        if (pnlPercent >= 25) return { sell: true, reason: `Trend target: +${pnlPercent.toFixed(1)}%`, exitType: "full" };
        if (pnlPercent >= 12) return { sell: true, reason: `Trend partial: +${pnlPercent.toFixed(1)}%`, exitType: "partial" };
        break;
      case "contrarian":
        // Contrarian: mean reversion, 12-20% targets (reduced from 15/30)
        if (pnlPercent >= 20) return { sell: true, reason: `Contrarian exit: +${pnlPercent.toFixed(1)}%`, exitType: "full" };
        if (pnlPercent >= 12) return { sell: true, reason: `Contrarian partial: +${pnlPercent.toFixed(1)}%`, exitType: "partial" };
        break;
    }
    return { sell: false, reason: "Hold", exitType: "full" };
  }

  /**
   * Trailing stop threshold per strategy.
   * Once PnL drops this % from its peak, trigger trailing stop.
   * Meme tokens are volatile — trail wider to avoid premature exits.
   */
  private getTrailingStopThreshold(): number {
    switch (this.strategy) {
      case "sniper": return 8;        // Fast plays, trail tighter
      case "alpha_hunter": return 10;  // Early entry, allow swings
      case "diamond_hands": return 15; // Long hold, wide trail
      case "swing_trader": return 8;   // Technical plays
      case "degen_ape": return 12;     // High vol plays, wide trail
      case "volume_watcher": return 10;
      case "trend_follower": return 10;
      case "contrarian": return 10;
      default: return 10;
    }
  }

  /* ------------------------------------------------------------------ */
  /*  Partial exit calculation                                           */
  /* ------------------------------------------------------------------ */
  private calculateSellAmount(
    totalBalance: bigint,
    _pnlPercent: number,
    exitType: "partial" | "full"
  ): bigint {
    if (exitType === "full") return totalBalance;

    // Partial exit: sell ~40-60% of position
    // Keeps some exposure if the token continues to run
    const sellPct = 50n; // 50%
    const sellAmount = (totalBalance * sellPct) / 100n;

    // Ensure we sell at least a minimum meaningful amount
    const minSellAmount = totalBalance / 4n; // At least 25%
    return sellAmount > minSellAmount ? sellAmount : minSellAmount;
  }

  /* ------------------------------------------------------------------ */
  /*  Execute sell (supports partial)                                    */
  /* ------------------------------------------------------------------ */
  private async executeSell(
    holding: { id: string; tokenAddress: string; tokenSymbol: string; tokenName: string; costBasis: string },
    sellAmount: bigint,
    _currentValue: bigint,
    costBasis: bigint,
    reason: string,
    isFullExit: boolean
  ): Promise<void> {
    try {
      const result = await sellToken(
        this.publicClient,
        this.walletClient,
        this.account,
        this.vaultAgentId,
        holding.tokenAddress as `0x${string}`,
        sellAmount
      );

      // For partial sells, calculate proportional cost basis
      const totalBalance = await getVaultAgentHolding(
        this.publicClient,
        this.vaultAgentId,
        holding.tokenAddress as `0x${string}`
      ).then(h => h.amount + sellAmount).catch(() => sellAmount);

      const proportionalCost = totalBalance > 0n
        ? (costBasis * sellAmount) / totalBalance
        : costBasis;
      const realizedPnl = result.amountOut - proportionalCost;

      await prisma.trade.create({
        data: {
          agentId: this.dbAgentId,
          tokenAddress: holding.tokenAddress,
          tokenSymbol: holding.tokenSymbol,
          tokenName: holding.tokenName,
          type: "sell",
          amountIn: sellAmount.toString(),
          amountOut: result.amountOut.toString(),
          priceAtTrade: "0",
          txHash: result.txHash,
          pnl: realizedPnl.toString(),
          reason,
        },
      });

      if (isFullExit) {
        await prisma.holding.delete({ where: { id: holding.id } });
        this.trailingStops.delete(holding.tokenAddress.toLowerCase());
        postBuyMonitor.stopMonitoring(holding.tokenAddress); // Stop post-buy monitoring
      } else {
        // Update holding with reduced amount and adjusted cost basis
        const remainingCost = costBasis - proportionalCost;
        await prisma.holding.update({
          where: { id: holding.id },
          data: {
            costBasis: remainingCost > 0n ? remainingCost.toString() : "0",
          },
        });
      }

      // Sync updated stats from vault (profit distribution + MKEY buy happened on-chain)
      const vaultInfo = await getVaultAgentInfo(this.publicClient, this.vaultAgentId);
      await prisma.agent.update({
        where: { id: this.dbAgentId },
        data: {
          totalPnl: vaultInfo.totalPnl.toString(),
          mkeyBalance: vaultInfo.mkeyBalance.toString(),
          totalDistributed: vaultInfo.totalDistributed.toString(),
          winCount: realizedPnl > 0n ? { increment: 1 } : undefined,
          lossCount: realizedPnl < 0n ? { increment: 1 } : undefined,
        },
      });

      // 🧠 LEARNING SYSTEM: Record trade outcome for adaptation
      const pnlMON = Number(formatEther(realizedPnl));
      const success = realizedPnl > 0n;
      await recordTradeOutcome(
        this.dbAgentId,
        holding.tokenSymbol,
        reason,
        pnlMON,
        success
      );

      const exitLabel = isFullExit ? "SELL" : "PARTIAL SELL";
      const personality = getPersonality(this.strategy);

      // 🐒 MKEY BUYBACK: Vault automatically uses 20% of profit for MKEY buyback (on-chain)
      // No need to manually trigger - it's handled by the vault contract
      if (realizedPnl > 0n) {
        const mkeyBuybackAmount = pnlMON * 0.2;
        await this.log(
          "trade",
          `${exitLabel} ${holding.tokenSymbol}: ${formatEther(sellAmount)} tokens → ${formatEther(result.amountOut)} MON (PnL: ${formatEther(realizedPnl)} MON) | ${personality.name} ${success ? "✅ WIN" : "❌ LOSS"} | Vault auto-buyback: ${mkeyBuybackAmount.toFixed(2)} MON → $MKEY`,
          JSON.stringify({ txHash: result.txHash, pnl: realizedPnl.toString(), isFullExit, learning: { success, pattern: reason } })
        );
      } else {
        await this.log(
          "trade",
          `${exitLabel} ${holding.tokenSymbol}: ${formatEther(sellAmount)} tokens → ${formatEther(result.amountOut)} MON (PnL: ${formatEther(realizedPnl)} MON) | ${personality.name} ${success ? "✅ WIN" : "❌ LOSS"}`,
          JSON.stringify({ txHash: result.txHash, pnl: realizedPnl.toString(), isFullExit, learning: { success, pattern: reason } })
        );
      }

      // 📱 MOLTBOOK: Post sell to social network (async, non-blocking)
      postTradeToMoltbook(
        this.strategy,
        holding.tokenSymbol,
        "SELL",
        pnlMON,
        reason
      ).catch((err) => console.error("[Moltbook] Post failed:", err));
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Unknown error";
      await this.log("error", `Sell failed for ${holding.tokenSymbol}: ${msg}`);
    }
  }

  private async log(type: string, message: string, data?: string): Promise<void> {
    // Log to file for debugging (non-blocking)
    fileLog(`[${this.name}] [${type.toUpperCase()}] ${message}`);

    // Log to database for persistence
    try {
      await prisma.agentLog.create({
        data: { agentId: this.dbAgentId, type, message, data },
      });
    } catch {
      console.error(`[${this.name}] Log failed: ${message}`);
    }
  }
}
