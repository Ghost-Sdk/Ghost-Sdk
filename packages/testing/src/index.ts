/**
 * Ghost SDK Testing Framework
 *
 * Comprehensive testing utilities for Ghost SDK privacy features
 */

// Export all mocks
export {
  MockConnection,
  MockProofGenerator,
  MockRingSignatureGenerator,
  MockShieldedPool,
  createMockCommitment,
  createMockNullifier,
} from './utils/mocks';

// Export all helpers
export {
  TEST_PROGRAM_ID,
  TEST_ADDRESSES,
  TEST_AMOUNTS,
  assertValidProof,
  assertValidRingSignature,
  assertValidCommitment,
  assertValidNullifier,
  assertValidStealthAddress,
  randomBytes,
  randomBigInt,
  hashToScalar,
  arraysEqual,
  shuffleArray,
  sleep,
  timestamp,
  generateTestRing,
  generateTestCommitments,
  generateTestNullifiers,
  buildTestTransaction,
  buildTestProposal,
  expectError,
  expectAsyncError,
  benchmark,
  TestLogger,
} from './utils/helpers';

// Re-export common types for convenience
export type { PerformanceMetrics } from './utils/helpers';
