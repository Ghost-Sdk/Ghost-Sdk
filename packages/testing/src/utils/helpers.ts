import { PublicKey, Keypair, Connection } from '@solana/web3.js';

/**
 * Test fixtures and helper functions
 */

export const TEST_PROGRAM_ID = new PublicKey('GhostPrivacy11111111111111111111111111111111');

export const TEST_ADDRESSES = {
  alice: Keypair.generate(),
  bob: Keypair.generate(),
  charlie: Keypair.generate(),
  dave: Keypair.generate(),
};

export const TEST_AMOUNTS = {
  small: 1_000_000, // 0.001 SOL
  medium: 100_000_000, // 0.1 SOL
  large: 1_000_000_000, // 1 SOL
  xlarge: 10_000_000_000, // 10 SOL
};

/**
 * Assertion helpers
 */
export function assertValidProof(proof: any): void {
  expect(proof).toBeDefined();
  expect(proof).toHaveProperty('pi_a');
  expect(proof).toHaveProperty('pi_b');
  expect(proof).toHaveProperty('pi_c');
  expect(Array.isArray(proof.pi_a)).toBe(true);
  expect(Array.isArray(proof.pi_b)).toBe(true);
  expect(Array.isArray(proof.pi_c)).toBe(true);
}

export function assertValidRingSignature(signature: any): void {
  expect(signature).toBeDefined();
  expect(signature).toHaveProperty('signature');
  expect(signature).toHaveProperty('ring');
  expect(signature).toHaveProperty('keyImage');
  expect(Array.isArray(signature.ring)).toBe(true);
  expect(signature.ring.length).toBeGreaterThan(0);
}

export function assertValidCommitment(commitment: any): void {
  expect(commitment).toBeDefined();
  expect(commitment instanceof Uint8Array).toBe(true);
  expect(commitment.length).toBeGreaterThan(0);
}

export function assertValidNullifier(nullifier: any): void {
  expect(nullifier).toBeDefined();
  expect(nullifier instanceof Uint8Array).toBe(true);
  expect(nullifier.length).toBe(32);
}

export function assertValidStealthAddress(address: any): void {
  expect(address).toBeDefined();
  expect(address).toHaveProperty('address');
  expect(address).toHaveProperty('viewTag');
  expect(typeof address.address).toBe('string');
}

/**
 * Crypto helpers
 */
export function randomBytes(length: number): Uint8Array {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return bytes;
}

export function randomBigInt(max: bigint): bigint {
  const bytes = randomBytes(32);
  let result = 0n;
  for (let i = 0; i < bytes.length; i++) {
    result = (result << 8n) + BigInt(bytes[i]);
  }
  return result % max;
}

export function hashToScalar(data: Uint8Array): bigint {
  // Simple mock hash function
  let result = 0n;
  for (let i = 0; i < Math.min(data.length, 32); i++) {
    result = (result << 8n) + BigInt(data[i]);
  }
  return result;
}

/**
 * Array helpers
 */
export function arraysEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

export function shuffleArray<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/**
 * Time helpers
 */
export async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export function timestamp(): number {
  return Math.floor(Date.now() / 1000);
}

/**
 * Test data generators
 */
export function generateTestRing(size: number): PublicKey[] {
  return Array.from({ length: size }, () => Keypair.generate().publicKey);
}

export function generateTestCommitments(count: number): Uint8Array[] {
  return Array.from({ length: count }, () => randomBytes(64));
}

export function generateTestNullifiers(count: number): Uint8Array[] {
  return Array.from({ length: count }, () => randomBytes(32));
}

/**
 * Mock data builders
 */
export interface TestTransactionParams {
  from?: PublicKey;
  to?: PublicKey;
  amount?: number;
  ringSize?: number;
  memo?: string;
}

export function buildTestTransaction(params: TestTransactionParams = {}) {
  return {
    from: params.from || TEST_ADDRESSES.alice.publicKey,
    to: params.to || TEST_ADDRESSES.bob.publicKey,
    amount: params.amount || TEST_AMOUNTS.medium,
    ringSize: params.ringSize || 11,
    memo: params.memo || '',
    timestamp: timestamp(),
  };
}

export interface TestProposalParams {
  title?: string;
  options?: string[];
  duration?: number;
}

export function buildTestProposal(params: TestProposalParams = {}) {
  return {
    title: params.title || 'Test Proposal',
    options: params.options || ['Yes', 'No'],
    startTime: timestamp(),
    endTime: timestamp() + (params.duration || 7 * 24 * 60 * 60), // 7 days
  };
}

/**
 * Error helpers
 */
export function expectError(fn: () => any, expectedMessage?: string): void {
  let error: Error | undefined;

  try {
    fn();
  } catch (e) {
    error = e as Error;
  }

  expect(error).toBeDefined();
  if (expectedMessage) {
    expect(error?.message).toContain(expectedMessage);
  }
}

export async function expectAsyncError(
  fn: () => Promise<any>,
  expectedMessage?: string
): Promise<void> {
  let error: Error | undefined;

  try {
    await fn();
  } catch (e) {
    error = e as Error;
  }

  expect(error).toBeDefined();
  if (expectedMessage) {
    expect(error?.message).toContain(expectedMessage);
  }
}

/**
 * Performance helpers
 */
export interface PerformanceMetrics {
  min: number;
  max: number;
  avg: number;
  median: number;
  p95: number;
  p99: number;
}

export async function benchmark(
  fn: () => Promise<void>,
  iterations: number = 100
): Promise<PerformanceMetrics> {
  const times: number[] = [];

  for (let i = 0; i < iterations; i++) {
    const start = performance.now();
    await fn();
    const duration = performance.now() - start;
    times.push(duration);
  }

  times.sort((a, b) => a - b);

  return {
    min: times[0],
    max: times[times.length - 1],
    avg: times.reduce((a, b) => a + b, 0) / times.length,
    median: times[Math.floor(times.length / 2)],
    p95: times[Math.floor(times.length * 0.95)],
    p99: times[Math.floor(times.length * 0.99)],
  };
}

/**
 * Logging helpers for tests
 */
export class TestLogger {
  private logs: string[] = [];

  log(message: string): void {
    this.logs.push(`[${new Date().toISOString()}] ${message}`);
  }

  error(message: string): void {
    this.logs.push(`[${new Date().toISOString()}] ERROR: ${message}`);
  }

  getLogs(): string[] {
    return [...this.logs];
  }

  clear(): void {
    this.logs = [];
  }

  print(): void {
    this.logs.forEach(log => console.log(log));
  }
}
