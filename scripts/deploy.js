const { ethers } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying MonkeyVault with account:", deployer.address);

  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("Account balance:", ethers.formatEther(balance), "MON");

  // Monad Mainnet addresses
  const BONDING_CURVE_ROUTER = "0x6F6B8F1a20703309951a5127c45B49b1CD981A22";
  const LENS = "0x7e78A8DE94f21804F7a17F4E8BF9EC2c872187ea";
  const MKEY_TOKEN = "0xf70ED26B7c425481b365CD397E6b425805B27777";
  const OPERATOR = deployer.address;

  console.log("\nConstructor args:");
  console.log("  BondingCurveRouter:", BONDING_CURVE_ROUTER);
  console.log("  Lens:", LENS);
  console.log("  MKEY Token:", MKEY_TOKEN);
  console.log("  Operator:", OPERATOR);

  const MonkeyVault = await ethers.getContractFactory("MonkeyVault");
  const vault = await MonkeyVault.deploy(
    BONDING_CURVE_ROUTER,
    LENS,
    MKEY_TOKEN,
    OPERATOR
  );

  await vault.waitForDeployment();
  const vaultAddress = await vault.getAddress();

  console.log("\n========================================");
  console.log("MonkeyVault deployed to:", vaultAddress);
  console.log("========================================");
  console.log("\nUpdate your .env file:");
  console.log(`NEXT_PUBLIC_VAULT_ADDRESS=${vaultAddress}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
