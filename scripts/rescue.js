const { ethers } = require("hardhat");

const OLD_VAULT = "0xfd9922e006D384eF1Af1e745265bb9c8a146c314";

// Old vault ABI (minimal)
const VAULT_ABI = [
  "function updateContracts(address _bondingCurveRouter, address _lens, address _mkeyToken) external",
  "function executeBuy(uint8 agentId, address token, uint256 amountIn, uint256 amountOutMin, uint256 deadline) external returns (uint256)",
  "function getAgentInfo(uint8 agentId) external view returns (bool isActive, uint256 balance, uint256 totalDonated, int256 totalPnl, uint256 mkeyBalance, uint256 totalDistributed, uint256 tradeCount)",
  "function owner() external view returns (address)",
];

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Rescue operator:", deployer.address);

  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("Operator balance:", ethers.formatEther(balance), "MON");

  // Check old vault balance
  const vaultBalance = await ethers.provider.getBalance(OLD_VAULT);
  console.log("Old vault balance:", ethers.formatEther(vaultBalance), "MON");

  if (vaultBalance === 0n) {
    console.log("Old vault is empty, nothing to rescue.");
    return;
  }

  // 1. Deploy VaultRescue
  console.log("\n1. Deploying VaultRescue...");
  const VaultRescue = await ethers.getContractFactory("VaultRescue");
  const rescue = await VaultRescue.deploy();
  await rescue.waitForDeployment();
  const rescueAddr = await rescue.getAddress();
  console.log("   VaultRescue deployed:", rescueAddr);

  // 2. Update old vault's Lens to rescue contract
  console.log("\n2. Updating old vault Lens to rescue contract...");
  const oldVault = new ethers.Contract(OLD_VAULT, VAULT_ABI, deployer);

  const owner = await oldVault.owner();
  console.log("   Old vault owner:", owner);
  console.log("   Deployer:", deployer.address);

  if (owner.toLowerCase() !== deployer.address.toLowerCase()) {
    console.error("ERROR: Deployer is not the owner of old vault!");
    return;
  }

  const tx1 = await oldVault.updateContracts(
    ethers.ZeroAddress, // don't change router
    rescueAddr,         // change lens to rescue
    ethers.ZeroAddress  // don't change mkey
  );
  await tx1.wait();
  console.log("   Lens updated to rescue contract");

  // 3. Execute "buy" for each agent with balance (sends MON to rescue)
  console.log("\n3. Rescuing MON from each agent...");
  const DUMMY_TOKEN = "0x0000000000000000000000000000000000000001";
  const deadline = BigInt(Math.floor(Date.now() / 1000) + 600);
  let totalRescued = 0n;

  for (let i = 0; i < 8; i++) {
    const info = await oldVault.getAgentInfo(i);
    const agentBalance = info[1]; // balance field
    const names = ["Alpha Hunter", "Diamond Hands", "Swing Trader", "Degen Ape", "Volume Watcher", "Trend Follower", "Contrarian", "Sniper"];

    if (agentBalance === 0n) {
      console.log(`   Agent ${i} (${names[i]}): 0 MON - skip`);
      continue;
    }

    console.log(`   Agent ${i} (${names[i]}): ${ethers.formatEther(agentBalance)} MON - rescuing...`);

    try {
      const tx = await oldVault.executeBuy(i, DUMMY_TOKEN, agentBalance, 0, deadline);
      await tx.wait();
      totalRescued += agentBalance;
      console.log(`   ✓ Rescued ${ethers.formatEther(agentBalance)} MON`);
    } catch (e) {
      console.log(`   ✗ Failed: ${e.message.substring(0, 100)}`);
    }
  }

  console.log(`\n   Total rescued: ${ethers.formatEther(totalRescued)} MON`);

  // 4. Withdraw from rescue contract
  console.log("\n4. Withdrawing from rescue contract...");
  const rescueBalance = await ethers.provider.getBalance(rescueAddr);
  console.log(`   Rescue contract balance: ${ethers.formatEther(rescueBalance)} MON`);

  if (rescueBalance > 0n) {
    const tx2 = await rescue.withdraw();
    await tx2.wait();
    console.log("   ✓ Withdrawn to operator wallet");
  }

  // Final check
  const newBalance = await ethers.provider.getBalance(deployer.address);
  console.log(`\nOperator balance after: ${ethers.formatEther(newBalance)} MON`);
  const oldVaultFinal = await ethers.provider.getBalance(OLD_VAULT);
  console.log(`Old vault balance after: ${ethers.formatEther(oldVaultFinal)} MON`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
