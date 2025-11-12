import { Connection, Keypair, PublicKey, Transaction } from '@solana/web3.js';

/**
 * Mock Solana Connection for testing
 */
export class MockConnection {
  private mockData: Map<string, any> = new Map();

  async getBalance(publicKey: PublicKey): Promise<number> {
    return this.mockData.get(`balance:${publicKey.toBase58()}`) || 1000000000; // 1 SOL
  }

  async getAccountInfo(publicKey: PublicKey): Promise<any> {
    return this.mockData.get(`account:${publicKey.toBase58()}`) || null;
  }

  async sendTransaction(transaction: Transaction): Promise<string> {
    return 'mock_signature_' + Math.random().toString(36).substring(7);
  }

  async confirmTransaction(signature: string): Promise<any> {
    return { value: { err: null } };
  }

  async getRecentBlockhash(): Promise<any> {
    return {
      blockhash: 'mock_blockhash_' + Math.random().toString(36).substring(7),
      feeCalculator: { lamportsPerSignature: 5000 },
    };
  }

  setMockData(key: string, value: any): void {
    this.mockData.set(key, value);
  }

  clearMockData(): void {
    this.mockData.clear();
  }
}

/**
 * Mock ZK Proof Generator
 */
export class MockProofGenerator {
  async generateProof(input: any): Promise<any> {
    // Simulate proof generation delay
    await new Promise(resolve => setTimeout(resolve, 100));

    return {
      pi_a: ['0x1234', '0x5678', '0x9abc'],
      pi_b: [
        ['0xdef0', '0x1234'],
        ['0x5678', '0x9abc'],
        ['0xdef0', '0x1234'],
      ],
      pi_c: ['0x5678', '0x9abc', '0xdef0'],
      protocol: 'groth16',
      curve: 'bn128',
    };
  }

  async verifyProof(proof: any, publicInputs: any): Promise<boolean> {
    // Mock verification - always returns true for testing
    await new Promise(resolve => setTimeout(resolve, 50));
    return true;
  }
}

/**
 * Mock Ring Signature Generator
 */
export class MockRingSignatureGenerator {
  async generateRingSignature(params: {
    message: Uint8Array;
    ringSize: number;
    signerIndex: number;
  }): Promise<any> {
    await new Promise(resolve => setTimeout(resolve, 100));

    const ring = Array.from({ length: params.ringSize }, (_, i) => ({
      publicKey: Keypair.generate().publicKey.toBase58(),
    }));

    return {
      signature: new Uint8Array(64),
      ring,
      keyImage: new Uint8Array(32),
      c: new Uint8Array(32),
      r: Array.from({ length: params.ringSize }, () => new Uint8Array(32)),
    };
  }

  async verifyRingSignature(signature: any, message: Uint8Array): Promise<boolean> {
    await new Promise(resolve => setTimeout(resolve, 50));
    return true;
  }
}

/**
 * Mock Shielded Pool
 */
export class MockShieldedPool {
  private commitments: Set<string> = new Set();
  private nullifiers: Set<string> = new Set();
  private balances: Map<string, number> = new Map();

  async deposit(amount: number, commitment: Uint8Array): Promise<string> {
    const commitmentHash = Buffer.from(commitment).toString('hex');
    this.commitments.add(commitmentHash);
    return 'mock_deposit_tx_' + Math.random().toString(36).substring(7);
  }

  async withdraw(
    amount: number,
    nullifier: Uint8Array,
    proof: any
  ): Promise<string> {
    const nullifierHash = Buffer.from(nullifier).toString('hex');

    if (this.nullifiers.has(nullifierHash)) {
      throw new Error('Nullifier already used');
    }

    this.nullifiers.add(nullifierHash);
    return 'mock_withdraw_tx_' + Math.random().toString(36).substring(7);
  }

  async transfer(params: {
    amount: number;
    inputNullifier: Uint8Array;
    outputCommitment: Uint8Array;
    proof: any;
  }): Promise<string> {
    const nullifierHash = Buffer.from(params.inputNullifier).toString('hex');
    const commitmentHash = Buffer.from(params.outputCommitment).toString('hex');

    if (this.nullifiers.has(nullifierHash)) {
      throw new Error('Nullifier already used');
    }

    this.nullifiers.add(nullifierHash);
    this.commitments.add(commitmentHash);

    return 'mock_transfer_tx_' + Math.random().toString(36).substring(7);
  }

  hasCommitment(commitment: Uint8Array): boolean {
    const hash = Buffer.from(commitment).toString('hex');
    return this.commitments.has(hash);
  }

  hasNullifier(nullifier: Uint8Array): boolean {
    const hash = Buffer.from(nullifier).toString('hex');
    return this.nullifiers.has(hash);
  }

  reset(): void {
    this.commitments.clear();
    this.nullifiers.clear();
    this.balances.clear();
  }
}

/**
 * Generate test keypairs
 */
export function generateTestKeypair(): Keypair {
  return Keypair.generate();
}

/**
 * Generate test public keys
 */
export function generateTestPublicKeys(count: number): PublicKey[] {
  return Array.from({ length: count }, () => Keypair.generate().publicKey);
}

/**
 * Create mock commitment
 */
export function createMockCommitment(amount: number, randomness?: Uint8Array): Uint8Array {
  const buffer = Buffer.alloc(64);
  buffer.writeUInt32BE(amount, 0);

  if (randomness) {
    randomness.forEach((byte, i) => {
      buffer[4 + i] = byte;
    });
  } else {
    // Random bytes
    crypto.getRandomValues(buffer.slice(4, 36));
  }

  return new Uint8Array(buffer);
}

/**
 * Create mock nullifier
 */
export function createMockNullifier(): Uint8Array {
  const buffer = new Uint8Array(32);
  crypto.getRandomValues(buffer);
  return buffer;
}

/**
 * Wait for a condition to be true
 */
export async function waitFor(
  condition: () => boolean | Promise<boolean>,
  timeout: number = 5000,
  interval: number = 100
): Promise<void> {
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    if (await condition()) {
      return;
    }
    await new Promise(resolve => setTimeout(resolve, interval));
  }

  throw new Error(`Timeout waiting for condition after ${timeout}ms`);
}

/**
 * Measure execution time
 */
export async function measureTime<T>(
  fn: () => Promise<T>
): Promise<{ result: T; duration: number }> {
  const start = performance.now();
  const result = await fn();
  const duration = performance.now() - start;
  return { result, duration };
}
