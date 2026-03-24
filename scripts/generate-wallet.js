/**
 * CallFi — New EVM Wallet Generator
 * Run: node scripts/generate-wallet.js
 *
 * Creates a fresh random wallet and prints the private key + address.
 * Use this to create your deployer wallet, then fund it from the faucet.
 */

const { ethers } = require("ethers");

const wallet = ethers.Wallet.createRandom();

console.log("\n╔══════════════════════════════════════════════════════════════╗");
console.log("║              NEW EVM WALLET GENERATED                       ║");
console.log("╠══════════════════════════════════════════════════════════════╣");
console.log(`║  Address     : ${wallet.address}  ║`);
console.log(`║  Private Key : ${wallet.privateKey}  ║`);
console.log(`║  Mnemonic    : ${wallet.mnemonic.phrase.slice(0, 48)}...  ║`);
console.log("╠══════════════════════════════════════════════════════════════╣");
console.log("║  NEXT STEPS:                                                 ║");
console.log("║  1. Copy the Private Key into .env as DEPLOYER_PRIVATE_KEY  ║");
console.log("║  2. Fund the Address from Somnia faucet:                    ║");
console.log("║     https://testnet.somnia.network/faucet                   ║");
console.log("║  3. Run: npm run deploy:somnia                               ║");
console.log("╚══════════════════════════════════════════════════════════════╝\n");

console.log("⚠️  Save these somewhere safe. This won't be shown again.\n");
