#!/usr/bin/env node

/**
 * Ghost SDK - Real Blockchain CLI (Simplified)
 *
 * This version uses REAL Solana blockchain for:
 * - Real wallet creation
 * - Real balance checks
 * - Real SOL transfers
 * - Real transaction signatures
 *
 * No program deployment needed - uses native Solana features
 */

import inquirer from 'inquirer';
import chalk from 'chalk';
import { Connection, Keypair, PublicKey, SystemProgram, Transaction, LAMPORTS_PER_SOL, sendAndConfirmTransaction } from '@solana/web3.js';
import fs from 'fs';
import path from 'path';
import os from 'os';

interface WalletState {
  keypair: Keypair | null;
  publicKey: string;
  network: string;
  rpcUrl: string;
}

const walletState: WalletState = {
  keypair: null,
  publicKey: '',
  network: 'devnet',
  rpcUrl: 'https://api.devnet.solana.com',
};

let connection: Connection;

const CONFIG_DIR = path.join(os.homedir(), '.ghost-sdk');
const WALLET_FILE = path.join(CONFIG_DIR, 'wallet.json');

// Helper functions
const pause = (ms: number = 800) => new Promise(resolve => setTimeout(resolve, ms));

const clearScreen = () => console.clear();

const showHeader = () => {
  console.log(chalk.bold.green('\n╔════════════════════════════════════════╗'));
  console.log(chalk.bold.green('║   👻 Ghost SDK - REAL Blockchain      ║'));
  console.log(chalk.bold.green('║       Connected to Solana Devnet      ║'));
  console.log(chalk.bold.green('╚════════════════════════════════════════╝\n'));

  if (walletState.publicKey) {
    console.log(chalk.gray(`Network: ${walletState.network} (REAL)`));
    console.log(chalk.gray(`RPC: ${walletState.rpcUrl}`));
    console.log(chalk.yellow(`Wallet: ${walletState.publicKey}`));
    console.log();
  }
};

// Save wallet to disk
const saveWallet = () => {
  if (!walletState.keypair) return;

  if (!fs.existsSync(CONFIG_DIR)) {
    fs.mkdirSync(CONFIG_DIR, { recursive: true });
  }

  const walletData = {
    secretKey: Array.from(walletState.keypair.secretKey),
    publicKey: walletState.publicKey,
    network: walletState.network,
  };

  fs.writeFileSync(WALLET_FILE, JSON.stringify(walletData, null, 2));
  console.log(chalk.gray(`\n💾 Wallet saved to: ${WALLET_FILE}`));
};

// Load wallet from disk
const loadWallet = (): boolean => {
  if (!fs.existsSync(WALLET_FILE)) return false;

  try {
    const walletData = JSON.parse(fs.readFileSync(WALLET_FILE, 'utf-8'));
    walletState.keypair = Keypair.fromSecretKey(new Uint8Array(walletData.secretKey));
    walletState.publicKey = walletData.publicKey;
    walletState.network = walletData.network || 'devnet';
    walletState.rpcUrl = walletData.network === 'mainnet-beta'
      ? 'https://api.mainnet-beta.solana.com'
      : 'https://api.devnet.solana.com';

    connection = new Connection(walletState.rpcUrl, 'confirmed');
    return true;
  } catch (error) {
    return false;
  }
};

// Initialize wallet
const initWallet = async () => {
  clearScreen();
  showHeader();

  console.log(chalk.yellow('🌟 Initialize Real Wallet\n'));

  const answers = await inquirer.prompt([
    {
      type: 'list',
      name: 'network',
      message: 'Select network:',
      choices: [
        { name: '🧪 Devnet (Free testing with airdrops)', value: 'devnet' },
        { name: '🌐 Mainnet Beta (Real SOL required)', value: 'mainnet-beta' },
      ],
    },
    {
      type: 'list',
      name: 'action',
      message: 'Wallet setup:',
      choices: [
        { name: '✨ Create new wallet', value: 'new' },
        { name: '📥 Import from secret key', value: 'import' },
      ],
    },
  ]);

  walletState.network = answers.network;
  walletState.rpcUrl = answers.network === 'mainnet-beta'
    ? 'https://api.mainnet-beta.solana.com'
    : 'https://api.devnet.solana.com';

  connection = new Connection(walletState.rpcUrl, 'confirmed');

  if (answers.action === 'new') {
    console.log(chalk.cyan('\n⏳ Creating new wallet on blockchain...'));
    await pause();

    // Generate REAL keypair
    walletState.keypair = Keypair.generate();
    walletState.publicKey = walletState.keypair.publicKey.toBase58();

    console.log(chalk.green('\n✅ Real wallet created!\n'));
    console.log(chalk.white('Public Key: ') + chalk.yellow(walletState.publicKey));
    console.log(chalk.red('\n⚠️  IMPORTANT: Save your secret key!'));
    console.log(chalk.gray('Secret Key: ') + chalk.gray([...walletState.keypair.secretKey].join(',')));

    saveWallet();

    if (answers.network === 'devnet') {
      console.log(chalk.cyan('\n💰 Requesting airdrop (2 SOL)...'));
      try {
        const signature = await connection.requestAirdrop(
          walletState.keypair.publicKey,
          2 * LAMPORTS_PER_SOL
        );
        await connection.confirmTransaction(signature);
        console.log(chalk.green('✅ Airdrop successful!'));
      } catch (error: any) {
        console.log(chalk.yellow('⚠️  Airdrop failed. Try again later or use: solana airdrop 2'));
      }
    }
  } else {
    const { secretKey } = await inquirer.prompt([
      {
        type: 'input',
        name: 'secretKey',
        message: 'Enter secret key (comma-separated numbers):',
      },
    ]);

    try {
      const keyArray = secretKey.split(',').map((n: string) => parseInt(n.trim()));
      walletState.keypair = Keypair.fromSecretKey(new Uint8Array(keyArray));
      walletState.publicKey = walletState.keypair.publicKey.toBase58();

      console.log(chalk.green('\n✅ Wallet imported!'));
      console.log(chalk.white('Public Key: ') + chalk.yellow(walletState.publicKey));

      saveWallet();
    } catch (error) {
      console.log(chalk.red('\n❌ Invalid secret key'));
      await pause(2000);
      return;
    }
  }

  await inquirer.prompt([{ type: 'input', name: 'continue', message: '\nPress Enter to continue...' }]);
};

// Check real balance
const checkBalance = async () => {
  clearScreen();
  showHeader();

  if (!walletState.keypair) {
    console.log(chalk.red('❌ No wallet initialized\n'));
    await inquirer.prompt([{ type: 'input', name: 'continue', message: 'Press Enter...' }]);
    return;
  }

  console.log(chalk.yellow('💰 Checking Real Balance...\n'));

  try {
    const balance = await connection.getBalance(walletState.keypair.publicKey);
    const solBalance = balance / LAMPORTS_PER_SOL;

    console.log(chalk.white('Public Key: ') + chalk.cyan(walletState.publicKey));
    console.log(chalk.white('Network: ') + chalk.gray(walletState.network));
    console.log(chalk.white('\nBalance: ') + chalk.green(`${solBalance.toFixed(9)} SOL`));
    console.log(chalk.gray(`(${balance} lamports)`));

    console.log(chalk.green('\n✅ This is REAL data from Solana blockchain!'));

    if (walletState.network === 'devnet' && solBalance < 0.1) {
      console.log(chalk.yellow('\n💡 Low balance! Get more SOL:'));
      console.log(chalk.gray('   Option 1: Use menu to request airdrop'));
      console.log(chalk.gray('   Option 2: Visit https://faucet.solana.com'));
    }
  } catch (error: any) {
    console.log(chalk.red(`\n❌ Error: ${error.message}`));
  }

  await inquirer.prompt([{ type: 'input', name: 'continue', message: '\nPress Enter...' }]);
};

// Real SOL transfer
const realTransfer = async () => {
  clearScreen();
  showHeader();

  if (!walletState.keypair) {
    console.log(chalk.red('❌ No wallet initialized\n'));
    await inquirer.prompt([{ type: 'input', name: 'continue', message: 'Press Enter...' }]);
    return;
  }

  console.log(chalk.yellow('🔐 Real SOL Transfer\n'));

  // Get current balance
  const currentBalance = await connection.getBalance(walletState.keypair.publicKey);
  const solBalance = currentBalance / LAMPORTS_PER_SOL;

  console.log(chalk.gray(`Available: ${solBalance.toFixed(9)} SOL\n`));

  const answers = await inquirer.prompt([
    {
      type: 'input',
      name: 'recipient',
      message: 'Recipient address:',
      validate: (input) => {
        try {
          new PublicKey(input);
          return true;
        } catch {
          return 'Invalid Solana address';
        }
      },
    },
    {
      type: 'number',
      name: 'amount',
      message: 'Amount (SOL):',
      validate: (value) => {
        if (value <= 0) return 'Amount must be greater than 0';
        if (value > solBalance - 0.001) return 'Insufficient balance (keep 0.001 SOL for fees)';
        return true;
      },
    },
    {
      type: 'confirm',
      name: 'confirm',
      message: (answers) => `Send ${answers.amount} SOL to ${answers.recipient.substring(0, 8)}...?`,
      default: false,
    },
  ]);

  if (!answers.confirm) {
    console.log(chalk.yellow('\n❌ Transfer cancelled'));
    await pause(1500);
    return;
  }

  console.log(chalk.cyan('\n⏳ Processing REAL transaction on blockchain...\n'));

  try {
    await pause();

    // Create REAL transaction
    const transaction = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: walletState.keypair.publicKey,
        toPubkey: new PublicKey(answers.recipient),
        lamports: answers.amount * LAMPORTS_PER_SOL,
      })
    );

    console.log(chalk.cyan('✓ Transaction created'));
    await pause();
    console.log(chalk.cyan('✓ Signing transaction'));
    await pause();
    console.log(chalk.cyan('✓ Sending to blockchain...'));

    // Send REAL transaction
    const signature = await sendAndConfirmTransaction(
      connection,
      transaction,
      [walletState.keypair],
      {
        commitment: 'confirmed',
      }
    );

    console.log(chalk.green('\n🚀 Transaction successful!\n'));
    console.log(chalk.white('Signature: ') + chalk.yellow(signature));
    console.log(chalk.white('Explorer: ') + chalk.cyan(`https://explorer.solana.com/tx/${signature}?cluster=${walletState.network}`));
    console.log(chalk.white('Amount: ') + chalk.green(`${answers.amount} SOL`));
    console.log(chalk.white('To: ') + chalk.gray(answers.recipient));

    console.log(chalk.green('\n✅ This was a REAL blockchain transaction!'));
  } catch (error: any) {
    console.log(chalk.red(`\n❌ Transaction failed: ${error.message}`));
  }

  await inquirer.prompt([{ type: 'input', name: 'continue', message: '\nPress Enter...' }]);
};

// Request airdrop
const requestAirdrop = async () => {
  clearScreen();
  showHeader();

  if (!walletState.keypair) {
    console.log(chalk.red('❌ No wallet initialized\n'));
    await inquirer.prompt([{ type: 'input', name: 'continue', message: 'Press Enter...' }]);
    return;
  }

  if (walletState.network !== 'devnet') {
    console.log(chalk.red('❌ Airdrops only available on devnet\n'));
    await inquirer.prompt([{ type: 'input', name: 'continue', message: 'Press Enter...' }]);
    return;
  }

  console.log(chalk.yellow('💰 Request Airdrop (Devnet Only)\n'));

  const { amount } = await inquirer.prompt([
    {
      type: 'list',
      name: 'amount',
      message: 'Amount to request:',
      choices: [
        { name: '1 SOL', value: 1 },
        { name: '2 SOL', value: 2 },
        { name: '5 SOL (may fail)', value: 5 },
      ],
    },
  ]);

  console.log(chalk.cyan(`\n⏳ Requesting ${amount} SOL from devnet faucet...`));

  try {
    const signature = await connection.requestAirdrop(
      walletState.keypair.publicKey,
      amount * LAMPORTS_PER_SOL
    );

    console.log(chalk.cyan('✓ Request sent, confirming...'));
    await connection.confirmTransaction(signature);

    console.log(chalk.green(`\n✅ Airdrop successful! Received ${amount} SOL`));
    console.log(chalk.white('Signature: ') + chalk.yellow(signature));

    // Show new balance
    const newBalance = await connection.getBalance(walletState.keypair.publicKey);
    console.log(chalk.white('New balance: ') + chalk.green(`${(newBalance / LAMPORTS_PER_SOL).toFixed(9)} SOL`));
  } catch (error: any) {
    console.log(chalk.red(`\n❌ Airdrop failed: ${error.message}`));
    console.log(chalk.yellow('\n💡 Try:'));
    console.log(chalk.gray('   1. Wait a few minutes and try again'));
    console.log(chalk.gray('   2. Request smaller amount (1 SOL)'));
    console.log(chalk.gray('   3. Use: https://faucet.solana.com'));
  }

  await inquirer.prompt([{ type: 'input', name: 'continue', message: '\nPress Enter...' }]);
};

// View transaction history
const viewHistory = async () => {
  clearScreen();
  showHeader();

  if (!walletState.keypair) {
    console.log(chalk.red('❌ No wallet initialized\n'));
    await inquirer.prompt([{ type: 'input', name: 'continue', message: 'Press Enter...' }]);
    return;
  }

  console.log(chalk.yellow('📜 Recent Transactions\n'));
  console.log(chalk.cyan('⏳ Fetching from blockchain...\n'));

  try {
    const signatures = await connection.getSignaturesForAddress(
      walletState.keypair.publicKey,
      { limit: 10 }
    );

    if (signatures.length === 0) {
      console.log(chalk.gray('No transactions found'));
    } else {
      console.log(chalk.white(`Found ${signatures.length} recent transactions:\n`));

      signatures.forEach((sig, index) => {
        const date = sig.blockTime ? new Date(sig.blockTime * 1000).toLocaleString() : 'Pending';
        const status = sig.err ? chalk.red('❌ Failed') : chalk.green('✅ Success');

        console.log(chalk.gray(`${index + 1}. ${status}`));
        console.log(chalk.gray(`   Signature: ${sig.signature}`));
        console.log(chalk.gray(`   Time: ${date}`));
        console.log(chalk.gray(`   Explorer: https://explorer.solana.com/tx/${sig.signature}?cluster=${walletState.network}`));
        console.log();
      });
    }

    console.log(chalk.green('✅ This is REAL transaction history from blockchain!'));
  } catch (error: any) {
    console.log(chalk.red(`❌ Error: ${error.message}`));
  }

  await inquirer.prompt([{ type: 'input', name: 'continue', message: '\nPress Enter...' }]);
};

// Main menu
const mainMenu = async () => {
  // Try to load existing wallet
  if (loadWallet()) {
    console.log(chalk.green('✅ Wallet loaded from disk'));
    await pause(1000);
  }

  while (true) {
    clearScreen();
    showHeader();

    const choices = [];

    if (!walletState.keypair) {
      choices.push(
        { name: '🌟 Initialize Wallet (REAL)', value: 'init' },
        { name: '❌ Exit', value: 'exit' }
      );
    } else {
      choices.push(
        { name: '💰 Check Balance (REAL)', value: 'balance' },
        { name: '🚀 Send SOL (REAL Transaction)', value: 'transfer' },
        { name: '💸 Request Airdrop (Devnet)', value: 'airdrop' },
        { name: '📜 View Transaction History (REAL)', value: 'history' },
        { name: '🔄 Switch Network', value: 'switch' },
        { name: '📊 About This CLI', value: 'about' },
        { name: '❌ Exit', value: 'exit' }
      );
    }

    const { action } = await inquirer.prompt([
      {
        type: 'list',
        name: 'action',
        message: 'What would you like to do?',
        choices,
      },
    ]);

    switch (action) {
      case 'init':
        await initWallet();
        break;
      case 'balance':
        await checkBalance();
        break;
      case 'transfer':
        await realTransfer();
        break;
      case 'airdrop':
        await requestAirdrop();
        break;
      case 'history':
        await viewHistory();
        break;
      case 'about':
        clearScreen();
        showHeader();
        console.log(chalk.yellow('📊 About This CLI\n'));
        console.log(chalk.white('This CLI uses ') + chalk.green('REAL BLOCKCHAIN DATA!\n'));
        console.log(chalk.green('✅ Real Solana blockchain connection'));
        console.log(chalk.green('✅ Real wallet creation'));
        console.log(chalk.green('✅ Real SOL transfers'));
        console.log(chalk.green('✅ Real transaction signatures'));
        console.log(chalk.green('✅ Real balance checks'));
        console.log(chalk.green('✅ Real transaction history'));
        console.log(chalk.yellow('\n⚠️  This is NOT mock data!'));
        console.log(chalk.gray('\nCurrent limitations:'));
        console.log(chalk.gray('  • No ZK proofs yet (would add privacy)'));
        console.log(chalk.gray('  • No ring signatures yet (would add anonymity)'));
        console.log(chalk.gray('  • No shielded pools yet (would hide amounts)'));
        console.log(chalk.cyan('\nNext steps to add privacy:'));
        console.log(chalk.gray('  1. Deploy Ghost program'));
        console.log(chalk.gray('  2. Compile ZK circuits'));
        console.log(chalk.gray('  3. Integrate privacy features'));
        await inquirer.prompt([{ type: 'input', name: 'continue', message: '\nPress Enter...' }]);
        break;
      case 'exit':
        clearScreen();
        console.log(chalk.cyan('\n👻 Thanks for using Ghost SDK!\n'));
        console.log(chalk.green('✅ All transactions were REAL!\n'));
        process.exit(0);
    }
  }
};

// Start
console.log(chalk.cyan('\n🚀 Starting Ghost SDK Real Blockchain CLI...\n'));
console.log(chalk.green('✅ Connecting to Solana...\n'));
setTimeout(mainMenu, 1500);
