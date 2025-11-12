/**
 * ZK Proof Generation Module
 * Generates Groth16 proofs using snarkjs and compiled circuits
 */

import * as snarkjs from 'snarkjs';
import * as fs from 'fs';
import * as path from 'path';

export interface ProofInput {
  amount?: number;
  privateKey?: string;
  pathElements?: string[];
  pathIndices?: number[];
  recipientPublicKey?: string;
  nonce?: string;
  oldNonce?: string;
  commitment?: string;
  nullifier?: string;
  root?: string;
  ringMembers?: string[];
}

export interface GeneratedProof {
  proof: any;
  publicSignals: string[];
}

export class ZKProofGenerator {
  private circuitsPath: string;

  constructor(circuitsPath: string = '../circuits/build') {
    this.circuitsPath = path.resolve(__dirname, circuitsPath);
  }

  /**
   * Convert hex string to BigInt string (decimal representation)
   */
  private hexToBigInt(hex: string): string {
    if (hex === '0' || !hex) return '0';
    // Remove 0x prefix if present
    const cleanHex = hex.startsWith('0x') ? hex.slice(2) : hex;
    return BigInt('0x' + cleanHex).toString();
  }

  /**
   * Generate a private transfer proof
   * Proves you can spend a commitment without revealing amount/sender
   */
  async generateTransferProof(input: ProofInput): Promise<GeneratedProof> {
    const wasmPath = path.join(this.circuitsPath, 'transfer_js', 'transfer.wasm');
    const zkeyPath = path.join(this.circuitsPath, 'transfer_0001.zkey');

    // Build circuit input (convert hex strings to BigInt strings)
    const circuitInput = {
      // Public inputs
      root: this.hexToBigInt(input.root || '0'),
      nullifier: this.hexToBigInt(input.nullifier || '0'),
      newCommitment: this.hexToBigInt(input.commitment || '0'),
      // Private inputs
      amount: input.amount || 0,
      privateKey: this.hexToBigInt(input.privateKey || '0'),
      pathElements: (input.pathElements || Array(20).fill('0')).map(e => this.hexToBigInt(e)),
      pathIndices: input.pathIndices || Array(20).fill(0),
      recipientPublicKey: this.hexToBigInt(input.recipientPublicKey || '0'),
      nonce: this.hexToBigInt(input.nonce || '0'), // New nonce for new commitment
      oldNonce: this.hexToBigInt(input.oldNonce || input.privateKey || '0'), // Old nonce from spent note
    };

    console.log('Generating transfer proof...');
    console.log('Circuit input:', JSON.stringify(circuitInput, null, 2));

    // Generate proof
    const { proof, publicSignals } = await snarkjs.groth16.fullProve(
      circuitInput,
      wasmPath,
      zkeyPath
    );

    console.log('✅ Transfer proof generated successfully');
    console.log('Public signals:', publicSignals);

    return { proof, publicSignals };
  }

  /**
   * Generate a balance proof
   * Proves you have at least X amount without revealing exact balance
   */
  async generateBalanceProof(input: ProofInput): Promise<GeneratedProof> {
    const wasmPath = path.join(this.circuitsPath, 'balance_js', 'balance.wasm');
    const zkeyPath = path.join(this.circuitsPath, 'balance_0001.zkey');

    const circuitInput = {
      balance: input.amount || 0,
      minBalance: Math.floor((input.amount || 0) / 2), // Prove at least half
      nonce: this.hexToBigInt(input.nonce || '0'),
    };

    console.log('Generating balance proof...');

    const { proof, publicSignals } = await snarkjs.groth16.fullProve(
      circuitInput,
      wasmPath,
      zkeyPath
    );

    console.log('Balance proof generated successfully');

    return { proof, publicSignals };
  }

  /**
   * Generate a ring signature proof
   * Proves you're one of N signers without revealing which one
   */
  async generateRingSignatureProof(input: ProofInput): Promise<GeneratedProof> {
    const wasmPath = path.join(this.circuitsPath, 'ring_signature_js', 'ring_signature.wasm');
    const zkeyPath = path.join(this.circuitsPath, 'ring_signature_0001.zkey');

    // For ring size of 4
    const ringSize = 4;
    const ringMembers = input.ringMembers || [];

    // Convert ring members to BigInt strings, pad if needed
    const ringPublicKeys = [];
    for (let i = 0; i < ringSize; i++) {
      if (i < ringMembers.length) {
        ringPublicKeys.push(this.hexToBigInt(ringMembers[i]));
      } else {
        ringPublicKeys.push('0');
      }
    }

    const circuitInput = {
      privateKey: this.hexToBigInt(input.privateKey || '0'),
      message: this.hexToBigInt(input.nullifier || '0'),
      ringPublicKeys: ringPublicKeys,
      signerIndex: 0, // Your position in ring
    };

    console.log('Generating ring signature proof...');

    const { proof, publicSignals } = await snarkjs.groth16.fullProve(
      circuitInput,
      wasmPath,
      zkeyPath
    );

    console.log('✅ Ring signature proof generated successfully');
    return { proof, publicSignals };
  }

  /**
   * Verify a proof (for testing)
   */
  async verifyProof(
    circuitType: 'transfer' | 'balance' | 'ring_signature',
    proof: any,
    publicSignals: string[]
  ): Promise<boolean> {
    const vkeyPath = path.join(
      this.circuitsPath,
      `${circuitType}_verification_key.json`
    );

    const vkey = JSON.parse(fs.readFileSync(vkeyPath, 'utf-8'));

    const isValid = await snarkjs.groth16.verify(vkey, publicSignals, proof);

    console.log(`Proof verification: ${isValid ? 'VALID' : 'INVALID'}`);

    return isValid;
  }

  /**
   * Export proof to Solana-compatible format
   */
  exportProofForSolana(proof: any): {
    a: [string, string];
    b: [[string, string], [string, string]];
    c: [string, string];
  } {
    return {
      a: [proof.pi_a[0], proof.pi_a[1]],
      b: [
        [proof.pi_b[0][1], proof.pi_b[0][0]],
        [proof.pi_b[1][1], proof.pi_b[1][0]],
      ],
      c: [proof.pi_c[0], proof.pi_c[1]],
    };
  }

  /**
   * Convert public signals to bytes for Solana
   */
  exportPublicSignalsForSolana(publicSignals: string[]): Buffer[] {
    return publicSignals.map((signal) => {
      const bn = BigInt(signal);
      const buf = Buffer.alloc(32);

      // Convert BigInt to 32-byte buffer (little-endian)
      let value = bn;
      for (let i = 0; i < 32; i++) {
        buf[i] = Number(value & BigInt(0xff));
        value = value >> BigInt(8);
      }

      return buf;
    });
  }
}

// Example usage
export async function testProofGeneration() {
  const generator = new ZKProofGenerator();

  try {
    // Test transfer proof
    console.log('\n=== Testing Transfer Proof ===');
    const transferProof = await generator.generateTransferProof({
      amount: 100,
      privateKey: '12345',
      nonce: '67890',
    });

    const isValid = await generator.verifyProof(
      'transfer',
      transferProof.proof,
      transferProof.publicSignals
    );

    console.log('Transfer proof valid:', isValid);

    // Export for Solana
    const solanaProof = generator.exportProofForSolana(transferProof.proof);
    console.log('Solana-compatible proof:', JSON.stringify(solanaProof, null, 2));

  } catch (error) {
    console.error('Proof generation failed:', error);
  }
}
