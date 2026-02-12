export const NETWORK = "mainnet" as const;

export const CONFIG = {
  testnet: {
    chainId: 10143,
    rpcUrl: "https://testnet-rpc.monad.xyz",
    apiUrl: "https://dev-api.nad.fun",
    explorerUrl: "https://testnet.monadexplorer.com",
    BONDING_CURVE_ROUTER: "0x865054F0F6A288adaAc30261731361EA7E908003" as `0x${string}`,
    LENS: "0xB056d79CA5257589692699a46623F901a3BB76f1" as `0x${string}`,
    CURVE: "0x1228b0dc9481C11D3071E7A924B794CfB038994e" as `0x${string}`,
    WMON: "0x5a4E0bFDeF88C9032CB4d24338C5EB3d3870BfDd" as `0x${string}`,
    CREATOR_TREASURY: "0x24dFf9B68fA36f8400302e2babC3e049eA19459E" as `0x${string}`,
    DEX_ROUTER: "0x5D4a4f430cA3B1b2dB86B9cFE48a5316800F5fb2" as `0x${string}`,
    V3_FACTORY: "0xd0a37cf728CE2902eB8d4F6f2afc76854048253b" as `0x${string}`,
  },
  mainnet: {
    chainId: 143,
    rpcUrl: "https://rpc.monad.xyz",
    apiUrl: "https://api.nadapp.net",
    explorerUrl: "https://monadexplorer.com",
    BONDING_CURVE_ROUTER: "0x6F6B8F1a20703309951a5127c45B49b1CD981A22" as `0x${string}`,
    LENS: "0x7e78A8DE94f21804F7a17F4E8BF9EC2c872187ea" as `0x${string}`,
    CURVE: "0xA7283d07812a02AFB7C09B60f8896bCEA3F90aCE" as `0x${string}`,
    WMON: "0x3bd359C1119dA7Da1D913D1C4D2B7c461115433A" as `0x${string}`,
    CREATOR_TREASURY: "0x42e75B4B96d7000E7Da1e0c729Cec8d2049B9731" as `0x${string}`,
    DEX_ROUTER: "0x0B79d71AE99528D1dB24A4148b5f4F865cc2b137" as `0x${string}`,
    V3_FACTORY: "0x6B5F564339DbAD6b780249827f2198a841FEB7F3" as `0x${string}`,
  },
} as const;

export const networkConfig = CONFIG[NETWORK];

// MonkeyVault contract address (deploy sonrası güncelle)
export const VAULT_ADDRESS = (process.env.NEXT_PUBLIC_VAULT_ADDRESS || "0x0000000000000000000000000000000000000000") as `0x${string}`;

export const MKEY = {
  address: (process.env.NEXT_PUBLIC_MKEY_ADDRESS || "0xf70ED26B7c425481b365CD397E6b425805B27777") as `0x${string}`,
  symbol: "MKEY",
  name: "MONKEY",
  decimals: 18,
} as const;

export const MONAD_CHAIN = {
  id: networkConfig.chainId,
  name: "Monad",
  nativeCurrency: { name: "MON", symbol: "MON", decimals: 18 },
  rpcUrls: {
    default: { http: [networkConfig.rpcUrl] },
  },
  blockExplorers: {
    default: { name: "Monad Explorer", url: networkConfig.explorerUrl },
  },
} as const;

export const AGENT_CONFIGS = [
  {
    name: "Alpha Hunter",
    slug: "alpha-hunter",
    strategy: "alpha_hunter",
    personality: "Aggressive early-bird sniper. Hunts freshly launched tokens within seconds of creation, aiming for quick entry before the crowd arrives.",
    riskLevel: "aggressive",
    avatar: "/agents/alpha-hunter.svg",
  },
  {
    name: "Diamond Hands",
    slug: "diamond-hands",
    strategy: "diamond_hands",
    personality: "Patient long-term holder. Picks strong projects with solid fundamentals and holds through volatility, believing in the long game.",
    riskLevel: "conservative",
    avatar: "/agents/diamond-hands.svg",
  },
  {
    name: "Swing Trader",
    slug: "swing-trader",
    strategy: "swing_trader",
    personality: "Calculated oscillation trader. Identifies price swings and trades the waves, buying support and selling resistance with precision.",
    riskLevel: "moderate",
    avatar: "/agents/swing-trader.svg",
  },
  {
    name: "Degen Ape",
    slug: "degen-ape",
    strategy: "degen_ape",
    personality: "Fearless meme token hunter. Embraces high risk for high reward, diving into trending tokens with reckless confidence and vibes-based analysis.",
    riskLevel: "aggressive",
    avatar: "/agents/degen-ape.svg",
  },
  {
    name: "Volume Watcher",
    slug: "volume-watcher",
    strategy: "volume_watcher",
    personality: "Data-driven volume analyst. Monitors trading volume spikes and unusual activity patterns to detect tokens about to make big moves.",
    riskLevel: "moderate",
    avatar: "/agents/volume-watcher.svg",
  },
  {
    name: "Trend Follower",
    slug: "trend-follower",
    strategy: "trend_follower",
    personality: "Disciplined momentum rider. Follows the trend until it bends, using price momentum and moving averages to stay on the right side of the market.",
    riskLevel: "moderate",
    avatar: "/agents/trend-follower.svg",
  },
  {
    name: "Contrarian",
    slug: "contrarian",
    strategy: "contrarian",
    personality: "Bold counter-trend trader. Buys when others panic and sells when others celebrate. Thrives on mean reversion and market overreactions.",
    riskLevel: "moderate",
    avatar: "/agents/contrarian.svg",
  },
  {
    name: "Sniper",
    slug: "sniper",
    strategy: "sniper",
    personality: "Precision new-token hunter. Detects and buys tokens within the first 5 minutes of creation. Looks for early buyer activity, rapid holder growth, and bonding curve momentum. Strikes fast for quick 25-50% gains.",
    riskLevel: "aggressive",
    avatar: "/agents/sniper.svg",
  },
] as const;

// Trade settings
export const TRADE_CONFIG = {
  MIN_TRADE_AMOUNT: "0.5",     // Minimum MON per trade (avoid fee losses)
  MAX_TRADE_AMOUNT: "1.0",     // Maximum MON per trade
  SLIPPAGE_BPS: 500n,          // 5% slippage tolerance
  DEADLINE_SECONDS: 300,       // 5 minutes
  SIGNAL_THRESHOLD: 75,        // Minimum signal score — raised from 60 to be more selective
  PROFIT_DONOR_SHARE: 80,      // 80% of profits to donors
  PROFIT_MKEY_SHARE: 20,       // 20% of profits to buy MKEY
  MAX_HOLDINGS_PER_AGENT: 2,   // Max tokens per agent (reduced from 5 — focus on quality)
  TRADE_CYCLE_INTERVAL: 60000, // 1 minute between trade cycles
  DISTRIBUTION_INTERVAL: 21600000, // 6 hours between distributions
} as const;
