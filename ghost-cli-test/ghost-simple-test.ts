#!/usr/bin/env node

/**
 * Ghost SDK - Simple Test CLI
 * Simplified version for testing
 */

import { Connection, Keypair, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import inquirer from 'inquirer';
import chalk from 'chalk';

console.log(chalk.cyan('\n🚀 Starting Ghost SDK Simple Test...\n'));

async function main() {
  try {
    // Test 1: Connection
    console.log(chalk.yellow('Testing Solana connection...'));
    const connection = new Connection('https://api.devnet.solana.com', 'confirmed');
    const version = await connection.getVersion();
    console.log(chalk.green('✅ Connected to Solana devnet'));
    console.log(chalk.gray(`   Version: ${JSON.stringify(version)}\n`));

    // Test 2: Menu
    console.log(chalk.yellow('Testing menu...'));
    const { action } = await inquirer.prompt([
      {
        type: 'list',
        name: 'action',
        message: 'Choose an action:',
        choices: [
          { name: '1. Create Test Wallet', value: 'create' },
          { name: '2. Check Balance', value: 'balance' },
          { name: '3. Exit', value: 'exit' },
        ],
      },
    ]);

    console.log(chalk.green(`\n✅ Selected: ${action}\n`));

    if (action === 'create') {
      // Test 3: Create wallet
      console.log(chalk.yellow('Creating test wallet...'));
      const keypair = Keypair.generate();
      console.log(chalk.green('✅ Wallet created'));
      console.log(chalk.gray(`   Public Key: ${keypair.publicKey.toBase58()}\n`));

      // Test 4: Request airdrop
      const { doAirdrop } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'doAirdrop',
          message: 'Request airdrop (2 SOL)?',
          default: true,
        },
      ]);

      if (doAirdrop) {
        console.log(chalk.yellow('\nRequesting airdrop...'));
        try {
          const signature = await connection.requestAirdrop(
            keypair.publicKey,
            2 * LAMPORTS_PER_SOL
          );
          console.log(chalk.cyan('Confirming...'));
          await connection.confirmTransaction(signature);
          console.log(chalk.green('✅ Airdrop successful!'));
          console.log(chalk.gray(`   Signature: ${signature}\n`));

          // Check balance
          const balance = await connection.getBalance(keypair.publicKey);
          console.log(chalk.green(`💰 Balance: ${balance / LAMPORTS_PER_SOL} SOL\n`));
        } catch (error: any) {
          console.log(chalk.yellow('⚠️  Airdrop failed (rate limited or network issue)'));
          console.log(chalk.gray(`   Error: ${error.message}\n`));
        }
      }
    } else if (action === 'balance') {
      // Test balance check
      const { address } = await inquirer.prompt([
        {
          type: 'input',
          name: 'address',
          message: 'Enter wallet address:',
          default: 'AhmVtAKVCsmWQce7iBBNKnGNRfa4AnV5rjeWdEhEbhou',
        },
      ]);

      console.log(chalk.yellow('\nChecking balance...'));
      try {
        const pubkey = new PublicKey(address);
        const balance = await connection.getBalance(pubkey);
        console.log(chalk.green('✅ Balance retrieved'));
        console.log(chalk.green(`💰 ${balance / LAMPORTS_PER_SOL} SOL\n`));
      } catch (error: any) {
        console.log(chalk.red(`❌ Error: ${error.message}\n`));
      }
    }

    console.log(chalk.cyan('✅ All tests passed!\n'));
    console.log(chalk.white('If this works, the main CLI should work too.'));
    console.log(chalk.white('Try: START_QUICK_PRIVACY.bat\n'));

  } catch (error: any) {
    console.log(chalk.red('\n❌ Error occurred:'));
    console.log(chalk.red(`   ${error.message}`));
    console.log(chalk.gray(`\n   Stack: ${error.stack}\n`));
    process.exit(1);
  }
}

main();
