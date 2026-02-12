"use client";

import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { cn } from "@/lib/utils";

interface PnlDataPoint {
  time: string;
  pnl: number;
  trades: number;
}

/* ------------------------------------------------------------------ */
/*  Custom tooltip                                                     */
/* ------------------------------------------------------------------ */
function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;

  const pnl = payload[0].value as number;
  const trades = payload[0].payload.trades as number;
  const isPositive = pnl >= 0;

  return (
    <div className="rounded-lg border border-border bg-surface px-3 py-2 shadow-xl">
      <p className="mb-1 text-[10px] font-medium uppercase tracking-wider text-text-muted">
        {label}
      </p>
      <p
        className={cn(
          "font-mono text-sm font-bold tabular-nums",
          isPositive ? "text-profit" : "text-loss"
        )}
      >
        {isPositive ? "+" : ""}
        {pnl.toFixed(4)} MON
      </p>
      <p className="mt-0.5 text-[10px] text-text-secondary">
        {trades} trade{trades !== 1 ? "s" : ""}
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  PnL chart component — real-time data from API                      */
/* ------------------------------------------------------------------ */
export function PnlChart() {
  const [data, setData] = useState<PnlDataPoint[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/stats/pnl-chart");
      if (res.ok) {
        const json = await res.json();
        if (json.length > 0) {
          setData(json);
        }
      }
    } catch {
      // Silently fail — chart shows last known data
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    // Refresh every 60 seconds (matches agent cycle)
    const interval = setInterval(fetchData, 60000);
    return () => clearInterval(interval);
  }, [fetchData]);

  /* Determine if overall PnL is positive for gradient colouring */
  const latestPnl = data[data.length - 1]?.pnl ?? 0;
  const isPositive = latestPnl >= 0;
  const strokeColor = isPositive ? "#22c55e" : "#ef4444";
  const gradientId = "pnl-gradient";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.3 }}
      className={cn(
        "rounded-xl border border-border bg-surface p-5",
        isPositive ? "glow-profit" : "glow-loss"
      )}
    >
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-text-primary">
            Platform PnL
          </h2>
          <p className="mt-0.5 text-xs text-text-secondary">
            Cumulative profit &amp; loss across all agents
          </p>
        </div>

        <div className="flex items-center gap-1.5">
          <span
            className={cn(
              "h-2 w-2 rounded-full",
              isPositive ? "bg-profit" : "bg-loss"
            )}
          />
          <span
            className={cn(
              "font-mono text-sm font-bold tabular-nums",
              isPositive ? "text-profit" : "text-loss"
            )}
          >
            {isPositive ? "+" : ""}
            {latestPnl.toFixed(4)} MON
          </span>
        </div>
      </div>

      {/* Chart */}
      <div className="h-[260px] w-full">
        {loading ? (
          <div className="flex h-full items-center justify-center">
            <p className="text-sm text-text-muted">Loading chart data...</p>
          </div>
        ) : data.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <p className="text-sm text-text-muted">
              No PnL data yet — agents will populate this as they trade
            </p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={data}
              margin={{ top: 4, right: 4, left: -20, bottom: 0 }}
            >
              <defs>
                <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="0%"
                    stopColor={strokeColor}
                    stopOpacity={0.3}
                  />
                  <stop
                    offset="95%"
                    stopColor={strokeColor}
                    stopOpacity={0}
                  />
                </linearGradient>
              </defs>

              <CartesianGrid
                strokeDasharray="3 3"
                stroke="#2a2a3a"
                vertical={false}
              />

              <XAxis
                dataKey="time"
                axisLine={false}
                tickLine={false}
                tick={{ fill: "#555570", fontSize: 10 }}
                interval="preserveStartEnd"
                minTickGap={40}
              />

              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fill: "#555570", fontSize: 10 }}
                tickFormatter={(v: number) =>
                  `${v >= 0 ? "+" : ""}${v.toFixed(2)}`
                }
                domain={["dataMin - 0.02", "dataMax + 0.02"]}
              />

              <Tooltip content={<ChartTooltip />} cursor={false} />

              <Area
                type="monotone"
                dataKey="pnl"
                stroke={strokeColor}
                strokeWidth={2}
                fill={`url(#${gradientId})`}
                dot={false}
                activeDot={{
                  r: 4,
                  fill: strokeColor,
                  stroke: "#12121a",
                  strokeWidth: 2,
                }}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Footer — live indicator */}
      <p className="mt-3 text-center text-[10px] text-text-muted">
        <span className="mr-1 inline-block h-1.5 w-1.5 rounded-full bg-profit animate-pulse-live" />
        Live data — updates every 60s
      </p>
    </motion.div>
  );
}
