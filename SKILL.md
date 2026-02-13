# 🐵 MonkeyVault - AI-Powered Autonomous Trading Agents

**Hackathon Project: Monad Mainnet**

---

## 🎯 Project Overview

MonkeyVault is an autonomous AI trading platform featuring **8 specialized trading agents** that make intelligent, data-driven decisions using **LLM-powered analysis** on the Monad blockchain. Unlike traditional rule-based bots, our agents think, learn, and adapt their strategies based on real market conditions and historical performance.

### 🏆 Key Innovation

**LLM-First Decision Making**: Instead of rigid if/then rules, each agent uses OpenAI/Groq models to analyze market data, evaluate opportunities, and make contextual trading decisions with confidence scores.

---

## 🤖 The 8 Trading Agents

Each agent has a unique personality and strategy optimized for different market conditions:

| Agent | Strategy | Best Market Condition |
|-------|----------|----------------------|
| **🎯 Contrarian** | Buy panic dumps, sell into FOMO | High volatility |
| **📊 Volume Watcher** | Trade volume spikes and momentum | Trending markets |
| **🎪 Sniper** | Catch early launches near graduation | New token launches |
| **🔍 Alpha Hunter** | Find hidden gems before they pump | Sideways/accumulation |
| **📈 Swing Trader** | Ride medium-term trends (hours-days) | Trending markets |
| **📉 Trend Follower** | Follow strong directional moves | Bull/bear markets |
| **💎 Diamond Hands** | Hold winners, let profits run | Strong uptrends |
| **🦍 Degen Ape** | High-risk, high-reward moonshots | Volatile markets |

---

## 🧠 AI-Powered Features

### 1. LLM Decision Engine
```typescript
// Real LLM analysis for each trade decision
const decision = await analyzeTrade({
  tokenData: { price, volume, holders, momentum },
  marketRegime: "sideways" | "bull" | "bear",
  agentPersonality: "contrarian",
  learningProfile: { winRate: 65%, avgReturn: 12% }
});

// LLM responds with:
{
  action: "BUY",
  confidence: 75%,
  reasoning: "I see genuine panic selling here with high volume..."
}
```

### 2. Adaptive Learning System
- Tracks win rate and performance per agent
- Dynamically adjusts confidence thresholds (60-85%)
- Agents become more selective after losses
- Self-improving decision quality

### 3. Quality Filtering
**LOW VOLUME MARKET STRATEGY** - Optimized for Monad's market conditions:
- Minimum liquidity: 3 MON reserve
- Minimum holders: 30+
- Token age: 2+ hours
- Price stability checks
- Volume/liquidity ratio analysis
- Quality score: 0-100 (minimum 60 to trade)

### 4. Post-Buy Momentum Monitoring
Real-time tracking after each purchase:
- 15-minute early check (strong demand signals)
- 30-minute mid check (momentum validation)
- Target: 15-25%+ gains
- Stop loss: -5% after 30min
- Patient holding strategy (no 1-2 min flips)

---

## 🏗️ Technical Architecture

### Tech Stack
- **Frontend**: Next.js 14, TypeScript, TailwindCSS, Framer Motion
- **Backend**: Next.js API Routes, Server-Sent Events (SSE)
- **Database**: PostgreSQL + Prisma ORM
- **Blockchain**: Monad (viem, wagmi, RainbowKit)
- **AI/LLM**: OpenAI GPT-4, Groq Llama 3.3
- **Deployment**: PM2, VPS

### Smart Architecture Decisions

**1. Donor-Based Model**
```
Users donate MON → Agent trades → 80% profit to donors, 20% buys MKEY
```
No personal funds at risk, transparent profit sharing.

**2. Real-Time Updates**
Server-Sent Events (SSE) for live trade feed - no polling, instant updates.

**3. Multi-Strategy Scoring**
Each token gets scored by all 8 agents simultaneously:
- Contrarian score (panic dump potential)
- Volume score (momentum strength)
- Sniper score (graduation timing)
- etc.

Top scoring agent gets to make LLM decision.

**4. Dead Token Blacklist**
Agents share knowledge - if one discovers a dead token (no buyers), all agents avoid it for 1 hour.

---

## 📊 Performance Optimizations

### For Low-Volume Markets (Monad)
- Relaxed quality filters (3 MON vs 10 MON liquidity)
- Lower volume thresholds (1K vs 5K MON)
- Longer holding periods (15-30min vs 1-2min)
- Higher profit targets (15-25% vs 5%)
- Proper stop losses (-5%)

### Intelligent Trade Sizing
```typescript
// Adaptive position sizing based on confidence
const size = baseSize * (confidence / 100) * marketRegimeMultiplier;

// Contrarian with 80% confidence in sideways market:
// 2 MON * 0.8 * 1.05 = 1.68 MON position
```

---

## 🎨 Frontend Features

### Live Dashboard
- Real-time trade feed with SSE
- Agent performance metrics
- PnL charts and analytics
- Donor leaderboard
- Individual agent pages

### Wallet Integration
- RainbowKit for smooth UX
- Multi-wallet support
- Direct donation flow
- Earnings claim interface

### Agent Personalities
Each agent has:
- Custom avatar and colors
- Personality description
- Strategy explanation
- Live performance stats
- Trade history

---

## 🔐 Security & Transparency

### On-Chain Verification
- All trades recorded on Monad
- Transaction hashes publicly visible
- Agent balances verifiable
- Donor tracking on-chain (future: MonkeyVault.sol)

### Risk Management
- Maximum 1 position per agent (focus)
- Trade size limits (0.5-1 MON)
- 30-second trade cycles (avoid spam)
- Dead token blacklisting
- Learning-based confidence adjustment

---

## 📈 Future Roadmap

### Phase 1: MonkeyVault Smart Contract ✅ (Planned)
Move all logic on-chain:
- Trustless profit distribution
- On-chain trade execution
- MKEY buyback mechanism
- Donor claim system

### Phase 2: Advanced AI
- Multi-agent collaboration
- Sentiment analysis from social data
- Cross-chain opportunities
- Predictive modeling

### Phase 3: Community Features
- Agent customization
- Strategy voting
- Donor rewards program
- MKEY staking utilities

---

## 🚀 Getting Started

### For Donors
1. Connect wallet (RainbowKit)
2. Choose an agent strategy
3. Donate MON (min 1 MON)
4. Watch agent trade live
5. Claim 80% of profits

### For Developers
```bash
# Install dependencies
npm install

# Setup database
npx prisma generate
npx prisma db push
npx prisma db seed

# Run development server
npm run dev

# Build for production
npm run build

# Start trading agents
npm run start:trading
```

---

## 🎥 Demo & Links

- **Live Platform**: [Coming Soon]
- **GitHub**: [Repository]
- **Demo Video**: [YouTube]
- **Pitch Deck**: [Slides]

---

## 👥 Team

Built with ❤️ for Monad Hackathon

**Core Innovation**: First truly autonomous AI trading agents on Monad using LLM decision-making instead of rigid rules.

---

## 📜 License

MIT License - Built for Monad Hackathon 2026

---

## 🔥 Why MonkeyVault Stands Out

1. **AI-First**: Not just automation, actual intelligence
2. **Adaptive Learning**: Agents improve over time
3. **Low-Volume Optimized**: Built specifically for Monad's market
4. **Transparent**: Real-time feed, on-chain verification
5. **Community-Driven**: Donor-based model, profit sharing
6. **Multi-Strategy**: 8 agents cover all market conditions
7. **Production-Ready**: Live trading on Monad mainnet

**MonkeyVault: Where AI meets DeFi on Monad** 🐵🚀
