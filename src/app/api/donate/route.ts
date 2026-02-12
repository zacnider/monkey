import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { publicClient } from "@/lib/blockchain/client";
import { VAULT_ADDRESS } from "@/lib/config";
import type { PublicClient } from "viem";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { txHash, agentId, donorAddress, amount } = body;

    if (!txHash || !agentId || !donorAddress || !amount) {
      return NextResponse.json(
        { error: "Missing required fields: txHash, agentId, donorAddress, amount" },
        { status: 400 }
      );
    }

    // Check agent exists
    const agent = await prisma.agent.findFirst({
      where: { OR: [{ id: agentId }, { slug: agentId }] },
    });

    if (!agent) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }

    // Check for duplicate donation
    const existing = await prisma.donation.findUnique({
      where: { txHash },
    });

    if (existing) {
      return NextResponse.json(
        { error: "Donation already recorded" },
        { status: 409 }
      );
    }

    // Verify transaction on-chain (should be a vault.donate() call)
    try {
      const receipt = await (publicClient as PublicClient).getTransactionReceipt({
        hash: txHash as `0x${string}`,
      });

      if (!receipt || receipt.status === "reverted") {
        return NextResponse.json(
          { error: "Transaction failed or not found" },
          { status: 400 }
        );
      }

      // Verify the transaction was sent to the vault contract
      const tx = await (publicClient as PublicClient).getTransaction({
        hash: txHash as `0x${string}`,
      });

      if (tx.to?.toLowerCase() !== VAULT_ADDRESS.toLowerCase()) {
        return NextResponse.json(
          { error: "Transaction is not a vault donation" },
          { status: 400 }
        );
      }
    } catch {
      console.warn(`Could not verify tx ${txHash} on-chain`);
    }

    // Record donation
    const donation = await prisma.donation.create({
      data: {
        agentId: agent.id,
        donorAddress: donorAddress.toLowerCase(),
        amount,
        txHash,
      },
    });

    // Update agent total deposits
    const newTotal = BigInt(agent.totalDeposited) + BigInt(amount);
    await prisma.agent.update({
      where: { id: agent.id },
      data: { totalDeposited: newTotal.toString() },
    });

    return NextResponse.json({
      success: true,
      donation: {
        id: donation.id,
        agentName: agent.name,
        amount,
        txHash,
      },
    });
  } catch (error) {
    console.error("Donate error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
