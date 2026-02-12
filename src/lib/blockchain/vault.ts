import type { PublicClient, WalletClient } from "viem";
import type { PrivateKeyAccount } from "viem/accounts";
import { VAULT_ADDRESS, TRADE_CONFIG } from "@/lib/config";
import { monkeyVaultAbi } from "./vault-abi";
import { lensAbi } from "./abi";
import { networkConfig } from "@/lib/config";
import { monadChain } from "./client";

// ─── Write Functions (operator only) ─────────────────────

export async function vaultExecuteBuy(
  publicClient: PublicClient,
  walletClient: WalletClient,
  account: PrivateKeyAccount,
  agentId: number,
  tokenAddress: `0x${string}`,
  amountIn: bigint,
  amountOutMin: bigint,
  deadline: bigint
): Promise<string> {
  // Pre-flight simulation to catch reverts early
  await publicClient.simulateContract({
    address: VAULT_ADDRESS,
    abi: monkeyVaultAbi,
    functionName: "executeBuy",
    args: [agentId, tokenAddress, amountIn, amountOutMin, deadline],
    account,
  });

  const hash = await walletClient.writeContract({
    address: VAULT_ADDRESS,
    abi: monkeyVaultAbi,
    functionName: "executeBuy",
    args: [agentId, tokenAddress, amountIn, amountOutMin, deadline],
    account,
    chain: monadChain,
  });
  await publicClient.waitForTransactionReceipt({ hash });
  return hash;
}

export async function vaultExecuteSell(
  publicClient: PublicClient,
  walletClient: WalletClient,
  account: PrivateKeyAccount,
  agentId: number,
  tokenAddress: `0x${string}`,
  amountIn: bigint,
  amountOutMin: bigint,
  deadline: bigint
): Promise<string> {
  // Pre-flight simulation to catch reverts early
  await publicClient.simulateContract({
    address: VAULT_ADDRESS,
    abi: monkeyVaultAbi,
    functionName: "executeSell",
    args: [agentId, tokenAddress, amountIn, amountOutMin, deadline],
    account,
  });

  const hash = await walletClient.writeContract({
    address: VAULT_ADDRESS,
    abi: monkeyVaultAbi,
    functionName: "executeSell",
    args: [agentId, tokenAddress, amountIn, amountOutMin, deadline],
    account,
    chain: monadChain,
  });
  await publicClient.waitForTransactionReceipt({ hash });
  return hash;
}

// ─── Read Functions ──────────────────────────────────────

export async function getVaultAgentInfo(
  publicClient: PublicClient,
  agentId: number
): Promise<{
  isActive: boolean;
  balance: bigint;
  totalDonated: bigint;
  totalPnl: bigint;
  mkeyBalance: bigint;
  totalDistributed: bigint;
  tradeCount: bigint;
}> {
  const result = await publicClient.readContract({
    address: VAULT_ADDRESS,
    abi: monkeyVaultAbi,
    functionName: "getAgentInfo",
    args: [agentId],
  });
  const [isActive, balance, totalDonated, totalPnl, mkeyBalance, totalDistributed, tradeCount] = result as [boolean, bigint, bigint, bigint, bigint, bigint, bigint];
  return { isActive, balance, totalDonated, totalPnl, mkeyBalance, totalDistributed, tradeCount };
}

export async function getVaultDonorInfo(
  publicClient: PublicClient,
  agentId: number,
  donorAddress: `0x${string}`
): Promise<{
  totalDonated: bigint;
  totalClaimed: bigint;
  pendingEarnings: bigint;
}> {
  const result = await publicClient.readContract({
    address: VAULT_ADDRESS,
    abi: monkeyVaultAbi,
    functionName: "getDonorInfo",
    args: [agentId, donorAddress],
  });
  const [totalDonated, totalClaimed, pendingEarnings] = result as [bigint, bigint, bigint];
  return { totalDonated, totalClaimed, pendingEarnings };
}

export async function getVaultPendingEarnings(
  publicClient: PublicClient,
  donorAddress: `0x${string}`
): Promise<bigint> {
  return (await publicClient.readContract({
    address: VAULT_ADDRESS,
    abi: monkeyVaultAbi,
    functionName: "getPendingEarnings",
    args: [donorAddress],
  })) as bigint;
}

export async function getVaultAgentHolding(
  publicClient: PublicClient,
  agentId: number,
  tokenAddress: `0x${string}`
): Promise<{ amount: bigint; costBasis: bigint }> {
  const result = await publicClient.readContract({
    address: VAULT_ADDRESS,
    abi: monkeyVaultAbi,
    functionName: "getAgentHolding",
    args: [agentId, tokenAddress],
  });
  const [amount, costBasis] = result as [bigint, bigint];
  return { amount, costBasis };
}

export async function getVaultPlatformStats(
  publicClient: PublicClient
): Promise<{
  totalBalance: bigint;
  totalPnl: bigint;
  totalDonated: bigint;
  totalDistributed: bigint;
  totalMkey: bigint;
  totalTrades: bigint;
  activeAgents: number;
}> {
  const result = await publicClient.readContract({
    address: VAULT_ADDRESS,
    abi: monkeyVaultAbi,
    functionName: "getPlatformStats",
  });
  const [totalBalance, totalPnl, totalDonated, totalDistributed, totalMkey, totalTrades, activeAgents] = result as [bigint, bigint, bigint, bigint, bigint, bigint, number];
  return { totalBalance, totalPnl, totalDonated, totalDistributed, totalMkey, totalTrades, activeAgents };
}

export async function getVaultDonorCount(
  publicClient: PublicClient,
  agentId: number
): Promise<bigint> {
  return (await publicClient.readContract({
    address: VAULT_ADDRESS,
    abi: monkeyVaultAbi,
    functionName: "getDonorCount",
    args: [agentId],
  })) as bigint;
}

// ─── Quote Helper ────────────────────────────────────────

export async function getQuote(
  publicClient: PublicClient,
  tokenAddress: `0x${string}`,
  amountIn: bigint,
  isBuy: boolean
): Promise<{ router: `0x${string}`; amountOut: bigint }> {
  const [router, amountOut] = await publicClient.readContract({
    address: networkConfig.LENS,
    abi: lensAbi,
    functionName: "getAmountOut",
    args: [tokenAddress, amountIn, isBuy],
  });
  return { router: router as `0x${string}`, amountOut: amountOut as bigint };
}

export function calculateSlippage(amountOut: bigint, slippageBps: bigint): bigint {
  return (amountOut * (10000n - slippageBps)) / 10000n;
}
