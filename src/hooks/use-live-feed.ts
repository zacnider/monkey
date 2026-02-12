"use client";

import { useEffect, useState, useCallback } from "react";

export interface LiveTrade {
  id: string;
  agentName: string;
  agentSlug: string;
  agentAvatar: string;
  tokenSymbol: string;
  tokenName: string;
  type: string;
  amountIn: string;
  amountOut: string;
  pnl: string | null;
  reason: string;
  txHash: string;
  createdAt: string;
}

export function useLiveFeed(maxItems: number = 50) {
  const [trades, setTrades] = useState<LiveTrade[]>([]);
  const [connected, setConnected] = useState(false);

  const connect = useCallback(() => {
    const eventSource = new EventSource("/api/live");

    eventSource.onopen = () => setConnected(true);

    eventSource.onmessage = (event) => {
      try {
        const trade = JSON.parse(event.data) as LiveTrade;
        setTrades((prev) => {
          const exists = prev.some((t) => t.id === trade.id);
          if (exists) return prev;
          return [trade, ...prev].slice(0, maxItems);
        });
      } catch {
        // Ignore parse errors (pings, etc.)
      }
    };

    eventSource.onerror = () => {
      setConnected(false);
      eventSource.close();
      // Reconnect after 5 seconds
      setTimeout(connect, 5000);
    };

    return eventSource;
  }, [maxItems]);

  useEffect(() => {
    const es = connect();
    return () => es.close();
  }, [connect]);

  return { trades, connected };
}
