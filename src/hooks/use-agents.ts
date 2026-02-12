"use client";

import useSWR from "swr";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function useAgents() {
  const { data, error, isLoading, mutate } = useSWR("/api/agents", fetcher, {
    refreshInterval: 15000,
  });
  return { agents: data || [], error, isLoading, mutate };
}

export function useAgent(idOrSlug: string) {
  const { data, error, isLoading, mutate } = useSWR(
    idOrSlug ? `/api/agents/${idOrSlug}` : null,
    fetcher,
    { refreshInterval: 10000 }
  );
  return { agent: data, error, isLoading, mutate };
}

export function useAgentTrades(idOrSlug: string, page: number = 1) {
  const { data, error, isLoading } = useSWR(
    idOrSlug ? `/api/agents/${idOrSlug}/trades?page=${page}` : null,
    fetcher,
    { refreshInterval: 15000 }
  );
  return { data, error, isLoading };
}

export function useAgentDonors(idOrSlug: string) {
  const { data, error, isLoading } = useSWR(
    idOrSlug ? `/api/agents/${idOrSlug}/donors` : null,
    fetcher,
    { refreshInterval: 30000 }
  );
  return { donors: data || [], error, isLoading };
}

export function useStats() {
  const { data, error, isLoading } = useSWR("/api/stats", fetcher, {
    refreshInterval: 15000,
  });
  return { stats: data, error, isLoading };
}

export function useEarnings(address: string | undefined) {
  const { data, error, isLoading } = useSWR(
    address ? `/api/earnings/${address}` : null,
    fetcher,
    { refreshInterval: 30000 }
  );
  return { earnings: data, error, isLoading };
}
