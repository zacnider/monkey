"use client";

import { useState, useEffect } from "react";
import { useAccount, useBalance, useWriteContract } from "wagmi";
import { parseEther, formatEther } from "viem";
import { motion, AnimatePresence } from "framer-motion";
import { X, Heart } from "lucide-react";
import { formatMON, shortenAddress } from "@/lib/utils";
import { monkeyVaultAbi } from "@/lib/blockchain/vault-abi";

const VAULT_ADDRESS = (process.env.NEXT_PUBLIC_VAULT_ADDRESS || "0x0000000000000000000000000000000000000000") as `0x${string}`;

interface DonateModalProps {
  isOpen: boolean;
  onClose: () => void;
  agent: {
    id: string;
    slug: string;
    name: string;
    avatar: string;
    strategy: string;
  };
  agentIndex: number;
}

export function DonateModal({ isOpen, onClose, agent, agentIndex }: DonateModalProps) {
  const { address, isConnected } = useAccount();
  const { writeContractAsync } = useWriteContract();
  const { data: balanceData } = useBalance({ address });

  const [amount, setAmount] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "confirming" | "recording" | "done" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setAmount("");
      setStatus("idle");
      setErrorMsg("");
    }
  }, [isOpen]);

  const handleDonate = async () => {
    if (!amount || !address) return;

    try {
      setStatus("sending");
      setErrorMsg("");

      // Call vault.donate(agentId) with MON value
      const hash = await writeContractAsync({
        address: VAULT_ADDRESS,
        abi: monkeyVaultAbi,
        functionName: "donate",
        args: [agentIndex],
        value: parseEther(amount),
      });

      setStatus("confirming");
      await new Promise((r) => setTimeout(r, 3000));

      setStatus("recording");

      // Record donation in backend
      const res = await fetch("/api/donate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          txHash: hash,
          agentId: agent.slug,
          donorAddress: address,
          amount: parseEther(amount).toString(),
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to record donation");
      }

      setStatus("done");
      setAmount("");
    } catch (err) {
      setStatus("error");
      setErrorMsg(err instanceof Error ? err.message : "Transaction failed");
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        />

        {/* Modal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative z-10 w-full max-w-md rounded-2xl border border-border bg-surface shadow-2xl"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border p-6">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/20 overflow-hidden">
                {agent.avatar?.endsWith(".svg") || agent.avatar?.endsWith(".png") ? (
                  <img src={agent.avatar} alt={agent.name} className="h-full w-full object-cover" />
                ) : (
                  <span className="text-2xl">🤖</span>
                )}
              </div>
              <div>
                <h2 className="text-lg font-semibold text-text-primary">
                  Donate to {agent.name}
                </h2>
                <p className="text-xs text-text-muted uppercase tracking-wide">
                  {agent.strategy}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="rounded-lg p-2 text-text-muted transition-colors hover:bg-surface-hover hover:text-text-primary"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Body */}
          <div className="p-6">
            {!isConnected ? (
              <div className="rounded-lg bg-background p-6 text-center">
                <p className="text-sm text-text-secondary">
                  Connect your wallet to donate MON
                </p>
                <p className="mt-1 text-xs text-text-muted">
                  Use the Connect Wallet button in the header
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Amount Input */}
                <div>
                  <div className="mb-1 flex items-center justify-between">
                    <label className="text-sm font-medium text-text-secondary">
                      Amount (MON)
                    </label>
                    {balanceData && (
                      <span className="text-xs text-text-muted">
                        Balance: <span className="font-mono text-text-secondary">{parseFloat(formatEther(balanceData.value)).toFixed(4)}</span> MON
                      </span>
                    )}
                  </div>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.1"
                    className="w-full rounded-lg border border-border bg-background px-4 py-2.5 font-mono text-text-primary focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />

                  {/* Quick Amount Buttons */}
                  <div className="mt-2 flex gap-2">
                    {[10, 25, 50, 75, 100].map((pct) => {
                      const pctAmount = balanceData
                        ? (Number(formatEther(balanceData.value)) * pct) / 100
                        : 0;
                      return (
                        <button
                          key={pct}
                          onClick={() => {
                            if (balanceData) {
                              const val = pct === 100
                                ? formatEther(balanceData.value)
                                : pctAmount.toFixed(6);
                              setAmount(val);
                            }
                          }}
                          disabled={!balanceData || balanceData.value === 0n}
                          className="flex-1 rounded-lg border border-border py-1.5 text-xs font-medium transition-colors hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          {pct}%
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Info Box */}
                <div className="rounded-lg bg-background p-3 text-xs text-text-muted space-y-1">
                  <p>
                    <span className="text-text-secondary">Vault:</span>{" "}
                    <span className="font-mono">{shortenAddress(VAULT_ADDRESS, 6)}</span>
                  </p>
                  <p className="text-text-secondary">
                    Your donation is secured by the vault smart contract. You&apos;ll receive 80% of this agent&apos;s trading profits proportional to your share.
                  </p>
                  <p className="text-mkey">
                    Claim your earnings on-chain anytime from the Earnings page.
                  </p>
                </div>

                {/* Donate Button */}
                <button
                  onClick={handleDonate}
                  disabled={!amount || parseFloat(amount) <= 0 || status === "sending" || status === "confirming" || status === "recording"}
                  className="w-full rounded-lg bg-primary py-3 font-medium text-white transition-all hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <Heart className="h-4 w-4" />
                  {status === "sending" ? "Confirm in Wallet..." :
                   status === "confirming" ? "Waiting for Confirmation..." :
                   status === "recording" ? "Recording Donation..." :
                   status === "done" ? "Donation Successful!" :
                   `Donate ${amount || "0"} MON`}
                </button>

                {/* Success Message */}
                {status === "done" && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="rounded-lg bg-profit/10 p-3 text-center text-sm text-profit"
                  >
                    Donation recorded! You&apos;ll start earning when {agent.name} makes profitable trades.
                  </motion.div>
                )}

                {/* Error Message */}
                {status === "error" && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="rounded-lg bg-loss/10 p-3 text-sm text-loss"
                  >
                    {errorMsg}
                  </motion.div>
                )}
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
