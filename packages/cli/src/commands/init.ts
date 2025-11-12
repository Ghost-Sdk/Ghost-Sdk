import chalk from 'chalk';
import inquirer from 'inquirer';
import { Keypair } from '@solana/web3.js';
import { saveConfig } from '../utils/config';

export async function initCommand(options: any) {
  console.log(chalk.cyan('👻 Ghost SDK - Initialization'));
  console.log('');

  const answers = await inquirer.prompt([
    {
      type: 'list',
      name: 'network',
      message: 'Select network:',
      choices: ['devnet', 'mainnet-beta', 'testnet', 'localnet'],
      default: options.network || 'devnet',
    },
    {
      type: 'confirm',
      name: 'createNewWallet',
      message: 'Create new wallet?',
      default: true,
    },
    {
      type: 'password',
      name: 'existingKey',
      message: 'Enter existing private key (base58):',
      when: (answers) => !answers.createNewWallet,
    },
  ]);

  let wallet: Keypair;

  if (answers.createNewWallet) {
    wallet = Keypair.generate();
    console.log('');
    console.log(chalk.green('✅ New wallet created'));
    console.log(chalk.yellow('⚠️  Save this private key (base58):'));
    console.log(chalk.gray(Buffer.from(wallet.secretKey).toString('base64')));
  } else {
    try {
      const keyBytes = Buffer.from(answers.existingKey, 'base64');
      wallet = Keypair.fromSecretKey(keyBytes);
      console.log(chalk.green('✅ Wallet imported'));
    } catch (error) {
      console.error(chalk.red('❌ Invalid private key'));
      process.exit(1);
    }
  }

  // Save configuration
  const rpcUrls: Record<string, string> = {
    devnet: 'https://api.devnet.solana.com',
    'mainnet-beta': 'https://api.mainnet-beta.solana.com',
    testnet: 'https://api.testnet.solana.com',
    localnet: 'http://localhost:8899',
  };

  await saveConfig({
    network: answers.network,
    rpcUrl: rpcUrls[answers.network],
    privateKey: Buffer.from(wallet.secretKey).toString('base64'),
    publicKey: wallet.publicKey.toString(),
    programId: 'GhostPrivacy11111111111111111111111111111111',
  });

  console.log('');
  console.log(chalk.green('✅ Configuration saved'));
  console.log('');
  console.log(chalk.cyan('Wallet Info:'));
  console.log(chalk.gray(`  Public Key: ${wallet.publicKey.toString()}`));
  console.log(chalk.gray(`  Network: ${answers.network}`));
  console.log('');
  console.log(chalk.cyan('Next steps:'));
  console.log(chalk.gray('  1. Fund your wallet'));
  console.log(chalk.gray('  2. Run: ghost balance'));
  console.log(chalk.gray('  3. Run: ghost transfer --to ADDRESS --amount 1.5'));
  console.log('');
}
