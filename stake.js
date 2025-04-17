import { ethers } from "ethers";
import dotenv from "dotenv";
dotenv.config();

// Konfigurasi
const RPC_URL = process.env.RPC_URL;
const PRIVATE_KEY = process.env.PRIVATE_KEY;
const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS;
const AMOUNT_TO_STAKE = process.argv[2] || "1.0"; // Default kalau tidak dikirim argumen

// ABI minimal
const ABI = [
  "function stake() public payable"
];

// Provider & Wallet
const provider = new ethers.JsonRpcProvider(RPC_URL);
const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
const contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, wallet);

// Dapatkan gas fee cepat dari fee history
async function getFastFee() {
  const blockCount = 5;
  const percentiles = [50];
  const result = await provider.send("eth_feeHistory", [
    `0x${blockCount.toString(16)}`, "latest", percentiles
  ]);

  const baseFee = ethers.toBigInt(result.baseFeePerGas.slice(-1)[0]);
  const priority = ethers.parseUnits("3", "gwei"); // bisa dinaikkan kalau masih lambat
  const maxFee = baseFee + priority;

  return { baseFee, priority, maxFee };
}

async function stakeTea() {
  try {
    const value = ethers.parseEther(AMOUNT_TO_STAKE);
    const { baseFee, priority, maxFee } = await getFastFee();
    const nonce = await wallet.getNonce();

    console.log(`🚀 Staking ${AMOUNT_TO_STAKE} TEA ke ${CONTRACT_ADDRESS}`);
    console.log("⚡ Gas Config:");
    console.log(`  base: '${baseFee}'`);
    console.log(`  priority: '${priority}'`);
    console.log(`  max: '${maxFee}'`);
    console.log(`  nonce: ${nonce}\n`);

    const tx = await contract.stake({
      value,
      gasLimit: 150000,
      maxPriorityFeePerGas: priority,
      maxFeePerGas: maxFee,
      nonce
    });

    console.log("⏳ TX dikirim, menunggu konfirmasi...");
    await tx.wait();
    console.log(`✅ Sukses staking! TX Hash: ${tx.hash}`);
  } catch (err) {
    console.error("❌ Gagal staking:", err);
  }
}

stakeTea();
