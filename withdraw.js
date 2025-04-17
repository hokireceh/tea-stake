import { ethers } from "ethers";
import dotenv from "dotenv";
dotenv.config();

// Konfigurasi
const RPC_URL = process.env.RPC_URL;
const PRIVATE_KEY = process.env.PRIVATE_KEY;
const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS;
const AMOUNT_TO_WITHDRAW = process.argv[2] || "1.0";

// ABI dengan withdraw pakai amount
const ABI = [
  "function withdraw(uint256 amount) public"
];

const provider = new ethers.JsonRpcProvider(RPC_URL);
const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
const contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, wallet);

async function withdrawTea() {
  try {
    const amount = ethers.parseEther(AMOUNT_TO_WITHDRAW);
    const feeData = await provider.send("eth_feeHistory", [1, "latest", []]);

    const base = BigInt(feeData.baseFeePerGas?.[0] || 3e9); // default 3 gwei
    const priority = ethers.parseUnits("3", "gwei");
    const max = base + priority;
    const nonce = await provider.getTransactionCount(wallet.address);

    console.log(`🚀 Menarik ${AMOUNT_TO_WITHDRAW} TEA dari kontrak: ${CONTRACT_ADDRESS}`);
    console.log(`⚡ Gas Config:\n  base: '${base}'\n  priority: '${priority}'\n  max: '${max}'\n  nonce: ${nonce}\n`);

    const tx = await contract.withdraw(amount, {
      gasLimit: 100000,
      maxPriorityFeePerGas: priority,
      maxFeePerGas: max,
      nonce
    });

    console.log("⏳ TX dikirim, menunggu konfirmasi...");
    await tx.wait();
    console.log(`✅ Withdraw sukses! TX Hash: ${tx.hash}`);
  } catch (err) {
    console.error("❌ Gagal withdraw:", err);
  }
}

withdrawTea();
