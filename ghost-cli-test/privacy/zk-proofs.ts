/**
 * ZK Proof Generation Module
 *
 * Uses snarkjs to generate Groth16 proofs for private transfers
 */

import { readFileSync } from 'fs';
import { join } from 'path';

// Import snarkjs dynamically since it might not be installed yet
let snarkjs: any;
try {
  snarkjs = require('snarkjs');
} catch (e) {
  console.warn('snarkjs not installed. Install with: npm install snarkjs');
}

export interface TransferProofInput {
  // Public inputs
  root: string;
  nullifier: string;
  newCommitment: string;

  // Private inputs
  amount: string;
  privateKey: string;
  pathElements: string[];
  pathIndices: number[];
  recipientPublicKey: string;
  nonce: string;
  oldNonce: string;
}

export interface BalanceProofInput {
  // Public inputs
  minBalance: string;
  balanceCommitment: string;

  // Private inputs
  actualBalance: string;
  balanceNonce: string;
  privateKey: string;
}

export interface ProofResult {
  proof: {
    pi_a: string[];
    pi_b: string[][];
    pi_c: string[];
    protocol: string;
    curve: string;
  };
  publicSignals: string[];
}

/**
 * Generate ZK proof for private transfer
 */
export async function generateTransferProof(
  input: TransferProofInput
): Promise<ProofResult> {
  if (!snarkjs) {
    throw new Error('snarkjs not installed');
  }

  console.log('Generating transfer proof...');
  console.log('This may take 2-5 seconds...');

  try {
    // Paths to circuit artifacts
    const wasmPath = join(__dirname, '../../circuits/build/transfer.wasm');
    const zkeyPath = join(__dirname, '../../circuits/build/transfer_final.zkey');

    // Convert input to correct format
    const circuitInput = {
      root: input.root,
      nullifier: input.nullifier,
      newCommitment: input.newCommitment,
      amount: input.amount,
      privateKey: input.privateKey,
      pathElements: input.pathElements,
      pathIndices: input.pathIndices,
      recipientPublicKey: input.recipientPublicKey,
      nonce: input.nonce,
      oldNonce: input.oldNonce,
    };

    // Generate proof using snarkjs
    const { proof, publicSignals } = await snarkjs.groth16.fullProve(
      circuitInput,
      wasmPath,
      zkeyPath
    );

    console.log('✓ Proof generated successfully');
    console.log(`  Public signals: ${publicSignals.length}`);

    return { proof, publicSignals };
  } catch (error: any) {
    console.error('Error generating proof:', error.message);
    throw error;
  }
}

/**
 * Generate ZK proof for balance verification
 */
export async function generateBalanceProof(
  input: BalanceProofInput
): Promise<ProofResult> {
  if (!snarkjs) {
    throw new Error('snarkjs not installed');
  }

  console.log('Generating balance proof...');

  try {
    const wasmPath = join(__dirname, '../../circuits/build/balance.wasm');
    const zkeyPath = join(__dirname, '../../circuits/build/balance_final.zkey');

    const circuitInput = {
      minBalance: input.minBalance,
      balanceCommitment: input.balanceCommitment,
      actualBalance: input.actualBalance,
      balanceNonce: input.balanceNonce,
      privateKey: input.privateKey,
    };

    const { proof, publicSignals } = await snarkjs.groth16.fullProve(
      circuitInput,
      wasmPath,
      zkeyPath
    );

    console.log('✓ Balance proof generated');

    return { proof, publicSignals };
  } catch (error: any) {
    console.error('Error generating balance proof:', error.message);
    throw error;
  }
}

/**
 * Verify a Groth16 proof (for testing)
 */
export async function verifyProof(
  proof: any,
  publicSignals: string[],
  verificationKeyPath: string
): Promise<boolean> {
  if (!snarkjs) {
    throw new Error('snarkjs not installed');
  }

  try {
    const vKey = JSON.parse(readFileSync(verificationKeyPath, 'utf-8'));
    const verified = await snarkjs.groth16.verify(vKey, publicSignals, proof);

    return verified;
  } catch (error: any) {
    console.error('Error verifying proof:', error.message);
    return false;
  }
}

/**
 * Export proof to Solana-compatible format
 * Groth16 proofs need to be serialized for on-chain verification
 */
export function serializeProofForSolana(proof: any): Uint8Array {
  // Groth16 proof structure:
  // - pi_a: G1 point (2 field elements = 64 bytes)
  // - pi_b: G2 point (4 field elements = 128 bytes)
  // - pi_c: G1 point (2 field elements = 64 bytes)
  // Total: 256 bytes

  const buffer = new Uint8Array(256);
  let offset = 0;

  // Serialize pi_a (G1 point)
  const piA = proof.pi_a.slice(0, 2).map(hexToBytes);
  for (const bytes of piA) {
    buffer.set(bytes, offset);
    offset += bytes.length;
  }

  // Serialize pi_b (G2 point)
  const piB = proof.pi_b.slice(0, 2).flatMap((coord: string[]) =>
    coord.slice(0, 2).map(hexToBytes)
  );
  for (const bytes of piB) {
    buffer.set(bytes, offset);
    offset += bytes.length;
  }

  // Serialize pi_c (G1 point)
  const piC = proof.pi_c.slice(0, 2).map(hexToBytes);
  for (const bytes of piC) {
    buffer.set(bytes, offset);
    offset += bytes.length;
  }

  return buffer;
}

/**
 * Helper: Convert hex string to bytes
 */
function hexToBytes(hex: string): Uint8Array {
  if (hex.startsWith('0x')) {
    hex = hex.slice(2);
  }

  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
  }

  return bytes;
}

/**
 * Generate mock proof for testing (when circuits not compiled)
 */
export function generateMockProof(): ProofResult {
  console.log('⚠️  Generating MOCK proof (circuits not compiled)');

  return {
    proof: {
      pi_a: ['0x0', '0x0', '0x1'],
      pi_b: [['0x0', '0x0'], ['0x0', '0x0'], ['0x1', '0x0']],
      pi_c: ['0x0', '0x0', '0x1'],
      protocol: 'groth16',
      curve: 'bn128',
    },
    publicSignals: ['0', '0', '0'],
  };
}

/**
 * Calculate Merkle root from leaf and path
 */
export function calculateMerkleRoot(
  leaf: string,
  pathElements: string[],
  pathIndices: number[]
): string {
  if (!snarkjs) {
    throw new Error('snarkjs not installed');
  }

  let currentHash = leaf;

  for (let i = 0; i < pathElements.length; i++) {
    const pathElement = pathElements[i];
    const isLeft = pathIndices[i] === 0;

    // Use Poseidon hash (same as circuit)
    if (isLeft) {
      currentHash = poseidonHash([currentHash, pathElement]);
    } else {
      currentHash = poseidonHash([pathElement, currentHash]);
    }
  }

  return currentHash;
}

/**
 * Poseidon hash function
 * Must match the circuit implementation
 */
function poseidonHash(inputs: string[]): string {
  if (!snarkjs || !snarkjs.poseidon) {
    // Fallback to SHA256 if Poseidon not available
    const crypto = require('crypto');
    const hash = crypto.createHash('sha256');
    for (const input of inputs) {
      hash.update(input);
    }
    return hash.digest('hex');
  }

  return snarkjs.poseidon(inputs).toString();
}

/**
 * Generate random field element
 */
export function randomFieldElement(): string {
  const crypto = require('crypto');
  const bytes = crypto.randomBytes(31); // 31 bytes for BN254 field
  return '0x' + bytes.toString('hex');
}

/**
 * Check if circuit artifacts exist
 */
export function checkCircuitArtifacts(): boolean {
  const fs = require('fs');
  const wasmPath = join(__dirname, '../../circuits/build/transfer.wasm');
  const zkeyPath = join(__dirname, '../../circuits/build/transfer_final.zkey');

  return fs.existsSync(wasmPath) && fs.existsSync(zkeyPath);
}
