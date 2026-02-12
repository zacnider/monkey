"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useInView, useSpring, useTransform } from "framer-motion";
import {
  TrendingUp,
  BarChart3,
  Bot,
  Users,
} from "lucide-react";
import { useStats } from "@/hooks/use-agents";
import { cn, formatPnl } from "@/lib/utils";
import { formatEther } from "viem";

/* ------------------------------------------------------------------ */
/*  Animated counter that spring-animates from 0 to `value`           */
/* ------------------------------------------------------------------ */
function AnimatedNumber({
  value,
  decimals = 0,
  prefix = "",
  suffix = "",
  className,
}: {
  value: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });

  const spring = useSpring(0, { mass: 0.8, stiffness: 60, damping: 18 });
  const display = useTransform(spring, (v) =>
    `${prefix}${v.toFixed(decimals)}${suffix}`
  );

  useEffect(() => {
    if (inView) spring.set(value);
  }, [inView, value, spring]);

  /* Keep the DOM in sync via a subscription */
  const [text, setText] = useState(`${prefix}0${suffix}`);
  useEffect(() => {
    const unsub = display.on("change", (v) => setText(v));
    return unsub;
  }, [display]);

  return (
    <span ref={ref} className={cn("font-mono tabular-nums", className)}>
      {text}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/*  Single stat card                                                   */
/* ------------------------------------------------------------------ */
interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  glowClass: string;
  colorClass: string;
  delay: number;
}

function StatCard({
  icon,
  label,
  value,
  prefix = "",
  suffix = "",
  decimals = 0,
  glowClass,
  colorClass,
  delay,
}: StatCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
      className={cn(
        "group relative rounded-xl border border-border bg-surface p-5",
        "transition-all duration-300 hover:border-border-bright",
        glowClass
      )}
    >
      {/* Subtle gradient backdrop on hover */}
      <div
        className={cn(
          "pointer-events-none absolute inset-0 rounded-xl opacity-0 transition-opacity duration-300 group-hover:opacity-100",
          "bg-gradient-to-br from-transparent via-transparent to-primary/5"
        )}
      />

      <div className="relative flex items-start justify-between">
        <div className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-wider text-text-secondary">
            {label}
          </p>
          <AnimatedNumber
            value={value}
            prefix={prefix}
            suffix={suffix}
            decimals={decimals}
            className={cn("text-2xl font-bold", colorClass)}
          />
        </div>

        <div
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg",
            "bg-surface-hover border border-border",
            colorClass
          )}
        >
          {icon}
        </div>
      </div>
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/*  Stats cards grid                                                   */
/* ------------------------------------------------------------------ */
export function StatsCards() {
  const { stats, isLoading } = useStats();

  /* Parse PnL from BigInt string to a human-readable float */
  const pnlValue = stats?.totalPnl
    ? parseFloat(formatEther(BigInt(stats.totalPnl)))
    : 0;
  const pnlIsPositive = pnlValue >= 0;

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="h-[108px] animate-pulse rounded-xl border border-border bg-surface"
          />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      <StatCard
        icon={<TrendingUp className="h-5 w-5" />}
        label="Total PnL"
        value={pnlValue}
        prefix={pnlIsPositive ? "+" : ""}
        suffix=" MON"
        decimals={4}
        glowClass={pnlIsPositive ? "glow-profit" : "glow-loss"}
        colorClass={pnlIsPositive ? "text-profit" : "text-loss"}
        delay={0}
      />

      <StatCard
        icon={<BarChart3 className="h-5 w-5" />}
        label="Total Trades"
        value={stats?.totalTrades ?? 0}
        glowClass="glow-primary"
        colorClass="text-primary"
        delay={0.08}
      />

      <StatCard
        icon={<Bot className="h-5 w-5" />}
        label="Active Agents"
        value={stats?.activeAgents ?? 0}
        suffix={` / ${stats?.totalAgents ?? 8}`}
        glowClass="glow-mkey"
        colorClass="text-mkey"
        delay={0.16}
      />

      <StatCard
        icon={<Users className="h-5 w-5" />}
        label="Unique Donors"
        value={stats?.uniqueDonors ?? 0}
        glowClass="glow-primary"
        colorClass="text-text-primary"
        delay={0.24}
      />
    </div>
  );
}
