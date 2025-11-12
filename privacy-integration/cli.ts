/**
 * Ghost Privacy - Clean CLI Interface
 * Privacy-preserving transactions on Solana
 */

import { Keypair, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { GhostPrivacySDK } from './privacy-sdk';
import * as readline from 'readline';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

// ANSI Color codes (Solana themed)
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',

  // Solana gradient colors
  purple: '\x1b[38;5;141m',      // Light purple
  violet: '\x1b[38;5;135m',      // Violet
  magenta: '\x1b[38;5;200m',     // Magenta
  cyan: '\x1b[38;5;51m',         // Cyan
  green: '\x1b[38;5;121m',       // Light green

  // Status colors
  success: '\x1b[38;5;121m',     // Green
  error: '\x1b[38;5;196m',       // Red
  warning: '\x1b[38;5;214m',     // Orange
  info: '\x1b[38;5;51m',         // Cyan

  // UI elements
  text: '\x1b[38;5;255m',        // White
  dimText: '\x1b[38;5;244m',     // Gray
  accent: '\x1b[38;5;141m',      // Purple accent
};

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

let sdk: GhostPrivacySDK;
let wallet: Keypair;
let currentOwner = 'default';

async function question(prompt: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

function clearScreen() {
  console.clear();
}

function printHeader() {
  console.log(`\n${colors.magenta}👻 GHOST PRIVACY${colors.reset} - Maximum Anonymity\n`);
}

function printBalance() {
  const balance = sdk.getBalance(currentOwner);
  const notes = sdk.getNotes(currentOwner);

  console.log(`${colors.dimText}┌────────────────────────────────────────────────────────┐${colors.reset}`);
  console.log(`${colors.dimText}│${colors.reset} ${colors.cyan}💰 Shielded Balance:${colors.reset} ${colors.bright}${colors.green}${balance.toFixed(4)} SOL${colors.reset}${colors.dimText}                  │${colors.reset}`);
  console.log(`${colors.dimText}│${colors.reset} ${colors.cyan}📝 Active Notes:${colors.reset}     ${colors.bright}${notes.length}${colors.reset}${colors.dimText}                                    │${colors.reset}`);
  console.log(`${colors.dimText}│${colors.reset} ${colors.cyan}👤 Identity:${colors.reset}         ${colors.bright}${colors.magenta}${currentOwner}${colors.reset}${colors.dimText}${' '.repeat(Math.max(0, 25 - currentOwner.length))}│${colors.reset}`);
  console.log(`${colors.dimText}└────────────────────────────────────────────────────────┘${colors.reset}`);
  console.log();
}

function printMenu() {
  console.log(`${colors.cyan}1.${colors.reset} Deposit`);
  console.log(`${colors.cyan}2.${colors.reset} Withdraw ${colors.dimText}(via Relayer)${colors.reset}`);
  console.log(`${colors.cyan}3.${colors.reset} Send ${colors.dimText}(via Relayer)${colors.reset}`);
  console.log(`${colors.cyan}4.${colors.reset} Private Transfer`);
  console.log(`${colors.cyan}5.${colors.reset} View Notes`);
  console.log(`${colors.cyan}6.${colors.reset} Change Identity`);
  console.log(`${colors.cyan}7.${colors.reset} Request Airdrop`);
  console.log(`${colors.cyan}8.${colors.reset} Exit\n`);
}

async function deposit() {
  console.log(`\n${colors.violet}═════════════════════════════════════════════════════════${colors.reset}`);
  console.log(`  ${colors.bright}${colors.cyan}💰 DEPOSIT TO SHIELDED POOL${colors.reset}`);
  console.log(`${colors.violet}═════════════════════════════════════════════════════════${colors.reset}\n`);

  const amountStr = await question(`${colors.text}Enter amount to deposit (SOL): ${colors.green}`);
  console.log(colors.reset);

  const amount = parseFloat(amountStr);

  if (isNaN(amount) || amount <= 0) {
    console.log(`${colors.error}❌ Invalid amount${colors.reset}\n`);
    return;
  }

  try {
    console.log(`${colors.info}⏳ Depositing ${amount} SOL...${colors.reset}`);
    const note = await sdk.deposit(wallet, amount, currentOwner);

    console.log(`\n${colors.success}✅ Deposit successful!${colors.reset}`);
    console.log(`${colors.dimText}Commitment: ${note.commitment.substring(0, 16)}...${colors.reset}`);
    console.log(`${colors.dimText}TX: ${note.txSignature?.substring(0, 16)}...${colors.reset}\n`);
  } catch (error: any) {
    console.log(`${colors.error}❌ Deposit failed: ${error.message}${colors.reset}\n`);
  }

  await question(`${colors.dimText}Press Enter to continue...${colors.reset}`);
}

async function withdraw() {
  console.log(`\n${colors.violet}═════════════════════════════════════════════════════════${colors.reset}`);
  console.log(`  ${colors.bright}${colors.cyan}🔓 WITHDRAW FROM POOL${colors.reset}`);
  console.log(`${colors.violet}═════════════════════════════════════════════════════════${colors.reset}\n`);

  const notes = sdk.getNotes(currentOwner);

  if (notes.length === 0) {
    console.log(`${colors.warning}⚠️  No notes available to withdraw${colors.reset}\n`);
    await question(`${colors.dimText}Press Enter to continue...${colors.reset}`);
    return;
  }

  console.log(`${colors.text}Available notes:${colors.reset}\n`);
  notes.forEach((note, i) => {
    console.log(`  ${colors.cyan}${i + 1}.${colors.reset} ${colors.green}${(note.amount / LAMPORTS_PER_SOL).toFixed(4)} SOL${colors.reset} ${colors.dimText}(${note.commitment.substring(0, 12)}...)${colors.reset}`);
  });
  console.log();

  const indexStr = await question(`${colors.text}Select note (1-${notes.length}): ${colors.green}`);
  console.log(colors.reset);

  const index = parseInt(indexStr) - 1;

  if (isNaN(index) || index < 0 || index >= notes.length) {
    console.log(`${colors.error}❌ Invalid selection${colors.reset}\n`);
    await question(`${colors.dimText}Press Enter to continue...${colors.reset}`);
    return;
  }

  const note = notes[index];
  const maxAmount = note.amount / LAMPORTS_PER_SOL;

  const amountStr = await question(`${colors.text}Enter amount to withdraw (max ${maxAmount} SOL): ${colors.green}`);
  console.log(colors.reset);

  const amount = parseFloat(amountStr);

  if (isNaN(amount) || amount <= 0 || amount > maxAmount) {
    console.log(`${colors.error}❌ Invalid amount${colors.reset}\n`);
    await question(`${colors.dimText}Press Enter to continue...${colors.reset}`);
    return;
  }

  const recipientStr = await question(`${colors.text}Recipient address (leave empty for your wallet): ${colors.green}`);
  console.log(colors.reset);

  const recipient = recipientStr.trim() ? new PublicKey(recipientStr) : wallet.publicKey;

  try {
    console.log(`\n${colors.dimText}Submitting via relayer...${colors.reset}`);
    const txSig = await sdk.withdrawViaRelayer(note, recipient, amount);

    console.log(`${colors.green}✅ Withdrawn ${amount} SOL${colors.reset}`);
    console.log(`${colors.dimText}TX: ${txSig}${colors.reset}\n`);
  } catch (error: any) {
    console.log(`${colors.error}❌ Withdrawal failed: ${error.message}${colors.reset}\n`);
    if (error.message.includes('relayer')) {
      console.log(`${colors.warning}💡 Tip: Make sure the relayer service is running!${colors.reset}`);
      console.log(`${colors.dimText}   Check: npx ts-node check-status.bat${colors.reset}\n`);
    }
  }

  await question(`${colors.dimText}Press Enter to continue...${colors.reset}`);
}

async function sendToWallet() {
  console.log(`\n${colors.violet}═════════════════════════════════════════════════════════${colors.reset}`);
  console.log(`  ${colors.bright}${colors.cyan}💸 SEND TO WALLET ADDRESS${colors.reset}`);
  console.log(`${colors.violet}═════════════════════════════════════════════════════════${colors.reset}\n`);

  const notes = sdk.getNotes(currentOwner);

  if (notes.length === 0) {
    console.log(`${colors.warning}⚠️  No notes available${colors.reset}\n`);
    await question(`${colors.dimText}Press Enter to continue...${colors.reset}`);
    return;
  }

  console.log(`${colors.text}Available notes:${colors.reset}\n`);
  notes.forEach((note, i) => {
    console.log(`  ${colors.cyan}${i + 1}.${colors.reset} ${colors.green}${(note.amount / LAMPORTS_PER_SOL).toFixed(4)} SOL${colors.reset} ${colors.dimText}(${note.commitment.substring(0, 12)}...)${colors.reset}`);
  });
  console.log();

  const indexStr = await question(`${colors.text}Select note (1-${notes.length}): ${colors.green}`);
  console.log(colors.reset);

  const index = parseInt(indexStr) - 1;

  if (isNaN(index) || index < 0 || index >= notes.length) {
    console.log(`${colors.error}❌ Invalid selection${colors.reset}\n`);
    await question(`${colors.dimText}Press Enter to continue...${colors.reset}`);
    return;
  }

  const note = notes[index];
  const maxAmount = note.amount / LAMPORTS_PER_SOL;

  const amountStr = await question(`${colors.text}Enter amount to send (max ${maxAmount} SOL): ${colors.green}`);
  console.log(colors.reset);

  const amount = parseFloat(amountStr);

  if (isNaN(amount) || amount <= 0 || amount > maxAmount) {
    console.log(`${colors.error}❌ Invalid amount${colors.reset}\n`);
    await question(`${colors.dimText}Press Enter to continue...${colors.reset}`);
    return;
  }

  const recipientStr = await question(`${colors.text}Recipient wallet address: ${colors.green}`);
  console.log(colors.reset);

  let recipient: PublicKey;
  try {
    recipient = new PublicKey(recipientStr.trim());
  } catch (error) {
    console.log(`${colors.error}❌ Invalid wallet address${colors.reset}\n`);
    await question(`${colors.dimText}Press Enter to continue...${colors.reset}`);
    return;
  }

  try {
    console.log(`\n${colors.dimText}Submitting via relayer...${colors.reset}`);
    const txSig = await sdk.withdrawViaRelayer(note, recipient, amount);

    console.log(`${colors.green}✅ Sent ${amount} SOL${colors.reset}`);
    console.log(`${colors.dimText}TX: ${txSig}${colors.reset}\n`);
  } catch (error: any) {
    console.log(`${colors.error}❌ Transfer failed: ${error.message}${colors.reset}\n`);
    if (error.message.includes('relayer')) {
      console.log(`${colors.warning}💡 Tip: Make sure the relayer service is running!${colors.reset}`);
      console.log(`${colors.dimText}   Check: npx ts-node check-status.bat${colors.reset}\n`);
    }
  }

  await question(`${colors.dimText}Press Enter to continue...${colors.reset}`);
}

async function privateTransfer() {
  console.log(`\n${colors.violet}═════════════════════════════════════════════════════════${colors.reset}`);
  console.log(`  ${colors.bright}${colors.cyan}🔐 PRIVATE TRANSFER (IDENTITY)${colors.reset}`);
  console.log(`${colors.violet}═════════════════════════════════════════════════════════${colors.reset}\n`);
  console.log(`${colors.dimText}Note: This creates a shielded note for another identity${colors.reset}`);
  console.log(`${colors.dimText}Use option 3 to send directly to a wallet address${colors.reset}\n`);

  const notes = sdk.getNotes(currentOwner);

  if (notes.length === 0) {
    console.log(`${colors.warning}⚠️  No notes available to transfer${colors.reset}\n`);
    await question(`${colors.dimText}Press Enter to continue...${colors.reset}`);
    return;
  }

  console.log(`${colors.text}Available notes:${colors.reset}\n`);
  notes.forEach((note, i) => {
    console.log(`  ${colors.cyan}${i + 1}.${colors.reset} ${colors.green}${(note.amount / LAMPORTS_PER_SOL).toFixed(4)} SOL${colors.reset} ${colors.dimText}(${note.commitment.substring(0, 12)}...)${colors.reset}`);
  });
  console.log();

  const indexStr = await question(`${colors.text}Select note (1-${notes.length}): ${colors.green}`);
  console.log(colors.reset);

  const index = parseInt(indexStr) - 1;

  if (isNaN(index) || index < 0 || index >= notes.length) {
    console.log(`${colors.error}❌ Invalid selection${colors.reset}\n`);
    await question(`${colors.dimText}Press Enter to continue...${colors.reset}`);
    return;
  }

  const note = notes[index];
  const maxAmount = note.amount / LAMPORTS_PER_SOL;

  const amountStr = await question(`${colors.text}Enter amount to transfer (max ${maxAmount} SOL): ${colors.green}`);
  console.log(colors.reset);

  const amount = parseFloat(amountStr);

  if (isNaN(amount) || amount <= 0 || amount > maxAmount) {
    console.log(`${colors.error}❌ Invalid amount${colors.reset}\n`);
    await question(`${colors.dimText}Press Enter to continue...${colors.reset}`);
    return;
  }

  const recipient = await question(`${colors.text}Recipient identity: ${colors.green}`);
  console.log(colors.reset);

  if (!recipient.trim()) {
    console.log(`${colors.error}❌ Invalid recipient${colors.reset}\n`);
    await question(`${colors.dimText}Press Enter to continue...${colors.reset}`);
    return;
  }

  try {
    console.log(`${colors.info}⏳ Generating ring signature proof...${colors.reset}`);
    const result = await sdk.privateTransfer(wallet, note, recipient, amount);

    console.log(`\n${colors.success}✅ Private transfer successful!${colors.reset}`);
    console.log(`${colors.dimText}TX: ${result.txSignature.substring(0, 16)}...${colors.reset}`);
    console.log(`${colors.magenta}🔒 Sender and amount remain private!${colors.reset}\n`);
  } catch (error: any) {
    console.log(`${colors.error}❌ Transfer failed: ${error.message}${colors.reset}\n`);
  }

  await question(`${colors.dimText}Press Enter to continue...${colors.reset}`);
}

async function viewNotes() {
  console.log(`\n${colors.violet}═════════════════════════════════════════════════════════${colors.reset}`);
  console.log(`  ${colors.bright}${colors.cyan}📊 YOUR SHIELDED NOTES${colors.reset}`);
  console.log(`${colors.violet}═════════════════════════════════════════════════════════${colors.reset}\n`);

  const notes = sdk.getNotes(currentOwner);

  if (notes.length === 0) {
    console.log(`${colors.warning}  No notes found${colors.reset}\n`);
  } else {
    notes.forEach((note, i) => {
      console.log(`${colors.cyan}Note #${i + 1}${colors.reset}`);
      console.log(`  ${colors.text}Amount:${colors.reset}     ${colors.green}${(note.amount / LAMPORTS_PER_SOL).toFixed(4)} SOL${colors.reset}`);
      console.log(`  ${colors.text}Commitment:${colors.reset} ${colors.dimText}${note.commitment.substring(0, 24)}...${colors.reset}`);
      console.log(`  ${colors.text}Created:${colors.reset}    ${colors.dimText}${new Date(note.createdAt).toLocaleString()}${colors.reset}`);
      console.log();
    });
  }

  await question(`${colors.dimText}Press Enter to continue...${colors.reset}`);
}

async function changeIdentity() {
  console.log(`\n${colors.violet}═════════════════════════════════════════════════════════${colors.reset}`);
  console.log(`  ${colors.bright}${colors.cyan}🔑 CHANGE IDENTITY${colors.reset}`);
  console.log(`${colors.violet}═════════════════════════════════════════════════════════${colors.reset}\n`);

  console.log(`${colors.text}Current identity: ${colors.magenta}${currentOwner}${colors.reset}\n`);

  const newIdentity = await question(`${colors.text}Enter new identity: ${colors.green}`);
  console.log(colors.reset);

  if (newIdentity.trim()) {
    currentOwner = newIdentity.trim();
    console.log(`${colors.success}✅ Identity changed to: ${colors.magenta}${currentOwner}${colors.reset}\n`);
  } else {
    console.log(`${colors.error}❌ Invalid identity${colors.reset}\n`);
  }

  await question(`${colors.dimText}Press Enter to continue...${colors.reset}`);
}

async function requestAirdrop() {
  console.log(`\n${colors.violet}═════════════════════════════════════════════════════════${colors.reset}`);
  console.log(`  ${colors.bright}${colors.cyan}💸 REQUEST AIRDROP${colors.reset}`);
  console.log(`${colors.violet}═════════════════════════════════════════════════════════${colors.reset}\n`);

  try {
    console.log(`${colors.info}⏳ Requesting 1 SOL airdrop...${colors.reset}`);
    const signature = await sdk.getConnection().requestAirdrop(
      wallet.publicKey,
      1 * LAMPORTS_PER_SOL
    );
    await sdk.getConnection().confirmTransaction(signature);

    console.log(`${colors.success}✅ Airdrop successful!${colors.reset}`);
    console.log(`${colors.dimText}You received 1 SOL${colors.reset}\n`);
  } catch (error: any) {
    console.log(`${colors.error}❌ Airdrop failed: ${error.message}${colors.reset}\n`);
  }

  await question(`${colors.dimText}Press Enter to continue...${colors.reset}`);
}


async function main() {
  // Load wallet
  const walletPath = path.join(os.homedir(), '.config', 'solana', 'id.json');
  wallet = Keypair.fromSecretKey(
    Uint8Array.from(JSON.parse(fs.readFileSync(walletPath, 'utf-8')))
  );

  // Initialize SDK
  sdk = new GhostPrivacySDK({
    network: 'devnet',
    dataDir: './data',
  });

  // Main loop
  while (true) {
    clearScreen();
    printHeader();
    printBalance();
    printMenu();

    const choice = await question(`${colors.cyan}> ${colors.reset}`);

    switch (choice.trim()) {
      case '1':
        await deposit();
        break;
      case '2':
        await withdraw();
        break;
      case '3':
        await sendToWallet();
        break;
      case '4':
        await privateTransfer();
        break;
      case '5':
        await viewNotes();
        break;
      case '6':
        await changeIdentity();
        break;
      case '7':
        await requestAirdrop();
        break;
      case '8':
        console.log(`\n${colors.dimText}Goodbye!${colors.reset}\n`);
        rl.close();
        process.exit(0);
        break;
      default:
        console.log(`${colors.error}Invalid option${colors.reset}`);
        await question(`${colors.dimText}Press Enter...${colors.reset}`);
    }
  }
}

main().catch((error) => {
  console.error(`${colors.error}Fatal error: ${error.message}${colors.reset}`);
  process.exit(1);
});
