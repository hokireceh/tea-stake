import { ethers } from "ethers";
import dotenv from "dotenv";
dotenv.config();

const RPC_URL = process.env.RPC_URL;
const PRIVATE_KEY = process.env.PRIVATE_KEY;
const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS;
const AMOUNT_TO_STAKE = process.argv[2] || process.env.STAKE_AMOUNT || "1.0";

const ABI = ["function stake() public payable"];

const provider = new ethers.JsonRpcProvider(RPC_URL);
const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
const contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, wallet);

// 🚀 Gas cepat mode: full priority = baseFee (metamask-style)
async function getFastFee() {
  const result = await provider.send("eth_feeHistory", ["0x5", "latest", [50]]);
  const baseFee = ethers.toBigInt(result.baseFeePerGas.slice(-1)[0]);
  const priority = baseFee; // full baseFee as tip
  const maxFee = baseFee + priority;
  return { baseFee, priority, maxFee };
}

async function stakeTea() {
  try {
    const value = ethers.parseEther(AMOUNT_TO_STAKE);
    if (value === 0n) throw new Error("Jumlah staking tidak boleh nol.");

    const { baseFee, priority, maxFee } = await getFastFee();
    const nonce = await provider.getTransactionCount(wallet.address, "pending");

    console.log(`\n🚀 Mulai staking ${AMOUNT_TO_STAKE} TEA`);
    console.log(`📍 Kontrak: ${CONTRACT_ADDRESS}`);
    console.log("⚡ Konfigurasi Gas:");
    console.log(`   - Base Fee       : ${baseFee}`);
    console.log(`   - Priority Fee   : ${priority}`);
    console.log(`   - Max Fee        : ${maxFee}`);
    console.log(`   - Nonce          : ${nonce}\n`);

    let gasLimit;
    try {
      gasLimit = await contract.stake.estimateGas({ value });
    } catch {
      gasLimit = 80_000n;
      console.warn("⚠️ Estimasi gas gagal. Gunakan default 80,000");
    }

    const tx = await contract.stake({
      value,
      gasLimit,
      maxPriorityFeePerGas: priority,
      maxFeePerGas: maxFee,
      nonce,
    });

    console.log(`✅ TX terkirim!`);
    console.log(`🔗 TX Hash : ${tx.hash}`);
    console.log(`🌐 Explorer: https://sepolia.tea.xyz/tx/${tx.hash}\n`);

    // 💡 Tidak menunggu konfirmasi, langsung selesai

  } catch (err) {
    if (err.message?.includes("replacement transaction underpriced") || err.message?.includes("fee too low")) {
      console.error("⚠️ Gagal: Gas fee terlalu rendah. Coba naikkan priority fee.");
    } else {
      console.error("❌ Error staking:", err?.message || err);
    }
  }
}

stakeTea();
