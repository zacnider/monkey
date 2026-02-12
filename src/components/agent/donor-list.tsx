"use client";

import { useAgentDonors } from "@/hooks/use-agents";
import { formatMON, shortenAddress } from "@/lib/utils";

export function DonorList({ agentSlug }: { agentSlug: string }) {
  const { donors, isLoading } = useAgentDonors(agentSlug);

  if (isLoading) {
    return <div className="py-4 text-center text-text-muted">Loading...</div>;
  }

  if (!donors || donors.length === 0) {
    return (
      <div className="py-8 text-center text-text-muted">
        No donors yet — be the first to support this agent!
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {donors.map((donor: { address: string; totalDonated: string; totalEarned: string; donationCount: number }, i: number) => (
        <div
          key={donor.address}
          className="flex items-center justify-between rounded-lg border border-border/50 bg-background p-3"
        >
          <div className="flex items-center gap-3">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/20 text-xs font-bold text-primary">
              {i + 1}
            </span>
            <div>
              <span className="font-mono text-sm">
                {shortenAddress(donor.address, 6)}
              </span>
              <span className="ml-2 text-xs text-text-muted">
                {donor.donationCount} donation{donor.donationCount !== 1 ? "s" : ""}
              </span>
            </div>
          </div>
          <div className="text-right">
            <div className="font-mono text-sm">
              {formatMON(donor.totalDonated)} MON
            </div>
            <div className="font-mono text-xs text-profit">
              +{formatMON(donor.totalEarned)} earned
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
