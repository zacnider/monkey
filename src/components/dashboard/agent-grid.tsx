"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Trophy, TrendingUp, Coins, Heart } from "lucide-react";
import { useAgents } from "@/hooks/use-agents";
import { cn, formatMON, formatPnl, pnlColor, winRate } from "@/lib/utils";
import { DonateModal } from "@/components/donate/donate-modal";

/* ------------------------------------------------------------------ */
/*  Strategy badge colors                                              */
/* ------------------------------------------------------------------ */
const STRATEGY_STYLES: Record<string, string> = {
  momentum: "bg-primary/15 text-primary border-primary/30",
  scalper: "bg-profit/15 text-profit border-profit/30",
  contrarian: "bg-loss/15 text-loss border-loss/30",
  sniper: "bg-mkey/15 text-mkey border-mkey/30",
  whale: "bg-info/15 text-info border-info/30",
  degen: "bg-warning/15 text-warning border-warning/30",
};

function strategyStyle(strategy: string): string {
  const key = strategy.toLowerCase();
  return STRATEGY_STYLES[key] ?? "bg-surface-hover text-text-secondary border-border";
}

/* ------------------------------------------------------------------ */
/*  Avatar: coloured circle with initials                              */
/* ------------------------------------------------------------------ */
const AVATAR_COLORS = [
  "from-purple-500 to-indigo-600",
  "from-emerald-500 to-teal-600",
  "from-amber-500 to-orange-600",
  "from-rose-500 to-pink-600",
  "from-cyan-500 to-blue-600",
  "from-violet-500 to-fuchsia-600",
  "from-lime-500 to-green-600",
  "from-red-500 to-rose-600",
];

function AgentAvatar({
  name,
  avatar,
  index,
}: {
  name: string;
  avatar: string;
  index: number;
}) {
  const initials = name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const gradient = AVATAR_COLORS[index % AVATAR_COLORS.length];
  const isSvgOrImg = avatar && (avatar.endsWith(".svg") || avatar.endsWith(".png") || avatar.endsWith(".jpg"));

  return (
    <div
      className={cn(
        "flex h-10 w-10 shrink-0 items-center justify-center rounded-full overflow-hidden",
        "bg-gradient-to-br font-bold text-sm text-white shadow-lg",
        gradient
      )}
      title={name}
    >
      {isSvgOrImg ? (
        <img src={avatar} alt={name} className="h-full w-full object-cover" />
      ) : avatar ? (
        <span className="text-lg leading-none">{avatar}</span>
      ) : (
        initials
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Single agent card                                                  */
/* ------------------------------------------------------------------ */
interface Agent {
  id: string;
  name: string;
  slug: string;
  avatar: string;
  strategy: string;
  riskLevel: string;
  isActive: boolean;
  totalPnl: string;
  monBalance: string;
  mkeyBalance: string;
  winCount: number;
  lossCount: number;
  tradeCount: number;
}

function AgentCard({ agent, index, onDonate }: { agent: Agent; index: number; onDonate: () => void }) {
  const pnlBigint = BigInt(agent.totalPnl);
  const isPositive = pnlBigint >= 0n;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.05 }}
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
      className={cn(
        "group relative flex flex-col rounded-xl border border-border bg-surface",
        "transition-colors duration-300 hover:border-border-bright",
        isPositive ? "hover:shadow-[0_0_30px_rgba(34,197,94,0.08)]" : "hover:shadow-[0_0_30px_rgba(239,68,68,0.08)]"
      )}
    >
      {/* Active indicator dot */}
      {agent.isActive && (
        <span className="absolute right-3 top-3 h-2 w-2 rounded-full bg-profit animate-pulse-live" />
      )}

      {/* Card body */}
      <div className="flex flex-col gap-4 p-5">
        {/* Header: avatar + name + strategy */}
        <div className="flex items-center gap-3">
          <AgentAvatar
            name={agent.name}
            avatar={agent.avatar}
            index={index}
          />
          <div className="min-w-0 flex-1">
            <h3 className="truncate text-sm font-semibold text-text-primary">
              {agent.name}
            </h3>
            <span
              className={cn(
                "mt-0.5 inline-block rounded-md border px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide",
                strategyStyle(agent.strategy)
              )}
            >
              {agent.strategy}
            </span>
          </div>
        </div>

        {/* PnL */}
        <div className="space-y-1">
          <p className="text-[10px] uppercase tracking-wider text-text-muted">
            Total PnL
          </p>
          <p
            className={cn(
              "font-mono text-lg font-bold tabular-nums",
              pnlColor(agent.totalPnl)
            )}
          >
            {formatPnl(agent.totalPnl)}
          </p>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-2">
          {/* Win rate */}
          <div className="space-y-0.5">
            <p className="flex items-center gap-1 text-[10px] text-text-muted">
              <Trophy className="h-3 w-3" /> Win Rate
            </p>
            <p className="font-mono text-xs font-medium text-text-primary">
              {winRate(agent.winCount, agent.lossCount)}
            </p>
          </div>

          {/* MON balance */}
          <div className="space-y-0.5">
            <p className="flex items-center gap-1 text-[10px] text-text-muted">
              <Coins className="h-3 w-3" /> MON
            </p>
            <p className="font-mono text-xs font-medium text-text-primary">
              {formatMON(agent.monBalance, 2)}
            </p>
          </div>

          {/* MKEY balance */}
          <div className="space-y-0.5">
            <p className="flex items-center gap-1 text-[10px] text-text-muted">
              <TrendingUp className="h-3 w-3 text-mkey" /> MKEY
            </p>
            <p className="font-mono text-xs font-medium text-mkey">
              {formatMON(agent.mkeyBalance, 2)}
            </p>
          </div>
        </div>
      </div>

      {/* Footer: Donate + View buttons */}
      <div className="mt-auto grid grid-cols-2 border-t border-border">
        <button
          onClick={onDonate}
          className={cn(
            "flex items-center justify-center gap-1.5 border-r border-border px-4 py-2.5",
            "text-xs font-medium text-text-secondary transition-colors",
            "hover:bg-surface-hover hover:text-primary"
          )}
        >
          <Heart className="h-3.5 w-3.5" />
          Donate
        </button>
        <Link
          href={`/agents/${agent.slug}`}
          className={cn(
            "flex items-center justify-center px-4 py-2.5",
            "text-xs font-medium text-text-secondary transition-colors",
            "hover:bg-surface-hover hover:text-primary"
          )}
        >
          View Agent &rarr;
        </Link>
      </div>
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/*  Skeleton loader                                                    */
/* ------------------------------------------------------------------ */
function AgentCardSkeleton() {
  return (
    <div className="flex flex-col rounded-xl border border-border bg-surface">
      <div className="space-y-4 p-5">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 animate-pulse rounded-full bg-surface-hover" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-24 animate-pulse rounded bg-surface-hover" />
            <div className="h-3 w-16 animate-pulse rounded bg-surface-hover" />
          </div>
        </div>
        <div className="space-y-2">
          <div className="h-3 w-12 animate-pulse rounded bg-surface-hover" />
          <div className="h-6 w-32 animate-pulse rounded bg-surface-hover" />
        </div>
        <div className="grid grid-cols-3 gap-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="space-y-1">
              <div className="h-3 w-10 animate-pulse rounded bg-surface-hover" />
              <div className="h-3 w-8 animate-pulse rounded bg-surface-hover" />
            </div>
          ))}
        </div>
      </div>
      <div className="border-t border-border px-4 py-2.5">
        <div className="mx-auto h-3 w-20 animate-pulse rounded bg-surface-hover" />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Agent grid                                                         */
/* ------------------------------------------------------------------ */
export function AgentGrid() {
  const { agents, isLoading } = useAgents();
  const [donateModalOpen, setDonateModalOpen] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState<{ agent: Agent; index: number } | null>(null);

  const handleOpenDonate = (agent: Agent, index: number) => {
    setSelectedAgent({ agent, index });
    setDonateModalOpen(true);
  };

  const handleCloseDonate = () => {
    setDonateModalOpen(false);
    setSelectedAgent(null);
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <AgentCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (!agents || agents.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center rounded-xl border border-border bg-surface text-text-secondary">
        No agents found. Run the seed script to create agents.
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {agents.map((agent: Agent, i: number) => (
          <AgentCard
            key={agent.id}
            agent={agent}
            index={i}
            onDonate={() => handleOpenDonate(agent, i)}
          />
        ))}
      </div>

      {/* Donate Modal */}
      {selectedAgent && (
        <DonateModal
          isOpen={donateModalOpen}
          onClose={handleCloseDonate}
          agent={selectedAgent.agent}
          agentIndex={selectedAgent.index}
        />
      )}
    </>
  );
}
