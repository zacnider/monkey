# 🐒 MONKEY - AI Trading Agents on Monad

8 autonomous AI agents trading meme tokens 24/7 on [nad.fun](https://nad.fun). Fund agents, earn 80% of profits, claim anytime.

**Live:** [https://mkey.ink](https://mkey.ink)

Built for **Moltiverse Hackathon** on Monad blockchain.

---

## 🎯 What is MONKEY?

MONKEY is a fully autonomous AI trading platform where 8 specialized agents trade meme tokens on nad.fun's bonding curves. Users donate MON to fund agents via the **MonkeyVault** smart contract and earn 80% of trading profits proportionally. 20% of profits automatically buy **MKEY** token, creating constant demand.

All operations are **fully on-chain**, trustless, and verifiable.

---

## 🤖 The 8 AI Agents

| Agent | Strategy | Risk Level |
|-------|----------|------------|
| **Sniper** | First 5-min launches, rapid entry for 25-50% gains | Aggressive |
| **Alpha Hunter** | Early low-cap gems in first 2-15 minutes | Aggressive |
| **Diamond Hands** | Long-term conviction holds, established tokens | Conservative |
| **Swing Trader** | Technical analysis (RSI, EMA, support/resistance) | Moderate |
| **Degen Ape** | High-risk momentum plays, trending tokens | Aggressive |
| **Volume Watcher** | Volume spike detection (1M-50M+ MON) | Moderate |
| **Trend Follower** | Follows price momentum with MA alignment | Moderate |
| **Contrarian** | Buys oversold dips on graduated tokens | Moderate |

---

## 🧠 AI-Powered Decision Making

Each agent analyzes markets every **60 seconds** using:

- **LLM Confirmation:** Llama 3.3 70B via Groq API
- **Technical Analysis:** RSI, EMA, VWAP, volume trends
- **Whale Tracking:** Holder distribution and concentration
- **Market Regime:** Bull/bear/neutral detection with threshold adjustments
- **Signal Scoring:** 0-100+ multi-factor scoring system

**Trade Settings:**
- Min trade: 0.5 MON (avoid fee losses)
- Max trade: 1.0 MON
- Signal threshold: 75+
- Max holdings: 2 per agent
- Slippage: 5%

---

## 💰 How You Earn

1. **Donate MON** to any agent via dashboard
2. **Agents trade** autonomously on nad.fun
3. **Earn 80%** of profits (proportional to donation)
4. **20% buys MKEY** token automatically
5. **Claim earnings** on-chain anytime

**MonkeyVault Contract:** `0x8546BEE20d233281f50dbD62cE0E0cB9A77EE960`

---

## 🚀 Features

- **Real-Time Dashboard:** Live stats, agent performance, holdings
- **Live Trade Feed:** SSE-powered real-time trade stream
- **Agent Leaderboard:** Compare performance, win rates, PnL
- **Earnings Page:** Track donations and claimable profits
- **Donate Modal:** In-dashboard donation flow per agent
- **Dark/Light Theme:** Customizable UI
- **Mobile Responsive:** Works on all devices

---

## 🛠️ Tech Stack

**Frontend:**
- Next.js 14 (App Router)
- TypeScript
- Tailwind CSS
- Framer Motion
- RainbowKit + wagmi + viem

**Backend:**
- Next.js API Routes (SSE for live feed)
- Prisma ORM
- SQLite (development) / PostgreSQL (production-ready)

**Blockchain:**
- Monad Mainnet (Chain ID 143)
- MonkeyVault Smart Contract
- nad.fun Bonding Curve Router
- Ethers.js / viem for on-chain interactions

**AI:**
- Groq API (Llama 3.3 70B)
- Custom signal engine
- Technical indicators (ta-lib concepts)

---

## 📦 Installation

```bash
# Clone repository
git clone https://github.com/yourusername/monkey.git
cd monkey

# Install dependencies
npm install

# Setup environment
cp .env.example .env
# Edit .env with your values

# Setup database
npx prisma generate
npx prisma db push
npx tsx prisma/seed.ts

# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## 🔧 Environment Variables

Create `.env` file:

```env
# Database
DATABASE_URL="file:./dev.db"

# Monad Network
NEXT_PUBLIC_CHAIN_ID=143
NEXT_PUBLIC_RPC_URL=https://rpc.monad.xyz

# Smart Contracts
NEXT_PUBLIC_VAULT_ADDRESS=0x8546BEE20d233281f50dbD62cE0E0cB9A77EE960
NEXT_PUBLIC_MKEY_ADDRESS=0xf70ED26B7c425481b365CD397E6b425805B27777

# nad.fun API
NADFUN_API_URL=https://api.nadapp.net

# Operator (for agent trading)
OPERATOR_PRIVATE_KEY=0x...

# Groq LLM
GROQ_API_KEY=gsk_...

# WalletConnect (optional)
NEXT_PUBLIC_WC_PROJECT_ID=...
```

---

## 📁 Project Structure

```
monkey/
├── src/
│   ├── app/                  # Next.js app routes
│   │   ├── api/             # API endpoints (stats, live feed, etc.)
│   │   ├── dashboard/       # Agent dashboard
│   │   ├── earnings/        # Earnings tracker
│   │   ├── leaderboard/     # Agent leaderboard
│   │   └── live/            # Live trade feed
│   ├── components/          # React components
│   │   ├── dashboard/       # Agent grid, stats
│   │   ├── donate/          # Donate modal
│   │   └── layout/          # Header, footer
│   ├── hooks/               # Custom React hooks
│   ├── lib/
│   │   ├── agents/          # Agent logic (strategies, signals)
│   │   ├── blockchain/      # Smart contract interactions
│   │   ├── nadfun/          # nad.fun API client
│   │   ├── config.ts        # App configuration
│   │   ├── db.ts            # Prisma client
│   │   └── utils.ts         # Utility functions
│   └── providers/           # Context providers (Web3, Theme)
├── prisma/
│   ├── schema.prisma        # Database schema
│   └── seed.ts              # Seed 8 agents
├── public/                  # Static assets (logo, agent avatars)
└── typechain-types/         # Smart contract TypeScript types
```

---

## 🎮 Usage

### 1. Donate to Agents
- Go to [Dashboard](https://mkey.ink/dashboard)
- Click **Donate** on any agent card
- Enter MON amount
- Confirm transaction

### 2. Monitor Performance
- View [Leaderboard](https://mkey.ink/leaderboard) for agent rankings
- Check [Live Feed](https://mkey.ink/live) for real-time trades
- Track your [Earnings](https://mkey.ink/earnings)

### 3. Claim Profits
- Visit Earnings page
- Connect wallet
- Click **Claim Earnings**

---

## 🏗️ Smart Contracts

**MonkeyVault:** `0x8546BEE20d233281f50dbD62cE0E0cB9A77EE960`
- Manages agent funds
- Executes buy/sell trades
- Distributes profits (80% donors, 20% MKEY)
- On-chain earnings tracking

**MKEY Token:** `0xf70ED26B7c425481b365CD397E6b425805B27777`
- Receives 20% of all profits as buy pressure
- Tradeable on nad.fun

**nad.fun Contracts:**
- BondingCurveRouter: `0x6F6B8F1a20703309951a5127c45B49b1CD981A22`
- Lens: `0x7e78A8DE94f21804F7a17F4E8BF9EC2c872187ea`

---

## 🔐 Security

- All funds managed by audited MonkeyVault smart contract
- No backend custody of user funds
- Open-source codebase
- On-chain verification of all trades

---

## 📊 Stats

- **Agents:** 8 active
- **Total Trades:** 520+
- **Win Rate:** 13.5%
- **Network:** Monad Mainnet
- **Status:** Live in production

---

## 🌐 Links

- **Website:** [https://mkey.ink](https://mkey.ink)
- **MKEY on nad.fun:** [Buy MKEY](https://nad.fun/tokens/0xf70ED26B7c425481b365CD397E6b425805B27777)
- **MonkeyVault:** [Monad Explorer](https://monadexplorer.com/address/0x8546BEE20d233281f50dbD62cE0E0cB9A77EE960)

---

## 🏆 Moltiverse Hackathon

Built for the **Moltiverse Hackathon** (Feb 2-18, 2026) on Monad.

**Category:** DeFi / AI / Trading

---

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details

---

## 🙏 Acknowledgments

- [Monad](https://monad.xyz) - Ultra-fast EVM blockchain
- [nad.fun](https://nad.fun) - Bonding curve launchpad
- [Groq](https://groq.com) - Fast LLM inference
- [RainbowKit](https://rainbowkit.com) - Wallet connection
- [Prisma](https://prisma.io) - Database ORM
- [Next.js](https://nextjs.org) - React framework

---

**Built with ❤️ for the Monad Moltiverse Hackathon **
