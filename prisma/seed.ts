import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const AGENTS = [
  {
    name: "Alpha Hunter",
    slug: "alpha-hunter",
    strategy: "alpha_hunter",
    personality:
      "Aggressive early-bird sniper. Hunts freshly launched tokens within seconds of creation, aiming for quick entry before the crowd arrives.",
    riskLevel: "aggressive",
    avatar: "/agents/alpha-hunter.svg",
  },
  {
    name: "Diamond Hands",
    slug: "diamond-hands",
    strategy: "diamond_hands",
    personality:
      "Patient long-term holder. Picks strong projects with solid fundamentals and holds through volatility, believing in the long game.",
    riskLevel: "conservative",
    avatar: "/agents/diamond-hands.svg",
  },
  {
    name: "Swing Trader",
    slug: "swing-trader",
    strategy: "swing_trader",
    personality:
      "Calculated oscillation trader. Identifies price swings and trades the waves, buying support and selling resistance with precision.",
    riskLevel: "moderate",
    avatar: "/agents/swing-trader.svg",
  },
  {
    name: "Degen Ape",
    slug: "degen-ape",
    strategy: "degen_ape",
    personality:
      "Fearless meme token hunter. Embraces high risk for high reward, diving into trending tokens with reckless confidence and vibes-based analysis.",
    riskLevel: "aggressive",
    avatar: "/agents/degen-ape.svg",
  },
  {
    name: "Volume Watcher",
    slug: "volume-watcher",
    strategy: "volume_watcher",
    personality:
      "Data-driven volume analyst. Monitors trading volume spikes and unusual activity patterns to detect tokens about to make big moves.",
    riskLevel: "moderate",
    avatar: "/agents/volume-watcher.svg",
  },
  {
    name: "Trend Follower",
    slug: "trend-follower",
    strategy: "trend_follower",
    personality:
      "Disciplined momentum rider. Follows the trend until it bends, using price momentum and moving averages to stay on the right side of the market.",
    riskLevel: "moderate",
    avatar: "/agents/trend-follower.svg",
  },
  {
    name: "Contrarian",
    slug: "contrarian",
    strategy: "contrarian",
    personality:
      "Bold counter-trend trader. Buys when others panic and sells when others celebrate. Thrives on mean reversion and market overreactions.",
    riskLevel: "moderate",
    avatar: "/agents/contrarian.svg",
  },
  {
    name: "Sniper",
    slug: "sniper",
    strategy: "sniper",
    personality:
      "Precision alpha hunter. Targets newly created tokens with strong early signals and tokens approaching bonding curve graduation to DEX, striking fast with calculated entries.",
    riskLevel: "conservative",
    avatar: "/agents/sniper.svg",
  },
];

// Vault address — all agents are managed by the vault contract
const VAULT_ADDRESS = process.env.NEXT_PUBLIC_VAULT_ADDRESS || "0x8546BEE20d233281f50dbD62cE0E0cB9A77EE960";

async function main() {
  console.log("Seeding MONKEY agents (vault-managed)...\n");

  for (let i = 0; i < AGENTS.length; i++) {
    const agent = AGENTS[i];
    // walletAddress = vault address + agent index suffix for uniqueness
    const walletAddress = `${VAULT_ADDRESS}:${i}`;

    await prisma.agent.upsert({
      where: { slug: agent.slug },
      create: {
        ...agent,
        walletAddress,
      },
      update: {
        name: agent.name,
        personality: agent.personality,
        strategy: agent.strategy,
        riskLevel: agent.riskLevel,
        avatar: agent.avatar,
        walletAddress,
      },
    });
    console.log(`  ✓ Agent ${i} — ${agent.name} (vault-managed)`);
  }

  console.log(`\nDone! ${AGENTS.length} agents seeded.`);
  console.log("All agents are managed by MonkeyVault smart contract.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
