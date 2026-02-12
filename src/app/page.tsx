"use client";

import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { useStats } from "@/hooks/use-agents";
import { formatMON } from "@/lib/utils";

const AGENTS = [
  { name: "Alpha Hunter", strategy: "Early low-cap gems", icon: "/agents/alpha-hunter.svg" },
  { name: "Diamond Hands", strategy: "Long-term conviction holds", icon: "/agents/diamond-hands.svg" },
  { name: "Swing Trader", strategy: "Technical swing entries", icon: "/agents/swing-trader.svg" },
  { name: "Degen Ape", strategy: "High-risk momentum plays", icon: "/agents/degen-ape.svg" },
  { name: "Volume Watcher", strategy: "Volume spike detection", icon: "/agents/volume-watcher.svg" },
  { name: "Trend Follower", strategy: "Trend-following breakouts", icon: "/agents/trend-follower.svg" },
  { name: "Contrarian", strategy: "Oversold reversal bets", icon: "/agents/contrarian.svg" },
  { name: "Sniper", strategy: "New token launch snipes", icon: "/agents/sniper.svg" },
];

const STEPS = [
  {
    step: "01",
    title: "Connect Wallet",
    description: "Connect your wallet to the Monad network. We support MetaMask, WalletConnect, and more.",
  },
  {
    step: "02",
    title: "Donate MON to Agents",
    description: "Choose one or more of our 8 AI agents and fund them with MON via the on-chain MonkeyVault contract.",
  },
  {
    step: "03",
    title: "Agents Trade Autonomously",
    description: "Each agent uses its own strategy — technical analysis, whale tracking, market regime detection — to trade tokens on nad.fun every 60 seconds.",
  },
  {
    step: "04",
    title: "Earn 80% of Profits",
    description: "When agents profit, 80% goes to donors proportionally, 20% buys MKEY token. Claim your earnings on-chain anytime.",
  },
];

const FEATURES = [
  {
    title: "On-Chain & Trustless",
    description: "All funds managed by MonkeyVault smart contract. No backend has custody of your MON.",
  },
  {
    title: "8 Unique Strategies",
    description: "From conservative Diamond Hands to aggressive Degen Ape — diversified AI trading approaches.",
  },
  {
    title: "AI-Powered Decisions",
    description: "LLM confirmation (Llama 3.3 70B), technical analysis (RSI, EMA, VWAP), whale tracking, and market regime detection.",
  },
  {
    title: "Real-Time Trading",
    description: "Agents run continuously, scanning nad.fun for opportunities every 60 seconds with live dashboard updates.",
  },
  {
    title: "MKEY Token",
    description: "20% of all profits buy MKEY token, creating constant buy pressure. The vault HODLs MKEY forever.",
  },
  {
    title: "Transparent & Verifiable",
    description: "Every trade, every decision, every profit distribution is logged on the dashboard and verifiable on-chain.",
  },
];

function fadeUp(delay: number = 0) {
  return {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.5, delay },
  };
}

export default function HomePage() {
  const { stats } = useStats();

  return (
    <div className="space-y-20 pb-12">
      {/* ══════════ HERO ══════════ */}
      <section className="relative pt-8 text-center sm:pt-16">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute left-1/2 top-0 -translate-x-1/2 h-[500px] w-[800px] rounded-full bg-primary/8 blur-[120px]" />
        </div>

        <motion.div {...fadeUp(0)} className="relative">
          <Image
            src="/logo.png"
            alt="MONKEY"
            width={400}
            height={400}
            className="mx-auto h-48 w-auto sm:h-64"
            priority
          />
        </motion.div>

        <motion.h1
          {...fadeUp(0.1)}
          className="mt-4 text-4xl font-extrabold tracking-tight sm:text-5xl md:text-6xl"
        >
          <span className="gradient-text">8 AI Agents.</span>
          <br />
          <span className="text-text-primary">One Vault. Your Profits.</span>
        </motion.h1>

        <motion.p
          {...fadeUp(0.2)}
          className="mx-auto mt-4 max-w-2xl text-lg text-text-secondary sm:text-xl"
        >
          Autonomous AI trading agents on{" "}
          <span className="font-semibold text-text-primary">nad.fun</span>, built on{" "}
          <span className="font-semibold text-text-primary">Monad</span>.
          Donate MON, earn 80% of trading profits. Fully on-chain, fully trustless.
        </motion.p>

        {/* Live stats bar */}
        {stats && (
          <motion.div
            {...fadeUp(0.3)}
            className="mx-auto mt-8 flex max-w-2xl flex-wrap items-center justify-center gap-5 rounded-xl border border-border bg-surface/50 px-6 py-3 backdrop-blur-sm"
          >
            <div className="text-center">
              <p className="text-xs text-text-muted">Vault Balance</p>
              <p className="font-mono text-sm font-bold">{stats.totalBalance ? formatMON(stats.totalBalance) : "0"} MON</p>
            </div>
            <div className="h-6 w-px bg-border" />
            <div className="text-center">
              <p className="text-xs text-text-muted">Total Trades</p>
              <p className="font-mono text-sm font-bold">{stats.totalTrades ?? 0}</p>
            </div>
            <div className="h-6 w-px bg-border" />
            <div className="text-center">
              <p className="text-xs text-text-muted">Active Agents</p>
              <p className="font-mono text-sm font-bold">{stats.activeAgents ?? 8}</p>
            </div>
            <div className="h-6 w-px bg-border" />
            <div className="text-center">
              <p className="text-xs text-text-muted">Platform PnL</p>
              <p className={`font-mono text-sm font-bold ${stats.totalPnl && BigInt(stats.totalPnl) >= 0n ? "text-profit" : "text-loss"}`}>
                {stats.totalPnl ? formatMON(stats.totalPnl) : "0"} MON
              </p>
            </div>
            <div className="h-6 w-px bg-border" />
            <div className="text-center">
              <p className="text-xs text-text-muted">MKEY Held</p>
              <p className="font-mono text-sm font-bold text-mkey">
                {stats.totalMkeyHeld ? formatMON(stats.totalMkeyHeld) : "0"}
              </p>
            </div>
          </motion.div>
        )}

        {/* CTA Buttons */}
        <motion.div
          {...fadeUp(0.4)}
          className="mt-8 flex flex-wrap items-center justify-center gap-4"
        >
          <Link
            href="/dashboard"
            className="rounded-xl bg-primary px-8 py-3 font-semibold text-white transition-all hover:bg-primary-hover hover:shadow-lg hover:shadow-primary/20"
          >
            View Dashboard
          </Link>
          <a
            href="https://nad.fun/tokens/0xf70ED26B7c425481b365CD397E6b425805B27777"
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-xl border border-border bg-surface px-8 py-3 font-semibold text-text-primary transition-all hover:border-mkey/50 hover:text-mkey"
          >
            Buy MKEY on nad.fun
          </a>
        </motion.div>
      </section>

      {/* ══════════ HOW IT WORKS ══════════ */}
      <section>
        <motion.div {...fadeUp()} className="text-center">
          <h2 className="text-3xl font-bold">How It Works</h2>
          <p className="mt-2 text-text-secondary">Four simple steps to start earning from AI trading</p>
        </motion.div>

        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((step, i) => (
            <motion.div
              key={step.step}
              {...fadeUp(i * 0.1)}
              className="rounded-xl border border-border bg-surface p-6 transition-colors hover:border-primary/30"
            >
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 font-mono text-sm font-bold text-primary">
                {step.step}
              </div>
              <h3 className="text-lg font-semibold">{step.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-text-secondary">
                {step.description}
              </p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ══════════ MEET THE AGENTS ══════════ */}
      <section>
        <motion.div {...fadeUp()} className="text-center">
          <h2 className="text-3xl font-bold">Meet the Agents</h2>
          <p className="mt-2 text-text-secondary">
            8 unique AI personalities, each with a different trading strategy
          </p>
        </motion.div>

        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {AGENTS.map((agent, i) => (
            <motion.div
              key={agent.name}
              {...fadeUp(i * 0.05)}
              className="group flex items-center gap-4 rounded-xl border border-border bg-surface p-4 transition-all hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5"
            >
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 overflow-hidden">
                <Image
                  src={agent.icon}
                  alt={agent.name}
                  width={48}
                  height={48}
                  className="h-full w-full object-cover"
                />
              </div>
              <div className="min-w-0">
                <h3 className="font-semibold text-sm group-hover:text-primary transition-colors">
                  {agent.name}
                </h3>
                <p className="text-xs text-text-secondary truncate">
                  {agent.strategy}
                </p>
              </div>
            </motion.div>
          ))}
        </div>

        <div className="mt-6 text-center">
          <Link
            href="/dashboard"
            className="text-sm font-medium text-primary hover:text-primary-hover transition-colors"
          >
            View all agents on the dashboard &rarr;
          </Link>
        </div>
      </section>

      {/* ══════════ FEATURES ══════════ */}
      <section>
        <motion.div {...fadeUp()} className="text-center">
          <h2 className="text-3xl font-bold">Why MONKEY?</h2>
          <p className="mt-2 text-text-secondary">
            Built for the Moltiverse Hackathon on Monad
          </p>
        </motion.div>

        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((feature, i) => (
            <motion.div
              key={feature.title}
              {...fadeUp(i * 0.05)}
              className="rounded-xl border border-border bg-surface p-6 transition-colors hover:border-primary/30"
            >
              <h3 className="font-semibold">{feature.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-text-secondary">
                {feature.description}
              </p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ══════════ ARCHITECTURE ══════════ */}
      <section>
        <motion.div {...fadeUp()} className="text-center">
          <h2 className="text-3xl font-bold">Architecture</h2>
          <p className="mt-2 text-text-secondary">
            How the system works under the hood
          </p>
        </motion.div>

        <motion.div
          {...fadeUp(0.1)}
          className="mx-auto mt-10 max-w-3xl overflow-x-auto rounded-xl border border-border bg-surface p-6 font-mono text-xs leading-relaxed text-text-secondary sm:text-sm sm:leading-loose"
        >
          <pre className="whitespace-pre">
{`User Wallet
    |
    | donate(agentId) + MON
    v
+-------------------------------+
|       MonkeyVault.sol         |  Monad Mainnet
|   (Verified Smart Contract)   |
+-------------------------------+
    |               |
    | executeBuy    | executeSell
    v               v
+-------------------------------+
|     nad.fun BondingCurve      |
|     Router + Tokens           |
+-------------------------------+
    ^
    | analyze + decide
    |
+-------------------------------+
|     8 AI Trading Agents       |
|  RSI, EMA, VWAP, LLM,        |
|  Whale Analysis, Regime       |
+-------------------------------+
    |
    | 80% profits -> claimable
    | 20% profits -> buy MKEY
    v
User calls claimEarnings() -> MON`}
          </pre>
        </motion.div>
      </section>

      {/* ══════════ FINAL CTA ══════════ */}
      <section className="text-center">
        <motion.div
          {...fadeUp()}
          className="mx-auto max-w-xl rounded-2xl border border-primary/20 bg-primary/5 p-8"
        >
          <h2 className="text-2xl font-bold">Ready to Start Earning?</h2>
          <p className="mt-2 text-text-secondary">
            Fund AI agents and let them trade for you. Donate via agent cards on the dashboard.
            Claim your profits on-chain, anytime.
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/dashboard"
              className="rounded-xl bg-primary px-8 py-3 font-semibold text-white transition-all hover:bg-primary-hover hover:shadow-lg hover:shadow-primary/20"
            >
              View Agents
            </Link>
            <Link
              href="/earnings"
              className="rounded-xl border border-border bg-surface px-8 py-3 font-semibold text-text-primary transition-all hover:border-primary/30"
            >
              Check Earnings
            </Link>
          </div>
        </motion.div>
      </section>
    </div>
  );
}
