/**
 * CallFi v3 — Deploy Script
 * ──────────────────────────────────────────────────────────────────────────
 * Steps:
 *   1. npm run wallet           → generate a deployer wallet
 *   2. Fund it at https://testnet.somnia.network/faucet
 *   3. Add DEPLOYER_PRIVATE_KEY to .env
 *   4. npm run deploy:somnia
 *
 * Users pay their own gas — no relayer needed.
 */

require("dotenv").config();
const { ethers } = require("hardhat");
const fs         = require("fs");
const path       = require("path");

async function main() {
  const [deployer] = await ethers.getSigners();
  const balance    = await ethers.provider.getBalance(deployer.address);

  console.log("\n╔══════════════════════════════════════════════════════════════╗");
  console.log("║                  CALLFI v3 DEPLOYMENT                       ║");
  console.log("╠══════════════════════════════════════════════════════════════╣");
  console.log(`║  Deployer : ${deployer.address}  ║`);
  console.log(`║  Balance  : ${ethers.formatEther(balance).padEnd(10)} STT                                  ║`);
  console.log("╚══════════════════════════════════════════════════════════════╝\n");

  if (balance === 0n) {
    console.error("❌  Deployer has 0 STT. Fund it first:");
    console.error("    https://testnet.somnia.network/faucet\n");
    process.exit(1);
  }

  // ── Deploy ───────────────────────────────────────────────────────────────
  console.log("   Compiling & deploying CallFi.sol...\n");

  const CallFi = await ethers.getContractFactory("CallFi");
  const callFi = await CallFi.deploy();           // no constructor args
  await callFi.waitForDeployment();

  const address = await callFi.getAddress();
  const txHash  = callFi.deploymentTransaction()?.hash ?? "—";

  console.log("╔══════════════════════════════════════════════════════════════╗");
  console.log("║                 ✅  DEPLOYED SUCCESSFULLY                    ║");
  console.log("╠══════════════════════════════════════════════════════════════╣");
  console.log(`║  Contract : ${address}  ║`);
  console.log(`║  Tx Hash  : ${txHash.slice(0,20)}...  ║`);
  console.log("╚══════════════════════════════════════════════════════════════╝\n");

  // ── Save deployed.json ───────────────────────────────────────────────────
  const out = {
    network:    "somnia_testnet",
    chainId:    50312,
    callFi:     address,
    txHash,
    deployer:   deployer.address,
    deployedAt: new Date().toISOString(),
  };

  const outPath = path.join(__dirname, "../deployed.json");
  fs.writeFileSync(outPath, JSON.stringify(out, null, 2));
  console.log("   📄 Saved to deployed.json\n");

  // ── Print Vercel env vars ─────────────────────────────────────────────────
  console.log("   ─── Add these to Vercel environment variables ───────────────");
  console.log(`\n   NEXT_PUBLIC_CALLFI_ADDRESS=${address}`);
  console.log(`   NEXT_PUBLIC_WC_PROJECT_ID=<get from cloud.walletconnect.com>\n`);
  console.log("   ─────────────────────────────────────────────────────────────\n");
}

main().catch((e) => {
  console.error("\n❌  Deploy failed:", e.message);
  process.exit(1);
});
