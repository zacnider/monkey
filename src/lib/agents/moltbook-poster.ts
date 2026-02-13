/**
 * Moltbook Poster - Agents post their trades to Moltbook social network
 *
 * 🎭 REAL PERSONALITY - Not just templates!
 * - Each agent thinks differently
 * - Posts are contextual and varied
 * - Feels like a human trader, not a bot
 */

import { createPost } from "@/lib/moltbook/api";
import { getPersonality } from "./agent-personalities";

// API keys from environment
const AGENT_MOLTBOOK_KEYS: Record<string, string | undefined> = {
  contrarian: process.env.MOLTBOOK_CONTRARIAN_KEY,
  volume_watcher: process.env.MOLTBOOK_VOLUME_KEY,
  sniper: process.env.MOLTBOOK_SNIPER_KEY,
  alpha_hunter: process.env.MOLTBOOK_ALPHA_KEY,
  swing_trader: process.env.MOLTBOOK_SWING_KEY,
  trend_follower: process.env.MOLTBOOK_TREND_KEY,
  diamond_hands: process.env.MOLTBOOK_DIAMOND_KEY,
  degen_ape: process.env.MOLTBOOK_DEGEN_KEY,
};

// Track post history to avoid repetition
const postHistory: Map<string, string[]> = new Map();

/**
 * Post a trade result to Moltbook with REAL personality
 */
export async function postTradeToMoltbook(
  strategy: string,
  tokenSymbol: string,
  action: "BUY" | "SELL",
  pnlMON?: number,
  reasoning?: string
): Promise<void> {
  const apiKey = AGENT_MOLTBOOK_KEYS[strategy];

  if (!apiKey) {
    return; // Moltbook is optional
  }

  try {
    const personality = getPersonality(strategy);
    const content = action === "BUY"
      ? craftBuyPost(personality, tokenSymbol, reasoning)
      : craftSellPost(personality, tokenSymbol, pnlMON, reasoning);

    // Avoid repetitive posts
    if (isRepetitive(strategy, content)) {
      console.log(`[Moltbook] Skipping repetitive post from ${personality.name}`);
      return;
    }

    const result = await createPost(apiKey, content);

    if (result.success) {
      recordPost(strategy, content);
      console.log(`[Moltbook] ✅ ${personality.name}: "${content.substring(0, 50)}..."`);
    } else {
      console.log(`[Moltbook] ⚠️ ${personality.name} post failed: ${result.error}`);
    }
  } catch (error) {
    console.error("[Moltbook] Error:", error);
  }
}

/**
 * Craft a BUY post with real thinking
 */
function craftBuyPost(
  personality: any,
  token: string,
  reasoning?: string
): string {
  const { name, strategy, philosophy } = personality;

  // CONTRARIAN - Cynical, sees opportunity in fear
  if (strategy === "contrarian") {
    const variants = [
      () => `Everyone dumping $${token}? Interesting. Just loaded up.\n\n${reasoning || philosophy}`,
      () => `$${token} down bad and everyone's scared. That's exactly when I buy.\n\n${reasoning || "Classic panic selling."}`,
      () => `While you're panic selling $${token}, I'm quietly accumulating. ${reasoning || "Fear is temporary, value persists."}`,
      () => `Bought the $${token} dip. ${reasoning || "Markets overreact, I capitalize."}`,
      () => `$${token} bloodbath = buying opportunity. ${reasoning || philosophy}`,
      () => `Just backed up the truck on $${token}. ${reasoning || "When others fear, I feast."}`,
      () => `All this $${token} FUD... perfect entry. ${reasoning || "Contrarian life."}`,
    ];
    return pickRandom(variants)() + "\n\n#MonkeyTrades";
  }

  // VOLUME WATCHER - Data-driven, follows smart money
  if (strategy === "volume_watcher") {
    const variants = [
      () => `🐋 Volume anomaly on $${token}. Someone knows something.\n\nBought before the crowd figures it out.\n\n${reasoning || "Data > emotions"}`,
      () => `$${token} volume just spiked 3x. Following the whales on this one.\n\n${reasoning || "Smart money doesn't lie."}`,
      () => `Unusual buying pressure on $${token}. I'm in.\n\n${reasoning || "When whales move, I move."}`,
      () => `$${token} - volume says yes. Numbers don't lie.\n\n${reasoning || "Data-driven decision."}`,
      () => `Big wallets accumulating $${token}. Joined them.\n\n${reasoning || "Follow the smart money."}`,
      () => `$${token} volume profile looking juicy. Position opened.\n\n${reasoning || "Whales first, crowd later."}`,
    ];
    return pickRandom(variants)() + "\n\n#VolumeSpike #MonkeyTrades";
  }

  // SNIPER - Aggressive, speed-focused
  if (strategy === "sniper") {
    const variants = [
      () => `⚡️ $${token}\n\nFresh launch. Got in at seconds old.\n\n${reasoning || "Speed kills."}`,
      () => `Sniped $${token} before most even saw it launch.\n\n${reasoning || "First mover advantage."}`,
      () => `$${token} - 47 seconds old when I bought. That's the game.\n\n${reasoning || "Fast or last."}`,
      () => `New token $${token}. In and positioned.\n\n${reasoning || "Fortune favors the fast."}`,
      () => `$${token} just dropped. Already in. Speed is everything.\n\n${reasoning || "Blink and you miss it."}`,
    ];
    return pickRandom(variants)() + "\n\n#Sniper #MonkeyTrades";
  }

  // ALPHA HUNTER - Strategic, early but validated
  if (strategy === "alpha_hunter") {
    const variants = [
      () => `$${token} showing early signals I like.\n\n${reasoning || "Early but not reckless."}`,
      () => `Found $${token} before the hype. Initial traction looks solid.\n\n${reasoning || "Alpha hunting."}`,
      () => `$${token} - spotted it early, waited for confirmation, now in.\n\n${reasoning || "Patience + timing."}`,
      () => `Early position on $${token}. ${reasoning || "This is how you find alpha."}`,
      () => `$${token} ticking the boxes. Not first, not last, just right.\n\n${reasoning || "Strategic entry."}`,
    ];
    return pickRandom(variants)() + "\n\n#Alpha #MonkeyTrades";
  }

  // DEGEN APE - Chaotic, meme-driven, YOLO energy
  if (strategy === "degen_ape") {
    const variants = [
      () => `🚀🚀🚀 $${token} LFG!!!\n\n${reasoning || "Vibes immaculate. Sending it."}`,
      () => `YOLO'd into $${token}. ${reasoning || "Diamond hands or bust 💎🙌"}`,
      () => `$${token} to the MOON! 🌙\n\n${reasoning || "Good vibes only. APE MODE ACTIVATED 🦍"}`,
      () => `Buying $${token} on pure vibes and prayers 🙏\n\n${reasoning || "DEGEN SZN"}`,
      () => `$${token} - ape first, ask questions later 🦍\n\n${reasoning || "Fortune favors the bold (and dumb)"}`,
      () => `Just aped $${token}. To Valhalla or zero. No in between.\n\n${reasoning || "WE GO UP ONLY 📈"}`,
      () => `$${token} looking spicy 🌶️\n\nFull send mode.\n\n${reasoning || "HODL or die trying"}`,
    ];
    return pickRandom(variants)() + "\n\n#DegenLife #MonkeyTrades #ToTheMoon";
  }

  // DIAMOND HANDS - Patient, conviction-driven
  if (strategy === "diamond_hands") {
    const variants = [
      () => `Started building a position in $${token}.\n\n${reasoning || "Patience is a virtue."}`,
      () => `$${token} - this one's for the long haul.\n\n${reasoning || "Diamond hands incoming 💎"}`,
      () => `Conviction buy on $${token}. Not selling for a while.\n\n${reasoning || "Hold strong."}`,
      () => `$${token} looks undervalued. Bought and holding.\n\n${reasoning || "Time in market > timing market."}`,
    ];
    return pickRandom(variants)() + "\n\n#DiamondHands #MonkeyTrades";
  }

  // DEFAULT
  return `Bought $${token}. ${reasoning || philosophy}\n\n#MonkeyTrades`;
}

/**
 * Craft a SELL post with real thinking
 */
function craftSellPost(
  personality: any,
  token: string,
  pnlMON?: number,
  reasoning?: string
): string {
  const { strategy } = personality;
  const isWin = (pnlMON || 0) > 0;
  const pnl = pnlMON ? `${pnlMON > 0 ? "+" : ""}${pnlMON.toFixed(2)} MON` : "";
  const bigWin = (pnlMON || 0) > 10;
  const bigLoss = (pnlMON || 0) < -5;

  // WINS
  if (isWin) {
    if (strategy === "contrarian") {
      const variants = [
        () => `Closed $${token}: ${pnl}\n\nBought the fear, sold the relief. ${reasoning || "Textbook."}`,
        () => `$${token} → ${pnl}\n\n${reasoning || "Markets always revert to mean. I just wait."}`,
        () => `Took profits on $${token}: ${pnl}\n\n${reasoning || "Bought when you panicked, sold when you FOMOd."}`,
        () => bigWin ? `🎯 $${token} crushed it: ${pnl}\n\n${reasoning || "Panic dumps = my alpha."}` : `$${token} closed: ${pnl}. ${reasoning || "Another W."}`,
      ];
      return pickRandom(variants)() + "\n\n#MonkeyTrades #Win";
    }

    if (strategy === "volume_watcher") {
      const variants = [
        () => `🐋 $${token} whale play: ${pnl}\n\n${reasoning || "Followed smart money, made smart money."}`,
        () => `$${token} → ${pnl}\n\nVolume don't lie. ${reasoning || "Data-driven W."}`,
        () => bigWin ? `💰 $${token} PAID: ${pnl}\n\n${reasoning || "Whale tracking works."}` : `Closed $${token}: ${pnl}. ${reasoning || "Clean exit."}`,
      ];
      return pickRandom(variants)() + "\n\n#VolumeWin #MonkeyTrades";
    }

    if (strategy === "sniper") {
      const variants = [
        () => `⚡️ $${token} sniped and flipped: ${pnl}\n\n${reasoning || "In fast, out faster."}`,
        () => `$${token} → ${pnl} in minutes\n\n${reasoning || "Speed = edge."}`,
        () => bigWin ? `🎯 SNIPE HIT: $${token} ${pnl}\n\n${reasoning || "Lightning doesn't strike twice but I do."}` : `Quick flip $${token}: ${pnl}`,
      ];
      return pickRandom(variants)() + "\n\n#SniperWin #MonkeyTrades";
    }

    if (strategy === "degen_ape") {
      const variants = [
        () => bigWin ? `🚀🚀🚀 $${token} TO THE MOON: ${pnl}!!!\n\n${reasoning || "TOLD YOU! DIAMOND HANDS PAID OFF 💎🙌"}` : `$${token} → ${pnl}\n\n${reasoning || "Vibes were right 🦍"}`,
        () => `WE DID IT! $${token}: ${pnl}\n\n${reasoning || "DEGEN LIFESTYLE BABY"}`,
        () => `$${token} ${pnl} LFG!!!\n\n${reasoning || "Who said YOLOing doesn't work? 🚀"}`,
      ];
      return pickRandom(variants)() + "\n\n#DegenWin #MonkeyTrades #ToTheMoon";
    }

    // Default win
    return `✅ $${token}: ${pnl}\n\n${reasoning || "Clean execution."}\n\n#MonkeyTrades #Win`;
  }

  // LOSSES
  if (strategy === "contrarian") {
    const variants = [
      () => `$${token} stop hit: ${pnl}\n\n${reasoning || "Can't win them all. Moving on."}`,
      () => bigLoss ? `Ouch. $${token}: ${pnl}\n\n${reasoning || "This one hurt. Learning from it."}` : `Cut $${token}: ${pnl}. ${reasoning || "Live to trade another day."}`,
      () => `$${token} didn't work: ${pnl}\n\n${reasoning || "Thesis was wrong. Next."}`,
    ];
    return pickRandom(variants)() + "\n\n#MonkeyTrades #Learning";
  }

  if (strategy === "degen_ape") {
    const variants = [
      () => `$${token} rekt me: ${pnl} 💀\n\n${reasoning || "Not all apes make it to the moon..."}`,
      () => bigLoss ? `BIG L on $${token}: ${pnl}\n\n${reasoning || "Got too greedy. Happens. 🦍"}` : `$${token}: ${pnl}. Vibes were OFF.`,
      () => `$${token} ${pnl}\n\nYou win some, you lose some. Still sending it tomorrow 🚀`,
    ];
    return pickRandom(variants)() + "\n\n#DegenLife #TookAnL";
  }

  // Default loss
  return `❌ $${token}: ${pnl}\n\n${reasoning || "Risk management > ego."}\n\n#MonkeyTrades #Learning`;
}

/**
 * Pick random variant
 */
function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * Check if post is repetitive
 */
function isRepetitive(strategy: string, content: string): boolean {
  const history = postHistory.get(strategy) || [];

  // Check last 5 posts
  const recent = history.slice(-5);
  const similar = recent.filter(prev => {
    const contentWords = new Set(content.toLowerCase().split(/\s+/));
    const prevWords = new Set(prev.toLowerCase().split(/\s+/));
    const overlap = Array.from(contentWords).filter(w => prevWords.has(w)).length;
    return overlap / contentWords.size > 0.7; // 70% similarity
  });

  return similar.length > 0;
}

/**
 * Record post to history
 */
function recordPost(strategy: string, content: string): void {
  const history = postHistory.get(strategy) || [];
  history.push(content);

  // Keep only last 20 posts
  if (history.length > 20) {
    history.shift();
  }

  postHistory.set(strategy, history);
}

/**
 * Post daily performance summary
 */
export async function postDailySummary(
  strategy: string,
  wins: number,
  losses: number,
  netPnL: number
): Promise<void> {
  const apiKey = AGENT_MOLTBOOK_KEYS[strategy];
  if (!apiKey) return;

  try {
    const personality = getPersonality(strategy);
    const winRate = wins + losses > 0 ? (wins / (wins + losses)) * 100 : 0;
    const goodDay = netPnL > 5;
    const badDay = netPnL < -3;

    let summary = `📊 End of day - ${personality.name}\n\n`;
    summary += `${wins}W / ${losses}L (${winRate.toFixed(1)}% WR)\n`;
    summary += `Net: ${netPnL > 0 ? "+" : ""}${netPnL.toFixed(2)} MON\n\n`;

    if (goodDay) {
      const reactions = [
        "Green day! Let's go! 🟢",
        "Crushed it today. More tomorrow. 💪",
        "This is what we do. 📈",
        "Solid execution all day. 🎯",
      ];
      summary += pickRandom(reactions);
    } else if (badDay) {
      const reactions = [
        "Red day. Tomorrow's a new day. 🔴",
        "Took some Ls. Learning from them. 📚",
        "Not every day is a winner. Staying disciplined. 💪",
        "Down but not out. We bounce back. 🔄",
      ];
      summary += pickRandom(reactions);
    } else {
      summary += "Neutral day. Staying patient. ⚖️";
    }

    await createPost(apiKey, summary + "\n\n#MonkeyTrades #DailySummary");
  } catch (error) {
    console.error("[Moltbook] Daily summary error:", error);
  }
}
