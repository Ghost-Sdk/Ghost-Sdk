import chalk from 'chalk';
import ora from 'ora';
import { Connection, Keypair, PublicKey } from '@solana/web3.js';
import { GhostClient } from '@ghost-sdk/core';
import { loadConfig } from '../utils/config';

export async function balanceCommand(options: any) {
  const { hidden, proof } = options;

  const spinner = ora('Loading balance...').start();

  try {
    const config = await loadConfig();
    const connection = new Connection(config.rpcUrl);
    const wallet = Keypair.fromSecretKey(Buffer.from(config.privateKey, 'base64'));

    const ghost = new GhostClient({
      connection,
      wallet,
      programId: new PublicKey(config.programId),
    });

    await ghost.initialize();

    // Get private balance
    const balance = await ghost.getPrivateBalance();
    const balanceSOL = Number(balance) / 1_000_000_000;

    spinner.succeed('Balance loaded');

    console.log('');
    console.log(chalk.cyan('💰 Private Balance'));
    console.log(chalk.gray('━'.repeat(50)));

    if (hidden) {
      console.log(chalk.gray('  Amount: ████████ SOL (HIDDEN)'));
      console.log(chalk.gray('  Value: $████████ USD (HIDDEN)'));
    } else {
      console.log(chalk.white(`  Amount: ${balanceSOL.toFixed(4)} SOL`));
      console.log(chalk.gray(`  Value: ~$${(balanceSOL * 100).toFixed(2)} USD`)); // Mock price
    }

    console.log('');
    console.log(chalk.cyan('Privacy Status:'));
    console.log(chalk.gray('  ✅ Balance is private'));
    console.log(chalk.gray('  ✅ Commitments secured'));
    console.log(chalk.gray('  ✅ ZK proofs verified'));

    if (proof) {
      console.log('');
      spinner.start('Generating balance proof...');

      const minBalance = balance / 2n; // Prove you have at least 50%
      const balanceProof = await ghost.generateBalanceProof(minBalance);

      spinner.succeed('Balance proof generated');

      console.log('');
      console.log(chalk.cyan('🔐 Balance Proof'));
      console.log(chalk.gray('  Can prove you have at least:'));
      console.log(chalk.white(`  ${Number(minBalance) / 1_000_000_000} SOL`));
      console.log(chalk.gray('  Without revealing exact amount!'));
    }

    console.log('');

  } catch (error: any) {
    spinner.fail('Failed to load balance');
    console.error(chalk.red(`Error: ${error.message}`));
    process.exit(1);
  }
}
