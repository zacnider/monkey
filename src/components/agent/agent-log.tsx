"use client";

import { timeAgo } from "@/lib/utils";

interface Log {
  id: string;
  type: string;
  message: string;
  createdAt: string;
}

const TYPE_STYLES: Record<string, { bg: string; label: string }> = {
  decision: { bg: "bg-info/10 text-info", label: "DECISION" },
  trade: { bg: "bg-profit/10 text-profit", label: "TRADE" },
  error: { bg: "bg-loss/10 text-loss", label: "ERROR" },
  mkey_buy: { bg: "bg-mkey/10 text-mkey", label: "MKEY" },
};

export function AgentLog({ logs }: { logs: Log[] }) {
  if (logs.length === 0) {
    return (
      <div className="py-8 text-center text-text-muted">
        No activity logged yet
      </div>
    );
  }

  return (
    <div className="space-y-1 max-h-96 overflow-y-auto">
      {logs.map((log) => {
        const style = TYPE_STYLES[log.type] || TYPE_STYLES.decision;
        return (
          <div
            key={log.id}
            className="flex items-start gap-3 rounded-lg px-3 py-2 hover:bg-background transition-colors"
          >
            <span
              className={`mt-0.5 shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold ${style.bg}`}
            >
              {style.label}
            </span>
            <p className="flex-1 text-xs text-text-secondary leading-relaxed">
              {log.message}
            </p>
            <span className="shrink-0 text-[10px] text-text-muted">
              {timeAgo(log.createdAt)}
            </span>
          </div>
        );
      })}
    </div>
  );
}
