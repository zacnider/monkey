import { prisma } from "@/lib/db";
import { publicClient, getOperatorAccount, getOperatorWalletClient } from "@/lib/blockchain/client";
import { BaseAgent } from "./base-agent";
import { fetchRecentTokens } from "@/lib/nadfun/api";
import type { PublicClient } from "viem";

export async function runAllAgentCycles(): Promise<{
  results: Array<{ agentName: string; status: string; error?: string }>;
}> {
  const agents = await prisma.agent.findMany({
    where: { isActive: true },
    orderBy: { createdAt: "asc" },
  });

  const results: Array<{ agentName: string; status: string; error?: string }> = [];
  const account = getOperatorAccount();
  const walletClient = getOperatorWalletClient();

  // Fetch recent tokens ONCE per cycle — shared across all 8 agents
  const sharedRecentTokens = await fetchRecentTokens(50);

  // Cross-agent blacklist: tokens bought by any agent this cycle
  // Prevents multiple agents from buying the same token
  const boughtThisCycle = new Set<string>();

  for (let i = 0; i < agents.length; i++) {
    const agentData = agents[i];

    try {
      const agent = new BaseAgent(
        agentData.id,
        i, // vault agentId (0-7)
        agentData.strategy,
        agentData.name,
        publicClient as PublicClient,
        walletClient,
        account
      );

      const bought = await agent.runCycle(sharedRecentTokens, boughtThisCycle);
      // Add any tokens this agent bought to the blacklist
      if (bought) {
        for (const addr of bought) {
          boughtThisCycle.add(addr.toLowerCase());
        }
      }
      results.push({ agentName: agentData.name, status: "completed" });
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Unknown error";
      results.push({ agentName: agentData.name, status: "failed", error: msg });
    }

    // Stagger between agents (2-5 seconds)
    const delay = 2000 + Math.random() * 3000;
    await new Promise((resolve) => setTimeout(resolve, delay));
  }

  return { results };
}

export async function runSingleAgentCycle(agentId: string): Promise<void> {
  const agentData = await prisma.agent.findUnique({
    where: { id: agentId },
  });

  if (!agentData || !agentData.isActive) {
    throw new Error("Agent not found or inactive");
  }

  const allAgents = await prisma.agent.findMany({
    orderBy: { createdAt: "asc" },
  });
  const vaultAgentId = allAgents.findIndex((a) => a.id === agentId);

  if (vaultAgentId === -1) {
    throw new Error("Agent index not found");
  }

  const account = getOperatorAccount();
  const walletClient = getOperatorWalletClient();

  const agent = new BaseAgent(
    agentData.id,
    vaultAgentId,
    agentData.strategy,
    agentData.name,
    publicClient as PublicClient,
    walletClient,
    account
  );

  await agent.runCycle();
}
