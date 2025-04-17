import inquirer from "inquirer";
import { spawn } from "child_process";
import dotenv from "dotenv";
import { ethers } from "ethers";
import chalk from "chalk";
import figlet from "figlet";
import gradient from "gradient-string";
dotenv.config();

const DEFAULT_AMOUNT = process.env.DEFAULT_AMOUNT || "1.0";
const RPC_URL = process.env.RPC_URL;
const PRIVATE_KEY = process.env.PRIVATE_KEY;
const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS;

// Kontrak opsional, aktifkan kalau sudah verif
const ABI = [
  // "function userInfo(address) view returns (uint256 amount, uint256 rewardDebt)"
];

// 🧠 Fungsi util buat format & delay
const delay = (ms) => new Promise((r) => setTimeout(r, ms));

// 🪙 Tampilkan header saldo wallet
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

    console.log(); // new line
  } catch (err) {
    console.log(chalk.red("❌ Gagal ambil data saldo:"), chalk.gray(err.message));
    console.log();
  }
}

// ▶️ Eksekusi file stake/withdraw
function runScript(script, amount, callback) {
  const child = spawn("node", [script, amount], { stdio: "inherit" });
  child.on("close", (code) => {
    if (code !== 0) console.log(chalk.red(`❌ Script ${script} keluar dengan kode ${code}`));
    callback();
  });
}

// 🔁 Jalankan loop stake/withdraw
async function loopScript(script) {
  console.log(chalk.blue(`🔁 Loop ${script.replace(".js", "")} dimulai. Tekan Ctrl+C untuk keluar.`));

  let isRunning = true;
  const handleSigInt = () => {
    console.log(chalk.yellow("\n⏹️  Loop dihentikan. Kembali ke menu...\n"));
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
  await checkWalletStatus(); // tampilkan saldo duluan

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
        process.exit();
        break;
    }
  } catch (err) {
    console.log(chalk.red("❌ Terjadi error:"), err.message);
  }
}

mainMenu();
