import { networkConfig } from "@/lib/config";

const API_URL = networkConfig.apiUrl;
const headers: Record<string, string> = {
  "Content-Type": "application/json",
};

if (process.env.NADFUN_API_KEY) {
  headers["X-API-Key"] = process.env.NADFUN_API_KEY;
}

export interface TokenInfo {
  token_id: string;
  name: string;
  symbol: string;
  price: string;
  market_type: string;
  market_cap?: string;
  volume_24h?: string;
  created_at: number;
  creator?: string;
  image_uri?: string;
  description?: string;
}

export interface TokenMarketData {
  price: string;
  market_cap: string;
  volume_24h: string;
  price_change_1h?: number;
  price_change_24h?: number;
  holder_count?: number;
  total_supply?: string;
  is_graduated?: boolean;
}

export interface MarketInfo {
  market_type: string;
  token_id: string;
  market_id: string;
  reserve_native: string;
  reserve_token: string;
  token_price: string;
  price: string;
  price_usd: string;
  price_native: string;
  total_supply: string;
  volume: string;
  holder_count: number;
}

export interface RecentToken {
  token_info: TokenInfo;
  market_info?: MarketInfo;
  percent?: number;
}

export async function fetchRecentTokens(limit: number = 50): Promise<RecentToken[]> {
  try {
    const res = await fetch(
      `${API_URL}/order/latest_trade?page=1&limit=${limit}`,
      { headers, next: { revalidate: 10 } }
    );
    if (!res.ok) throw new Error(`API error: ${res.status}`);
    const data = await res.json();
    return data.tokens || [];
  } catch (error) {
    console.error("Failed to fetch recent tokens:", error);
    return [];
  }
}

export async function getTokenPrice(tokenAddress: string): Promise<TokenMarketData | null> {
  try {
    const res = await fetch(`${API_URL}/trade/market/${tokenAddress}`, {
      headers,
      next: { revalidate: 15 },
    });
    if (!res.ok) return null;
    const data = await res.json();
    const m = data.market_info;
    if (!m) return null;
    return {
      price: m.price_native || m.price || "0",
      market_cap: m.reserve_native || "0",
      volume_24h: m.volume || "0",
      price_change_1h: data.percent_1h ?? 0,
      price_change_24h: data.percent_24h ?? data.percent ?? 0,
      holder_count: m.holder_count ?? 0,
      total_supply: m.total_supply,
      is_graduated: m.market_type === "DEX",
    };
  } catch {
    return null;
  }
}

export async function getTokenChart(
  tokenAddress: string,
  interval: string = "1h"
): Promise<Array<{ timestamp: number; price: string; volume: string }>> {
  try {
    const res = await fetch(
      `${API_URL}/trade/chart/${tokenAddress}?interval=${interval}`,
      { headers }
    );
    if (!res.ok) return [];
    const data = await res.json();
    return data.chart || [];
  } catch {
    return [];
  }
}

export async function getTokenHolders(
  tokenAddress: string
): Promise<Array<{ address: string; balance: string; percentage: number }>> {
  try {
    const res = await fetch(`${API_URL}/token/holders/${tokenAddress}`, {
      headers,
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data.holders || [];
  } catch {
    return [];
  }
}

export async function getTokenTrades(
  tokenAddress: string,
  limit: number = 20
): Promise<Array<{ type: string; amount: string; price: string; timestamp: number; trader: string }>> {
  try {
    const res = await fetch(
      `${API_URL}/trade/recent/${tokenAddress}?limit=${limit}`,
      { headers }
    );
    if (!res.ok) return [];
    const data = await res.json();
    return data.trades || [];
  } catch {
    return [];
  }
}

export async function getCreatorTokens(
  creatorAddress: string
): Promise<Array<{ token_info: TokenInfo; reward_info?: { amount: string; claimed_amount: string; claimable: boolean; proof: string[] } }>> {
  try {
    const res = await fetch(
      `${API_URL}/agent/token/created/${creatorAddress}`,
      { headers }
    );
    if (!res.ok) return [];
    const data = await res.json();
    return data.tokens || [];
  } catch {
    return [];
  }
}
