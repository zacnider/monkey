"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { formatEther } from "viem";

interface Snapshot {
  pnl: string;
  monBalance: string;
  timestamp: string;
}

export function AgentPnlChart({ snapshots }: { snapshots: Snapshot[] }) {
  if (snapshots.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center text-text-muted">
        No performance data yet — waiting for first trades
      </div>
    );
  }

  const data = [...snapshots].reverse().map((s) => ({
    time: new Date(s.timestamp).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    }),
    pnl: parseFloat(formatEther(BigInt(s.pnl))),
    balance: parseFloat(formatEther(BigInt(s.monBalance))),
  }));

  const latestPnl = data[data.length - 1]?.pnl ?? 0;
  const color = latestPnl >= 0 ? "#22c55e" : "#ef4444";

  return (
    <ResponsiveContainer width="100%" height={240}>
      <AreaChart data={data}>
        <defs>
          <linearGradient id="agentPnlGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={color} stopOpacity={0.3} />
            <stop offset="95%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <XAxis
          dataKey="time"
          stroke="#555570"
          fontSize={11}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          stroke="#555570"
          fontSize={11}
          tickLine={false}
          axisLine={false}
          tickFormatter={(v) => `${v.toFixed(2)}`}
        />
        <Tooltip
          contentStyle={{
            background: "#12121a",
            border: "1px solid #2a2a3a",
            borderRadius: "8px",
            fontSize: "12px",
          }}
          labelStyle={{ color: "#8888a0" }}
          formatter={(value: number) => [`${value.toFixed(4)} MON`, "PnL"]}
        />
        <Area
          type="monotone"
          dataKey="pnl"
          stroke={color}
          strokeWidth={2}
          fill="url(#agentPnlGradient)"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
