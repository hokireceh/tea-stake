import { ethers } from "ethers";
import dotenv from "dotenv";
import chalk from "chalk";
import boxen from "boxen";

dotenv.config();

const RPC_URL = process.env.RPC_URL;
const PRIVATE_KEY = process.env.PRIVATE_KEY;
const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS;
const AMOUNT_TO_STAKE = process.argv[2] || "1.0";

// Gas fee metaMask-style (manual)
const baseMaxFeeGwei = 7397;
const basePriorityGwei = 3.80132;

let maxFeePerGas = ethers.parseUnits((baseMaxFeeGwei * 1.15).toFixed(2), "gwei");
let maxPriorityFeePerGas = ethers.parseUnits((basePriorityGwei * 1.15).toFixed(6), "gwei");
const gasLimit = 70859n;

const provider = new ethers.JsonRpcProvider(RPC_URL);
const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
const contract = new ethers.Contract(CONTRACT_ADDRESS, ["function stake() public payable"], wallet);

async function isPendingTx(address) {
  const txs = await provider.send("txpool_content", []);
  const pending = txs?.pending?.[address.toLowerCase()];
  return pending && Object.keys(pending).length > 0;
}

async function stake() {
  try {
    const value = ethers.parseEther(AMOUNT_TO_STAKE);
    const nonce = await provider.getTransactionCount(wallet.address, "pending");

    // Cek pending dhisik
    console.log(chalk.cyan("✅ Ndelok pending dhisik rek..."));
    const pending = await isPendingTx(wallet.address);
    if (pending) {
      console.log(chalk.red("❌ Isih ana transaksi pending. Enteni sek!"));
      return;
    }
    console.log(chalk.green("✅ Ora ana pending, lanjut gas pol!\n"));

    // Format gas fee info
    const gwei = (wei) => (Number(ethers.formatUnits(wei, "gwei")).toFixed(2) + " Gwei");

    // Tampilan info gas lan detail staking
    const display = boxen(
      `
${chalk.bold.greenBright("💥 MODE STAKE BOOSTED (Anti Pending)")}

${chalk.gray("👤 Dompet    ")} : ${chalk.green(wallet.address)}
${chalk.gray("📍 Kontrak   ")} : ${chalk.cyan(CONTRACT_ADDRESS)}
${chalk.gray("💰 Jumlah    ")} : ${chalk.magenta(AMOUNT_TO_STAKE)} TEA
${chalk.gray("🔢 Nonce     ")} : ${chalk.gray(nonce)}
${chalk.gray("⛽ MaxFee    ")} : ${chalk.blueBright(maxFeePerGas.toString())} (${gwei(maxFeePerGas)})
${chalk.gray("⛽ Prioritas ")} : ${chalk.blueBright(maxPriorityFeePerGas.toString())} (${gwei(maxPriorityFeePerGas)})
${chalk.gray("📏 GasLimit  ")} : ${chalk.yellow(gasLimit.toString())}
`,
      {
        padding: 1,
        borderStyle: "round",
        borderColor: "greenBright",
        backgroundColor: "#1e1e1e",
      }
    );
    console.log(display);

    let tx;
    try {
      tx = await contract.stake({
        value,
        gasLimit,
        nonce,
        maxFeePerGas,
        maxPriorityFeePerGas,
        type: 2,
      });
    } catch (err) {
      if (err.code === "UNKNOWN_ERROR" && err.message.includes("already known")) {
        console.log(chalk.yellow("⚠️  TX already known! Nyoba resend karo fee luwih dhuwur..."));

        maxFeePerGas = maxFeePerGas * 120n / 100n;
        maxPriorityFeePerGas = maxPriorityFeePerGas * 120n / 100n;

        tx = await contract.stake({
          value,
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

    const explorerLink = `https://sepolia.tea.xyz/tx/${tx.hash}`;
    
    console.log(
      boxen(
        `${chalk.greenBright("✅ Transaksi wis mlayu karo sukses!")} 🚀`,
        {
          padding: 1,
          borderStyle: "classic",
          borderColor: "cyan",
        }
      )
    );
    
    // Tampilkan TX hash & explorer nang luar boxen
    console.log(chalk.gray("🔗 TX Hash    : ") + chalk.cyan(tx.hash));
    console.log(chalk.gray("🌐 Explorer   : ") + chalk.underline.blue(`https://sepolia.tea.xyz/tx/${tx.hash}`));

    await tx.wait();
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

stake();
