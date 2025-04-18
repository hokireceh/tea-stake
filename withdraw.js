import { ethers } from "ethers";
import dotenv from "dotenv";
import chalk from "chalk";
import boxen from "boxen";

dotenv.config();

const RPC_URL = process.env.RPC_URL;
const PRIVATE_KEY = process.env.PRIVATE_KEY;
const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS;
const AMOUNT_TO_WITHDRAW = process.argv[2] || "1.0";

// Gas fee manual (metaMask style)
const baseMaxFeeGwei = 7397;
const basePriorityGwei = 3.80132;

let maxFeePerGas = ethers.parseUnits((baseMaxFeeGwei * 1.15).toFixed(2), "gwei");
let maxPriorityFeePerGas = ethers.parseUnits((basePriorityGwei * 1.15).toFixed(6), "gwei");
const gasLimit = 100000n;

const provider = new ethers.JsonRpcProvider(RPC_URL);
const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
const contract = new ethers.Contract(CONTRACT_ADDRESS, ["function withdraw(uint256 amount) public"], wallet);

// Fungsi format Gwei
const gwei = (wei) => Number(ethers.formatUnits(wei, "gwei")).toFixed(2) + " Gwei";

// Cek pending tx
async function isPendingTx(address) {
  const txs = await provider.send("txpool_content", []);
  const pending = txs?.pending?.[address.toLowerCase()];
  return pending && Object.keys(pending).length > 0;
}

async function withdrawTea() {
  try {
    const amount = ethers.parseEther(AMOUNT_TO_WITHDRAW);
    const nonce = await provider.getTransactionCount(wallet.address, "pending");

    console.log(chalk.cyan("✅ Ndelok pending dhisik rek..."));
    const pending = await isPendingTx(wallet.address);
    if (pending) {
      console.log(chalk.red("❌ Isih ana transaksi pending. Enteni sek!"));
      return;
    }
    console.log(chalk.green("✅ Ora ana pending, lanjut tarik pol!\n"));

    const display = boxen(
      `
${chalk.bold.yellowBright("💸 TARIK DUIT MODE WES ON 🔥")}

${chalk.gray("👤 Dompet    ")} : ${chalk.green(wallet.address)}
${chalk.gray("📍 Kontrak   ")} : ${chalk.cyan(CONTRACT_ADDRESS)}
${chalk.gray("💰 Tarik     ")} : ${chalk.magenta(AMOUNT_TO_WITHDRAW)} TEA
${chalk.gray("🔢 Nonce     ")} : ${chalk.gray(nonce)}
${chalk.gray("⛽ MaxFee    ")} : ${chalk.blueBright(maxFeePerGas.toString())} (${gwei(maxFeePerGas)})
${chalk.gray("⛽ Prioritas ")} : ${chalk.blueBright(maxPriorityFeePerGas.toString())} (${gwei(maxPriorityFeePerGas)})
${chalk.gray("📏 GasLimit  ")} : ${chalk.yellow(gasLimit.toString())}
`,
      {
        padding: 1,
        borderStyle: "round",
        borderColor: "yellowBright",
        backgroundColor: "#1e1e1e",
      }
    );
    console.log(display);

    let tx;
    try {
      tx = await contract.withdraw(amount, {
        gasLimit,
        nonce,
        maxFeePerGas,
        maxPriorityFeePerGas,
        type: 2,
      });
    } catch (err) {
      if (err.code === "UNKNOWN_ERROR" && err.message.includes("already known")) {
        console.log(chalk.yellow("⚠️  TX wis tau dikirim! Nyoba maneh karo fee luwih dhuwur..."));

        maxFeePerGas = maxFeePerGas * 120n / 100n;
        maxPriorityFeePerGas = maxPriorityFeePerGas * 120n / 100n;

        tx = await contract.withdraw(amount, {
          gasLimit,
          nonce,
          maxFeePerGas,
          maxPriorityFeePerGas,
          type: 2,
        });
      } else {
        throw err;
      }
    }

    const explorerUrl = `https://sepolia.tea.xyz/tx/${tx.hash}`;

    console.log(`
${chalk.greenBright("✅ Transaksi wis mlayu karo sukses!")} 🚀
🔗 ${chalk.gray("TX Hash    :")} ${chalk.cyan(tx.hash)}
🌐 ${chalk.gray("Explorer   :")} ${chalk.underline.blue(explorerUrl)}\n`);

    await tx.wait(1);
    console.log(chalk.bgGreen.black("🎉 Transaksi wis confirmed rek!"));

  } catch (err) {
    console.error(
      boxen(`❌ Kacau rek! Ana error:\n${err?.message || err}`, {
        padding: 1,
        borderStyle: "double",
        borderColor: "red",
      })
    );
  }
}

withdrawTea();
