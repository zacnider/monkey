export const monkeyVaultAbi = [
  // ─── Donations ─────────────────────────────────────────
  {
    name: "donate",
    type: "function",
    stateMutability: "payable",
    inputs: [{ name: "agentId", type: "uint8" }],
    outputs: [],
  },
  // ─── Trading ───────────────────────────────────────────
  {
    name: "executeBuy",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "agentId", type: "uint8" },
      { name: "token", type: "address" },
      { name: "amountIn", type: "uint256" },
      { name: "amountOutMin", type: "uint256" },
      { name: "deadline", type: "uint256" },
    ],
    outputs: [{ name: "amountOut", type: "uint256" }],
  },
  {
    name: "executeSell",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "agentId", type: "uint8" },
      { name: "token", type: "address" },
      { name: "amountIn", type: "uint256" },
      { name: "amountOutMin", type: "uint256" },
      { name: "deadline", type: "uint256" },
    ],
    outputs: [{ name: "amountOut", type: "uint256" }],
  },
  // ─── Claiming ──────────────────────────────────────────
  {
    name: "claimEarnings",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [{ name: "agentId", type: "uint8" }],
    outputs: [],
  },
  {
    name: "claimAllEarnings",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [],
    outputs: [],
  },
  // ─── View Functions ────────────────────────────────────
  {
    name: "getAgentInfo",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "agentId", type: "uint8" }],
    outputs: [
      { name: "isActive", type: "bool" },
      { name: "balance", type: "uint256" },
      { name: "totalDonated", type: "uint256" },
      { name: "totalPnl", type: "int256" },
      { name: "mkeyBalance", type: "uint256" },
      { name: "totalDistributed", type: "uint256" },
      { name: "tradeCount", type: "uint256" },
    ],
  },
  {
    name: "getDonorInfo",
    type: "function",
    stateMutability: "view",
    inputs: [
      { name: "agentId", type: "uint8" },
      { name: "donor", type: "address" },
    ],
    outputs: [
      { name: "totalDonated", type: "uint256" },
      { name: "totalClaimed", type: "uint256" },
      { name: "pendingEarnings", type: "uint256" },
    ],
  },
  {
    name: "getPendingEarnings",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "donor", type: "address" }],
    outputs: [{ name: "total", type: "uint256" }],
  },
  {
    name: "getDonorCount",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "agentId", type: "uint8" }],
    outputs: [{ type: "uint256" }],
  },
  {
    name: "getAgentHolding",
    type: "function",
    stateMutability: "view",
    inputs: [
      { name: "agentId", type: "uint8" },
      { name: "token", type: "address" },
    ],
    outputs: [
      { name: "amount", type: "uint256" },
      { name: "costBasis", type: "uint256" },
    ],
  },
  {
    name: "getTotalMkeyHeld",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "total", type: "uint256" }],
  },
  {
    name: "getPlatformStats",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [
      { name: "totalBalance", type: "uint256" },
      { name: "totalPnl", type: "int256" },
      { name: "totalDonated", type: "uint256" },
      { name: "totalDistributed", type: "uint256" },
      { name: "totalMkey", type: "uint256" },
      { name: "totalTrades", type: "uint256" },
      { name: "activeAgents", type: "uint8" },
    ],
  },
  // ─── Admin ─────────────────────────────────────────────
  {
    name: "setOperator",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [{ name: "_operator", type: "address" }],
    outputs: [],
  },
  {
    name: "setAgent",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "agentId", type: "uint8" },
      { name: "active", type: "bool" },
    ],
    outputs: [],
  },
  // ─── State Variables ───────────────────────────────────
  {
    name: "owner",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "address" }],
  },
  {
    name: "operator",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "address" }],
  },
  {
    name: "MAX_AGENTS",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "uint8" }],
  },
  // ─── Events ────────────────────────────────────────────
  {
    name: "Donated",
    type: "event",
    inputs: [
      { name: "agentId", type: "uint8", indexed: true },
      { name: "donor", type: "address", indexed: true },
      { name: "amount", type: "uint256", indexed: false },
    ],
  },
  {
    name: "TradeExecuted",
    type: "event",
    inputs: [
      { name: "agentId", type: "uint8", indexed: true },
      { name: "token", type: "address", indexed: true },
      { name: "isBuy", type: "bool", indexed: false },
      { name: "amountIn", type: "uint256", indexed: false },
      { name: "amountOut", type: "uint256", indexed: false },
    ],
  },
  {
    name: "ProfitDistributed",
    type: "event",
    inputs: [
      { name: "agentId", type: "uint8", indexed: true },
      { name: "donorPool", type: "uint256", indexed: false },
      { name: "mkeyAmount", type: "uint256", indexed: false },
    ],
  },
  {
    name: "EarningsClaimed",
    type: "event",
    inputs: [
      { name: "agentId", type: "uint8", indexed: true },
      { name: "donor", type: "address", indexed: true },
      { name: "amount", type: "uint256", indexed: false },
    ],
  },
  {
    name: "MkeyPurchased",
    type: "event",
    inputs: [
      { name: "agentId", type: "uint8", indexed: true },
      { name: "monSpent", type: "uint256", indexed: false },
      { name: "mkeyReceived", type: "uint256", indexed: false },
    ],
  },
] as const;
