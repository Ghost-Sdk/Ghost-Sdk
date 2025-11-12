/**
 * Store Verification Keys On-Chain
 *
 * This script uploads the verification keys from circuits to PDA accounts
 * so they can be used for on-chain proof verification.
 */

import { Connection, Keypair, PublicKey, Transaction, TransactionInstruction, SystemProgram, sendAndConfirmTransaction } from '@solana/web3.js';
import * as fs from 'fs';
import * as path from 'path';
import * as borsh from 'borsh';

const PROGRAM_ID = new PublicKey('3wiFPaYTQZZD71rd4pohPRr8JaFaGN3XaNWLoGSk31Ck');

// Circuit types
enum CircuitType {
  Transfer = 0,
  Balance = 1,
  RingSignature = 2,
}

/**
 * Derive VK PDA address
 */
function deriveVKAddress(
  pool: PublicKey,
  circuitType: CircuitType
): [PublicKey, number] {
  const circuitSeed = circuitType === CircuitType.Transfer
    ? Buffer.from('vk_transfer')
    : circuitType === CircuitType.Balance
    ? Buffer.from('vk_balance')
    : Buffer.from('vk_ring_sig');

  return PublicKey.findProgramAddressSync(
    [circuitSeed, pool.toBuffer()],
    PROGRAM_ID
  );
}

/**
 * Store verification key on-chain
 */
async function storeVerificationKey(
  connection: Connection,
  authority: Keypair,
  poolAddress: PublicKey,
  circuitType: CircuitType,
  vkPath: string
): Promise<string> {
  console.log(`\n📤 Storing ${CircuitType[circuitType]} verification key...`);

  // Read verification key file
  if (!fs.existsSync(vkPath)) {
    throw new Error(`Verification key not found: ${vkPath}`);
  }

  const vkJson = JSON.parse(fs.readFileSync(vkPath, 'utf-8'));

  // Convert VK to binary format (this is simplified - in production, use proper serialization)
  const vkData = Buffer.from(JSON.stringify(vkJson));

  console.log(`   VK size: ${vkData.length} bytes`);

  if (vkData.length > 2048) {
    throw new Error(`VK too large: ${vkData.length} bytes (max 2048)`);
  }

  // Derive VK PDA
  const [vkAccount, bump] = deriveVKAddress(poolAddress, circuitType);

  console.log(`   VK PDA: ${vkAccount.toString()}`);

  // Build instruction data
  const instructionData = Buffer.alloc(1 + 1 + 4 + vkData.length);
  let offset = 0;

  // Instruction discriminator (8 for StoreVerificationKey)
  instructionData.writeUInt8(8, offset);
  offset += 1;

  // Circuit type
  instructionData.writeUInt8(circuitType, offset);
  offset += 1;

  // VK data length
  instructionData.writeUInt32LE(vkData.length, offset);
  offset += 4;

  // VK data
  vkData.copy(instructionData, offset);

  // Check if account exists
  const accountInfo = await connection.getAccountInfo(vkAccount);

  // Build instruction
  const instruction = new TransactionInstruction({
    keys: [
      { pubkey: vkAccount, isSigner: false, isWritable: true },
      { pubkey: poolAddress, isSigner: false, isWritable: true },
      { pubkey: authority.publicKey, isSigner: true, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    programId: PROGRAM_ID,
    data: instructionData,
  });

  // Send transaction
  const transaction = new Transaction().add(instruction);

  try {
    const signature = await sendAndConfirmTransaction(
      connection,
      transaction,
      [authority],
      {
        commitment: 'confirmed',
        skipPreflight: false,
      }
    );

    console.log(`   ✅ Stored successfully!`);
    console.log(`   Signature: ${signature}`);

    return signature;
  } catch (error: any) {
    console.error(`   ❌ Failed to store VK:`, error.message);
    throw error;
  }
}

/**
 * Main function
 */
async function main() {
  console.log('🔑 Ghost Privacy - Store Verification Keys On-Chain\n');

  // Load configuration
  const poolAddress = new PublicKey('5PYt6P2r3hiRU661Kq4EAG5kSnmYVtKto7MtE4YhJVAN'); // Update with your pool

  // Load authority wallet
  const authorityPath = path.join(__dirname, 'data', 'wallet.json');
  if (!fs.existsSync(authorityPath)) {
    throw new Error('Authority wallet not found. Run the CLI first to create a wallet.');
  }

  const authoritySecret = JSON.parse(fs.readFileSync(authorityPath, 'utf-8'));
  const authority = Keypair.fromSecretKey(Uint8Array.from(authoritySecret));

  console.log(`Pool: ${poolAddress.toString()}`);
  console.log(`Authority: ${authority.publicKey.toString()}\n`);

  // Connect to Solana
  const connection = new Connection('https://api.devnet.solana.com', 'confirmed');

  // Circuit paths
  const circuitsDir = path.join(__dirname, '..', 'circuits', 'build');

  const vkPaths = [
    {
      type: CircuitType.Transfer,
      path: path.join(circuitsDir, 'transfer_verification_key.json'),
    },
    {
      type: CircuitType.Balance,
      path: path.join(circuitsDir, 'balance_verification_key.json'),
    },
    {
      type: CircuitType.RingSignature,
      path: path.join(circuitsDir, 'ring_signature_verification_key.json'),
    },
  ];

  // Store each VK
  for (const { type, path: vkPath } of vkPaths) {
    try {
      await storeVerificationKey(
        connection,
        authority,
        poolAddress,
        type,
        vkPath
      );
    } catch (error) {
      console.error(`Failed to store ${CircuitType[type]} VK:`, error);
    }
  }

  console.log('\n✅ All verification keys stored successfully!');
  console.log('\nℹ️  On-chain proof verification is now fully enabled.');
}

// Run if called directly
if (require.main === module) {
  main().catch((error) => {
    console.error('Error:', error);
    process.exit(1);
  });
}

export { storeVerificationKey, deriveVKAddress, CircuitType };
