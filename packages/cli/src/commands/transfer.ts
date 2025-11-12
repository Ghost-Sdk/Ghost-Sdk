import chalk from 'chalk';
import ora from 'ora';
import { Connection, Keypair, PublicKey } from '@solana/web3.js';
import { GhostClient } from '@ghost-sdk/core';
import { MoneroPrivacyClient } from '@ghost-sdk/monero';
import { ZcashZSAClient } from '@ghost-sdk/zcash';
import { UltimatePrivacyClient } from '@ghost-sdk/integrations';
import { loadConfig } from '../utils/config';

export async function transferCommand(options: any) {
  const { to, amount, memo, ringSize, private: useMaxPrivacy } = options;

  if (!to || !amount) {
    console.error(chalk.red('❌ Error: --to and --amount are required'));
    process.exit(1);
  }

  const spinner = ora('Initializing Ghost SDK...').start();

  try {
    // Load config
    const config = await loadConfig();

    // Initialize clients
    const connection = new Connection(config.rpcUrl);
    const wallet = Keypair.fromSecretKey(Buffer.from(config.privateKey, 'base64'));

    const ghost = new GhostClient({
      connection,
      wallet,
      programId: new PublicKey(config.programId),
    });

    await ghost.initialize();
    spinner.succeed('Ghost SDK initialized');

    // Parse amount
    const amountLamports = BigInt(Math.floor(parseFloat(amount) * 1_000_000_000));

    if (useMaxPrivacy) {
      // Use ultimate privacy (all 3 layers)
      spinner.start('Using maximum privacy (Ghost + Monero + Zcash)...');

      const monero = new MoneroPrivacyClient();
      const zcash = new ZcashZSAClient();

      await monero.initialize();
      await zcash.initialize();

      const ultimate = new UltimatePrivacyClient({ ghost, monero, zcash });

      console.log('');
      console.log(chalk.cyan('🔐 ULTIMATE PRIVACY TRANSFER'));
      console.log(chalk.gray('━'.repeat(50)));

      const signature = await ultimate.ultimatePrivateTransfer({
        assetId: new Uint8Array(32), // SOL
        amount: amountLamports,
        recipient: to,
        ringSize: parseInt(ringSize) || 11,
        memo,
      });

      console.log('');
      console.log(chalk.green('✅ Transfer complete!'));
      console.log(chalk.gray(`Signature: ${signature}`));

    } else {
      // Standard private transfer
      spinner.start('Generating ZK proof...');

      const signature = await ghost.privateTransfer({
        recipient: to,
        amount: amountLamports,
        memo,
      });

      spinner.succeed('Transfer complete!');

      console.log('');
      console.log(chalk.green('✅ Private transfer successful'));
      console.log(chalk.gray(`Amount: ${amount} SOL (HIDDEN)`));
      console.log(chalk.gray(`Recipient: ${to.slice(0, 8)}...${to.slice(-8)} (HIDDEN)`));
      console.log(chalk.gray(`Signature: ${signature}`));
    }

    console.log('');
    console.log(chalk.cyan('Privacy Features:'));
    console.log(chalk.gray('  ✅ Sender hidden'));
    console.log(chalk.gray('  ✅ Amount hidden'));
    console.log(chalk.gray('  ✅ Recipient hidden'));
    if (useMaxPrivacy) {
      console.log(chalk.gray(`  ✅ Ring signature (size ${ringSize})`));
      console.log(chalk.gray('  ✅ Shielded asset'));
    }

  } catch (error: any) {
    spinner.fail('Transfer failed');
    console.error(chalk.red(`Error: ${error.message}`));
    process.exit(1);
  }
}
