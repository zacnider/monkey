import {
  parseEther,
  type PublicClient,
  type WalletClient,
} from "viem";
import type { PrivateKeyAccount } from "viem/accounts";
import { TRADE_CONFIG, networkConfig } from "@/lib/config";
import { lensAbi, erc20Abi } from "./abi";
import {
  vaultExecuteBuy,
  vaultExecuteSell,
  getQuote,
  calculateSlippage,
  getVaultAgentHolding,
} from "./vault";

export interface BuyResult {
  txHash: string;
  amountIn: bigint;
  amountOut: bigint;
  tokenAddress: string;
}

export interface SellResult {
  txHash: string;
  amountIn: bigint;
  amountOut: bigint;
  tokenAddress: string;
}

export { getQuote, calculateSlippage } from "./vault";

export async function buyToken(
  publicClient: PublicClient,
  walletClient: WalletClient,
  account: PrivateKeyAccount,
  agentId: number,
  tokenAddress: `0x${string}`,
  monAmount: string
): Promise<BuyResult> {
  const amountIn = parseEther(monAmount);

  // Get quote for slippage calculation
  const { amountOut } = await getQuote(publicClient, tokenAddress, amountIn, true);
  const amountOutMin = calculateSlippage(amountOut, TRADE_CONFIG.SLIPPAGE_BPS);
  const deadline = BigInt(Math.floor(Date.now() / 1000) + TRADE_CONFIG.DEADLINE_SECONDS);

  // Execute via vault
  const txHash = await vaultExecuteBuy(
    publicClient,
    walletClient,
    account,
    agentId,
    tokenAddress,
    amountIn,
    amountOutMin,
    deadline
  );

  return { txHash, amountIn, amountOut, tokenAddress };
}

export async function sellToken(
  publicClient: PublicClient,
  walletClient: WalletClient,
  account: PrivateKeyAccount,
  agentId: number,
  tokenAddress: `0x${string}`,
  amount?: bigint
): Promise<SellResult> {
  // Get holding from vault if amount not specified
  const balance =
    amount ?? (await getVaultAgentHolding(publicClient, agentId, tokenAddress)).amount;

  if (balance <= 0n) {
    throw new Error("No tokens to sell");
  }

  // Get quote for sell
  const { amountOut } = await getQuote(publicClient, tokenAddress, balance, false);
  const amountOutMin = calculateSlippage(amountOut, TRADE_CONFIG.SLIPPAGE_BPS);
  const deadline = BigInt(Math.floor(Date.now() / 1000) + TRADE_CONFIG.DEADLINE_SECONDS);

  // Execute via vault
  const txHash = await vaultExecuteSell(
    publicClient,
    walletClient,
    account,
    agentId,
    tokenAddress,
    balance,
    amountOutMin,
    deadline
  );

  return { txHash, amountIn: balance, amountOut, tokenAddress };
}

export async function getTokenBalance(
  publicClient: PublicClient,
  tokenAddress: `0x${string}`,
  ownerAddress: `0x${string}`
): Promise<bigint> {
  return (await publicClient.readContract({
    address: tokenAddress,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: [ownerAddress],
  })) as bigint;
}

export async function getMonBalance(
  publicClient: PublicClient,
  address: `0x${string}`
): Promise<bigint> {
  return await publicClient.getBalance({ address });
}

export async function getCurveProgress(
  publicClient: PublicClient,
  tokenAddress: `0x${string}`
): Promise<bigint> {
  return (await publicClient.readContract({
    address: networkConfig.LENS,
    abi: lensAbi,
    functionName: "getProgress",
    args: [tokenAddress],
  })) as bigint;
}
