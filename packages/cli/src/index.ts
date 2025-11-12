#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import { initCommand } from './commands/init';
import { transferCommand } from './commands/transfer';
import { depositCommand } from './commands/deposit';
import { withdrawCommand } from './commands/withdraw';
import { balanceCommand } from './commands/balance';
import { issueTokenCommand } from './commands/issue-token';
import { swapCommand } from './commands/swap';
import { stakeCommand } from './commands/stake';

const program = new Command();

program
  .name('ghost')
  .description('👻 Ghost SDK CLI - Privacy for Solana')
  .version('0.1.0');

// Initialize
program
  .command('init')
  .description('Initialize Ghost SDK wallet')
  .option('-n, --network <network>', 'Network (mainnet/devnet/localnet)', 'devnet')
  .action(initCommand);

// Transfer
program
  .command('transfer')
  .description('Send a private transfer')
  .option('-t, --to <address>', 'Recipient address (required)')
  .option('-a, --amount <amount>', 'Amount in SOL (required)')
  .option('-m, --memo <memo>', 'Optional memo')
  .option('-r, --ring-size <size>', 'Ring signature size', '11')
  .option('--private', 'Use maximum privacy (Ghost + Monero + Zcash)', false)
  .action(transferCommand);

// Deposit
program
  .command('deposit')
  .description('Deposit into privacy pool')
  .option('-a, --amount <amount>', 'Amount in SOL (required)')
  .action(depositCommand);

// Withdraw
program
  .command('withdraw')
  .description('Withdraw from privacy pool')
  .option('-a, --amount <amount>', 'Amount in SOL (required)')
  .option('-t, --to <address>', 'Recipient address (required)')
  .action(withdrawCommand);

// Balance
program
  .command('balance')
  .description('Show private balance')
  .option('--hidden', 'Show as hidden', false)
  .option('--proof', 'Generate balance proof', false)
  .action(balanceCommand);

// Issue Token
program
  .command('issue-token')
  .description('Issue a private token (ZSA)')
  .option('-n, --name <name>', 'Token name (required)')
  .option('-s, --symbol <symbol>', 'Token symbol (required)')
  .option('-d, --decimals <decimals>', 'Decimals', '9')
  .option('-t, --total-supply <supply>', 'Total supply (required)')
  .action(issueTokenCommand);

// Swap
program
  .command('swap')
  .description('Private token swap')
  .option('-f, --from <token>', 'From token (required)')
  .option('-t, --to <token>', 'To token (required)')
  .option('-a, --amount <amount>', 'Amount (required)')
  .option('--slippage <percentage>', 'Slippage tolerance', '0.5')
  .action(swapCommand);

// Stake
program
  .command('stake')
  .description('Stake tokens privately')
  .option('-a, --amount <amount>', 'Amount to stake (required)')
  .option('-d, --duration <days>', 'Staking duration in days', '30')
  .option('-t, --token <token>', 'Token to stake', 'SOL')
  .action(stakeCommand);

// Config
program
  .command('config')
  .description('Show configuration')
  .action(() => {
    console.log(chalk.cyan('📋 Ghost SDK Configuration'));
    console.log('Feature coming soon...');
  });

// Help banner
program.on('--help', () => {
  console.log('');
  console.log(chalk.cyan('👻 Ghost SDK CLI'));
  console.log('');
  console.log('Examples:');
  console.log('  $ ghost init');
  console.log('  $ ghost transfer --to ADDRESS --amount 1.5 --private');
  console.log('  $ ghost balance --hidden');
  console.log('  $ ghost issue-token --name "Private Gold" --symbol PGOLD --total-supply 1000000');
  console.log('  $ ghost swap --from SOL --to USDC --amount 10');
  console.log('  $ ghost stake --amount 100 --duration 30');
  console.log('');
});

program.parse();
