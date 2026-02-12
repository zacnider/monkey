"use client";

import { useState, useEffect } from "react";
import { useAccount, useWriteContract, useReadContract } from "wagmi";
import { formatEther } from "viem";
import { motion } from "framer-motion";
import Link from "next/link";
import { useEarnings } from "@/hooks/use-agents";
import { formatMON, formatPnl, pnlColor, winRate, shortenAddress, explorerTxUrl, timeAgo } from "@/lib/utils";
import { monkeyVaultAbi } from "@/lib/blockchain/vault-abi";

const VAULT_ADDRESS = (process.env.NEXT_PUBLIC_VAULT_ADDRESS || "0x0000000000000000000000000000000000000000") as `0x${string}`;

export default function EarningsPage() {
  const [mounted, setMounted] = useState(false);
  const { address, isConnected } = useAccount();
  const { earnings, isLoading } = useEarnings(address);
  const [claiming, setClaiming] = useState(false);
  const [claimSuccess, setClaimSuccess] = useState(false);

  const { writeContractAsync } = useWriteContract();

  // Wait for client mount to avoid hydration mismatch (wallet state only exists on client)
  useEffect(() => {
    setMounted(true);
  }, []);

  // Read pending earnings from vault contract
  const { data: pendingEarnings } = useReadContract({
    address: VAULT_ADDRESS,
    abi: monkeyVaultAbi,
    functionName: "getPendingEarnings",
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });

  const handleClaimAll = async () => {
    if (!address) return;
    try {
      setClaiming(true);
      setClaimSuccess(false);
      await writeContractAsync({
        address: VAULT_ADDRESS,
        abi: monkeyVaultAbi,
        functionName: "claimAllEarnings",
      });
      setClaimSuccess(true);
    } catch (err) {
      console.error("Claim failed:", err);
    } finally {
      setClaiming(false);
    }
  };

  // Show loading spinner until client mounts (prevents hydration mismatch)
  if (!mounted) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!isConnected) {
    return (
      <div className="mx-auto max-w-2xl space-y-6">
        <div>
          <h1 className="text-3xl font-bold gradient-text">My Earnings</h1>
          <p className="mt-1 text-text-secondary">
            Track your profit share from donated agents
          </p>
        </div>
        <div className="rounded-xl border border-border bg-surface p-8 text-center">
          <p className="text-lg text-text-secondary">
            Connect your wallet to view your earnings
          </p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  const pendingAmount = pendingEarnings ? BigInt(pendingEarnings as bigint) : 0n;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold gradient-text">My Earnings</h1>
        <p className="mt-1 text-text-secondary">
          Wallet: <span className="font-mono">{shortenAddress(address!, 6)}</span>
        </p>
      </div>

      {/* Pending Earnings from Vault */}
      {pendingAmount > 0n && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl border border-mkey/30 bg-mkey/5 p-6"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-mkey">Claimable Earnings (On-Chain)</p>
              <p className="mt-1 font-mono text-2xl font-bold text-mkey">
                {formatEther(pendingAmount)} <span className="text-sm">MON</span>
              </p>
            </div>
            <button
              onClick={handleClaimAll}
              disabled={claiming}
              className="rounded-lg bg-mkey px-6 py-3 font-medium text-black transition-colors hover:bg-mkey/80 disabled:opacity-50"
            >
              {claiming ? "Claiming..." : claimSuccess ? "Claimed!" : "Claim All"}
            </button>
          </div>
          <p className="mt-2 text-xs text-text-muted">
            Secured by MonkeyVault smart contract. Claim sends MON directly to your wallet.
          </p>
        </motion.div>
      )}

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl border border-border bg-surface p-4"
        >
          <p className="text-xs text-text-muted">Total Donated</p>
          <p className="mt-1 font-mono text-xl font-bold">
            {earnings?.totalDonated ? formatMON(earnings.totalDonated) : "0"} <span className="text-sm text-text-secondary">MON</span>
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="rounded-xl border border-border bg-surface p-4"
        >
          <p className="text-xs text-text-muted">Your PnL</p>
          <p className={`mt-1 font-mono text-xl font-bold ${pnlColor(earnings?.totalPnl || "0")}`}>
            {earnings?.totalPnl ? formatPnl(earnings.totalPnl) : "0.0000 MON"}
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="rounded-xl border border-border bg-surface p-4"
        >
          <p className="text-xs text-text-muted">ROI</p>
          <p className={`mt-1 font-mono text-xl font-bold ${earnings?.roi && earnings.roi >= 0 ? "text-profit" : "text-loss"}`}>
            {earnings?.roi ? `${earnings.roi >= 0 ? "+" : ""}${earnings.roi.toFixed(2)}%` : "0%"}
          </p>
        </motion.div>
      </div>

      {/* Per-Agent Breakdown */}
      {earnings?.byAgent && earnings.byAgent.length > 0 && (
        <div className="rounded-xl border border-border bg-surface p-4">
          <h2 className="mb-4 text-lg font-semibold">By Agent</h2>
          <div className="space-y-3">
            {earnings.byAgent.map((item: { agentId: string; agentName: string; agentSlug: string; totalDonated: string; totalPnl: string; totalEarned: string; donationCount: number; winCount: number; lossCount: number; roi: number }) => (
              <Link
                key={item.agentId}
                href={`/agents/${item.agentSlug}`}
                className="flex items-center justify-between rounded-lg border border-border/50 bg-background p-4 hover:border-primary/30 transition-colors"
              >
                <div>
                  <span className="font-medium">{item.agentName}</span>
                  <div className="mt-1 flex items-center gap-3 text-xs text-text-muted">
                    <span>{item.donationCount} donation{item.donationCount !== 1 ? "s" : ""}</span>
                    <span>{formatMON(item.totalDonated)} MON</span>
                    <span>{winRate(item.winCount, item.lossCount)} WR</span>
                  </div>
                </div>
                <div className="text-right">
                  <div className={`font-mono text-sm ${pnlColor(item.totalPnl)}`}>
                    {formatPnl(item.totalPnl)}
                  </div>
                  <div className={`text-xs font-mono ${item.roi >= 0 ? "text-profit" : "text-loss"}`}>
                    {item.roi >= 0 ? "+" : ""}{item.roi.toFixed(2)}% ROI
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {(!earnings || !earnings.byAgent || earnings.byAgent.length === 0) && pendingAmount === 0n && (
        <div className="rounded-xl border border-border bg-surface p-8 text-center">
          <p className="text-text-secondary">No donations found for this wallet</p>
          <Link
            href="/donate"
            className="mt-4 inline-block rounded-lg bg-primary px-6 py-2 text-sm font-medium text-white hover:bg-primary-hover"
          >
            Donate to an Agent
          </Link>
        </div>
      )}

      {/* Recent Donations */}
      {earnings?.recentDonations && earnings.recentDonations.length > 0 && (
        <div className="rounded-xl border border-border bg-surface p-4">
          <h2 className="mb-4 text-lg font-semibold">Recent Donations</h2>
          <div className="space-y-2">
            {earnings.recentDonations.map((d: { txHash: string; agentName: string; amount: string; createdAt: string }, i: number) => (
              <div
                key={i}
                className="flex items-center justify-between rounded-lg px-3 py-2 text-sm hover:bg-background"
              >
                <div className="flex items-center gap-2">
                  <span className="text-primary">&#8594;</span>
                  <span>{d.agentName}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-mono text-text-primary">
                    {formatMON(d.amount)} MON
                  </span>
                  <span className="text-xs text-text-muted">
                    {timeAgo(d.createdAt)}
                  </span>
                  {d.txHash && (
                    <a
                      href={explorerTxUrl(d.txHash)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-text-muted hover:text-primary font-mono"
                    >
                      tx
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
