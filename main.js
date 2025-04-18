import inquirer from "inquirer";
import { spawn } from "child_process";
import dotenv from "dotenv";
import { ethers } from "ethers";
import chalk from "chalk";
import figlet from "figlet";
import gradient from "gradient-string";
import axios from "axios";

dotenv.config();

const DEFAULT_AMOUNT = process.env.DEFAULT_AMOUNT || "1.0";
const RPC_URL = process.env.RPC_URL;
const PRIVATE_KEY = process.env.PRIVATE_KEY;
const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS;
const WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL;

// Kontrak opsional
const ABI = [
  // "function userInfo(address) view returns (uint256 amount, uint256 rewardDebt)"
];

// 🧠 Delay helper
const delay = (ms) => new Promise((r) => setTimeout(r, ms));

// 🎯 Kirim log ke Discord
async function sendDiscordLog(message, type = "info", extra = "") {
  if (!WEBHOOK_URL) return;

  const statusMap = {
    info: { emoji: "ℹ️", color: 3447003 },
    success: { emoji: "✅", color: 3066993 },
    error: { emoji: "❌", color: 15158332 },
    warn: { emoji: "⚠️", color: 15844367 }
  };

  const { emoji, color } = statusMap[type] || statusMap.info;

  const embed = {
    title: `${emoji} ${message}`,
    description: extra,
    color,
    timestamp: new Date().toISOString(),
    footer: { text: "Stake TEA Bot - by HokiReceh" }
  };

  try {
    await axios.post(WEBHOOK_URL, { embeds: [embed] });
  } catch (err) {
    console.error("Gagal kirim log ke Discord:", err.message);
  }
}

// 🪙 Tampilkan saldo wallet
async function checkWalletStatus(showStakeInfo = false) {
  try {
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
    const address = wallet.address;
    const balance = await provider.getBalance(address);
    const teaBalance = ethers.formatEther(balance);

    console.clear();
    console.log(gradient.pastel(figlet.textSync("Stake TEA", { horizontalLayout: "full" })));
    console.log(chalk.gray("by HokiReceh ✨\n"));
    console.log(`${chalk.cyan("🧾 Wallet:")} ${chalk.white(address)}`);
    console.log(`${chalk.green("💰 Saldo :")} ${chalk.bold(`${teaBalance} TEA`)}`);

    if (showStakeInfo && ABI.length > 0) {
      const contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, provider);
      const userInfo = await contract.userInfo(address);
      const staked = ethers.formatEther(userInfo.amount);
      console.log(`${chalk.yellow("📥 Di-Stake :")} ${chalk.bold(`${staked} TEA`)}`);
    }

    console.log(); // newline

    await sendDiscordLog("Wallet dicek", "info", `**Address:** \`${address}\`\n**Saldo:** \`${teaBalance} TEA\``);
  } catch (err) {
    console.log(chalk.red("❌ Gagal ambil data saldo:"), chalk.gray(err.message));
    await sendDiscordLog("Gagal ambil saldo", "error", err.message);
  }
}

// ▶️ Eksekusi script
function runScript(script, amount, callback) {
  const child = spawn("node", [script, amount], { stdio: "inherit" });

  child.on("close", async (code) => {
    const status = code === 0 ? "success" : "error";
    const emoji = code === 0 ? "✅" : "❌";
    await sendDiscordLog(
      `Script ${script.replace(".js", "")} selesai`,
      status,
      `${emoji} **Jumlah:** \`${amount} TEA\`\n📄 **Script:** \`${script}\`\n📦 **Status:** \`${code === 0 ? "SUKSES" : "GAGAL"}\``
    );
    callback();
  });
}

// 🔁 Looping script
async function loopScript(script) {
  console.log(chalk.blue(`🔁 Loop ${script.replace(".js", "")} dimulai. Tekan Ctrl+C untuk keluar.`));
  await sendDiscordLog(`Loop ${script.replace(".js", "")} dimulai`, "info");

  let isRunning = true;

  const handleSigInt = async () => {
    console.log(chalk.yellow("\n⏹️  Loop dihentikan. Kembali ke menu...\n"));
    await sendDiscordLog(`Loop ${script.replace(".js", "")} dihentikan`, "warn");
    isRunning = false;
    process.off("SIGINT", handleSigInt);
    mainMenu();
  };

  process.on("SIGINT", handleSigInt);

  while (isRunning) {
    await new Promise(resolve => runScript(script, DEFAULT_AMOUNT, resolve));
    if (!isRunning) break;
    await delay(3000);
  }
}

// 🚀 Menu utama
async function mainMenu() {
  await checkWalletStatus();

  try {
    const { action } = await inquirer.prompt([
      {
        type: "list",
        name: "action",
        message: chalk.magentaBright("🚀 Pilih aksi yang ingin dijalankan:"),
        choices: [
          "▶️  Jalankan stake (default 1.0 TEA)",
          "💸  Jalankan withdraw (default 1.0 TEA)",
          "🧮  Manual stake (input jumlah)",
          "📤  Manual withdraw (input jumlah)",
          "🔁  Loop stake",
          "🔁  Loop withdraw",
          "❌  Keluar"
        ]
      }
    ]);

    switch (action) {
      case "▶️  Jalankan stake (default 1.0 TEA)":
        runScript("stake.js", DEFAULT_AMOUNT, mainMenu);
        break;
      case "💸  Jalankan withdraw (default 1.0 TEA)":
        runScript("withdraw.js", DEFAULT_AMOUNT, mainMenu);
        break;
      case "🧮  Manual stake (input jumlah)":
        const { stakeAmount } = await inquirer.prompt([
          {
            type: "input",
            name: "stakeAmount",
            message: chalk.cyan("💰 Masukkan jumlah TEA untuk stake:"),
            validate: (val) => (!isNaN(val) && parseFloat(val) > 0) || "Masukkan angka valid"
          }
        ]);
        runScript("stake.js", stakeAmount, mainMenu);
        break;
      case "📤  Manual withdraw (input jumlah)":
        const { withdrawAmount } = await inquirer.prompt([
          {
            type: "input",
            name: "withdrawAmount",
            message: chalk.cyan("💸 Masukkan jumlah TEA untuk withdraw:"),
            validate: (val) => (!isNaN(val) && parseFloat(val) > 0) || "Masukkan angka valid"
          }
        ]);
        runScript("withdraw.js", withdrawAmount, mainMenu);
        break;
      case "🔁  Loop stake":
        loopScript("stake.js");
        break;
      case "🔁  Loop withdraw":
        loopScript("withdraw.js");
        break;
      case "❌  Keluar":
        console.log(chalk.gray("👋 Sampai jumpa, bos."));
        await sendDiscordLog("Bot ditutup", "warn");
        process.exit();
        break;
    }
  } catch (err) {
    console.log(chalk.red("❌ Terjadi error:"), err.message);
    await sendDiscordLog("Terjadi error di main menu", "error", err.message);
  }
}

mainMenu();
