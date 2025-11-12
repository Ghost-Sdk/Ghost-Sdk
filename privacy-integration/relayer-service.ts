/**
 * Ghost Privacy Relayer Service
 * Provides anonymity by submitting transactions on behalf of users
 *
 * This hides the sender's wallet address from on-chain visibility
 */

import express from 'express';
import { Keypair, Connection, PublicKey, Transaction, TransactionInstruction, sendAndConfirmTransaction, LAMPORTS_PER_SOL } from '@solana/web3.js';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

const app = express();
app.use(express.json({ limit: '10mb' }));

// Relayer configuration
const RELAYER_PORT = 3000;
const RELAYER_FEE = 0.001 * LAMPORTS_PER_SOL; // 0.001 SOL fee per transaction
const PROGRAM_ID = new PublicKey('3wiFPaYTQZZD71rd4pohPRr8JaFaGN3XaNWLoGSk31Ck');

// Load relayer wallet
let relayerWallet: Keypair;
let connection: Connection;

function loadRelayerWallet(): Keypair {
  const relayerPath = path.join(__dirname, 'data', 'relayer-wallet.json');

  if (fs.existsSync(relayerPath)) {
    const secretKey = JSON.parse(fs.readFileSync(relayerPath, 'utf-8'));
    return Keypair.fromSecretKey(Uint8Array.from(secretKey));
  } else {
    // Create new relayer wallet
    const newWallet = Keypair.generate();
    if (!fs.existsSync(path.join(__dirname, 'data'))) {
      fs.mkdirSync(path.join(__dirname, 'data'), { recursive: true });
    }
    fs.writeFileSync(relayerPath, JSON.stringify(Array.from(newWallet.secretKey)));
    console.log('🔑 New relayer wallet created!');
    console.log(`   Address: ${newWallet.publicKey.toString()}`);
    console.log(`   ⚠️  Fund this wallet with SOL to pay gas fees!`);
    return newWallet;
  }
}

// Request queue for rate limiting
const requestQueue: Map<string, number[]> = new Map();
const MAX_REQUESTS_PER_MINUTE = 5; // Reduced from 10 to 5 for better security

// Track used nullifiers to prevent replay attacks
const processedNullifiers: Set<string> = new Set();

// Maximum instruction data size to prevent DoS
const MAX_INSTRUCTION_SIZE = 10000; // 10KB

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const requests = requestQueue.get(ip) || [];

  // Remove requests older than 1 minute
  const recentRequests = requests.filter(time => now - time < 60000);

  if (recentRequests.length >= MAX_REQUESTS_PER_MINUTE) {
    return false;
  }

  recentRequests.push(now);
  requestQueue.set(ip, recentRequests);
  return true;
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    relayer: relayerWallet.publicKey.toString(),
    fee: RELAYER_FEE / LAMPORTS_PER_SOL + ' SOL',
  });
});

// Get relayer address
app.get('/relayer-address', (req, res) => {
  res.json({
    address: relayerWallet.publicKey.toString(),
    fee: RELAYER_FEE / LAMPORTS_PER_SOL,
  });
});

// Submit withdrawal transaction via relayer
app.post('/relay-withdraw', async (req, res) => {
  const clientIp = req.ip || 'unknown';

  // Rate limiting
  if (!checkRateLimit(clientIp)) {
    return res.status(429).json({
      error: 'Rate limit exceeded. Try again later.',
    });
  }

  try {
    const {
      poolAddress,
      instructionData,
      recipient,
      amount,
      nullifier, // Add nullifier to prevent replay attacks
    } = req.body;

    // Validate inputs
    if (!poolAddress || !instructionData || !recipient || !amount || !nullifier) {
      return res.status(400).json({
        error: 'Missing required parameters. Required: poolAddress, instructionData, recipient, amount, nullifier',
      });
    }

    // Validate instruction data size to prevent DoS
    if (instructionData.length > MAX_INSTRUCTION_SIZE) {
      return res.status(400).json({
        error: `Instruction data too large. Maximum size: ${MAX_INSTRUCTION_SIZE} bytes`,
      });
    }

    // Check for replay attack - ensure nullifier hasn't been processed
    if (processedNullifiers.has(nullifier)) {
      return res.status(400).json({
        error: 'Nullifier already processed. Possible replay attack detected.',
      });
    }

    // Validate amount is reasonable (prevent griefing)
    if (typeof amount !== 'number' || amount < 0 || amount > 1000 * LAMPORTS_PER_SOL) {
      return res.status(400).json({
        error: 'Invalid amount. Must be between 0 and 1000 SOL',
      });
    }

    // Validate addresses
    let poolPubkey: PublicKey;
    let recipientPubkey: PublicKey;
    let vaultPubkey: PublicKey;

    try {
      poolPubkey = new PublicKey(poolAddress);
      recipientPubkey = new PublicKey(recipient);

      // Derive vault PDA
      [vaultPubkey] = PublicKey.findProgramAddressSync(
        [Buffer.from('vault'), poolPubkey.toBuffer()],
        PROGRAM_ID
      );
    } catch (error) {
      return res.status(400).json({
        error: 'Invalid address format',
      });
    }

    // Check relayer balance
    const relayerBalance = await connection.getBalance(relayerWallet.publicKey);
    const minBalance = 0.01 * LAMPORTS_PER_SOL; // Need at least 0.01 SOL

    if (relayerBalance < minBalance) {
      return res.status(503).json({
        error: 'Relayer out of funds. Please try again later.',
      });
    }

    // Relaying withdrawal silently

    // Build transaction instruction
    const instruction = new TransactionInstruction({
      keys: [
        { pubkey: poolPubkey, isSigner: false, isWritable: true },
        { pubkey: vaultPubkey, isSigner: false, isWritable: true },
        { pubkey: recipientPubkey, isSigner: false, isWritable: true },
        { pubkey: PublicKey.default, isSigner: false, isWritable: false }, // System program placeholder
      ],
      programId: PROGRAM_ID,
      data: Buffer.from(instructionData, 'base64'),
    });

    // Create and send transaction
    const transaction = new Transaction().add(instruction);

    // Submit transaction using relayer wallet (this hides the user's wallet!)
    const signature = await sendAndConfirmTransaction(
      connection,
      transaction,
      [relayerWallet],
      {
        commitment: 'confirmed',
        skipPreflight: false,
      }
    );

    // Mark nullifier as processed to prevent replay attacks
    processedNullifiers.add(nullifier);

    console.log(`✓ Transaction relayed successfully: ${signature}`);

    res.json({
      success: true,
      signature,
      relayer: relayerWallet.publicKey.toString(),
      fee: RELAYER_FEE / LAMPORTS_PER_SOL,
    });

  } catch (error: any) {
    console.error('❌ Relay failed:', error.message);

    res.status(500).json({
      error: 'Transaction failed',
      message: error.message,
      logs: error.logs || [],
    });
  }
});

// Statistics endpoint
app.get('/stats', async (req, res) => {
  try {
    const balance = await connection.getBalance(relayerWallet.publicKey);

    res.json({
      relayerAddress: relayerWallet.publicKey.toString(),
      balance: balance / LAMPORTS_PER_SOL + ' SOL',
      fee: RELAYER_FEE / LAMPORTS_PER_SOL + ' SOL',
      network: 'devnet',
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Start server
function startRelayer() {
  // Initialize connection
  connection = new Connection('https://api.devnet.solana.com', 'confirmed');

  // Load relayer wallet
  relayerWallet = loadRelayerWallet();

  app.listen(RELAYER_PORT, () => {
    console.log(`👻 Relayer running on port ${RELAYER_PORT}`);
  });

  // Relayer ready
}

// Handle shutdown gracefully
process.on('SIGINT', () => {
  console.log('\n\n👻 Relayer service shutting down...\n');
  process.exit(0);
});

// Start the relayer
startRelayer();
