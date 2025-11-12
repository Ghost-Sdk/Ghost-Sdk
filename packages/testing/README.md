# @ghost-sdk/testing

Comprehensive testing framework for Ghost SDK - privacy-preserving blockchain operations.

## Overview

This package provides testing utilities, mock implementations, and test examples for building and testing privacy features with Ghost SDK.

## Features

- **Mock Implementations**: Realistic mocks for ZK proofs, ring signatures, and shielded pools
- **Test Helpers**: Utilities for assertions, data generation, and performance testing
- **Unit Tests**: Examples for testing individual components
- **Integration Tests**: Examples for testing component interactions
- **E2E Tests**: Complete user flow scenarios
- **Custom Matchers**: Jest matchers for privacy-specific assertions
- **Performance Benchmarking**: Tools for measuring crypto operation performance

## Installation

```bash
npm install --save-dev @ghost-sdk/testing
```

## Quick Start

### Basic Test Setup

```typescript
import {
  MockProofGenerator,
  MockRingSignatureGenerator,
  MockShieldedPool,
  assertValidProof,
  randomBytes,
} from '@ghost-sdk/testing';

describe('My Privacy Feature', () => {
  let proofGenerator: MockProofGenerator;
  let pool: MockShieldedPool;

  beforeEach(() => {
    proofGenerator = new MockProofGenerator();
    pool = new MockShieldedPool();
  });

  it('should generate valid proof', async () => {
    const proof = await proofGenerator.generateProof({
      amount: 1000,
      recipient: randomBytes(32),
    });

    assertValidProof(proof);
  });
});
```

## Mock Implementations

### MockProofGenerator

Simulates ZK-SNARK proof generation and verification.

```typescript
import { MockProofGenerator } from '@ghost-sdk/testing';

const generator = new MockProofGenerator();

// Generate proof
const proof = await generator.generateProof({
  amount: 1000,
  commitment: randomBytes(64),
  nullifier: randomBytes(32),
});

// Verify proof
const isValid = await generator.verifyProof(proof, publicInputs);
```

### MockRingSignatureGenerator

Simulates Monero-style ring signature generation.

```typescript
import { MockRingSignatureGenerator } from '@ghost-sdk/testing';

const generator = new MockRingSignatureGenerator();

// Generate ring signature
const signature = await generator.generateRingSignature({
  message: randomBytes(32),
  ringSize: 11,
  signerIndex: 5,
});

// Verify signature
const isValid = await generator.verifyRingSignature(signature, message);
```

### MockShieldedPool

Simulates a Zcash-style shielded pool for private transactions.

```typescript
import { MockShieldedPool, createMockCommitment } from '@ghost-sdk/testing';

const pool = new MockShieldedPool();

// Deposit
const commitment = createMockCommitment(1000);
const tx = await pool.deposit(1000, commitment);

// Withdraw
const nullifier = createMockNullifier();
const proof = await proofGenerator.generateProof({ ... });
await pool.withdraw(1000, nullifier, proof);

// Transfer
await pool.transfer({
  amount: 1000,
  inputNullifier,
  outputCommitment,
  proof,
});
```

### MockConnection

Simulates Solana Connection for testing.

```typescript
import { MockConnection } from '@ghost-sdk/testing';

const connection = new MockConnection();

// Set mock data
connection.setMockData('balance:pubkey', 1000000000);

// Use like normal Connection
const balance = await connection.getBalance(publicKey);
```

## Test Helpers

### Assertion Helpers

```typescript
import {
  assertValidProof,
  assertValidRingSignature,
  assertValidCommitment,
  assertValidNullifier,
} from '@ghost-sdk/testing';

// Assert ZK proof structure
assertValidProof(proof);

// Assert ring signature structure
assertValidRingSignature(signature);

// Assert commitment format
assertValidCommitment(commitment);

// Assert nullifier format
assertValidNullifier(nullifier);
```

### Data Generation

```typescript
import {
  randomBytes,
  generateTestRing,
  generateTestCommitments,
  createMockCommitment,
  createMockNullifier,
} from '@ghost-sdk/testing';

// Generate random bytes
const bytes = randomBytes(32);

// Generate ring of public keys
const ring = generateTestRing(11);

// Generate test commitments
const commitments = generateTestCommitments(10);

// Create specific commitment
const commitment = createMockCommitment(1000);

// Create nullifier
const nullifier = createMockNullifier();
```

### Test Constants

```typescript
import { TEST_ADDRESSES, TEST_AMOUNTS } from '@ghost-sdk/testing';

// Pre-generated test keypairs
const alice = TEST_ADDRESSES.alice;
const bob = TEST_ADDRESSES.bob;

// Standard test amounts
const amount = TEST_AMOUNTS.large; // 1 SOL
```

### Error Testing

```typescript
import { expectError, expectAsyncError } from '@ghost-sdk/testing';

// Test synchronous errors
expectError(() => {
  throw new Error('Expected error');
}, 'Expected error');

// Test async errors
await expectAsyncError(async () => {
  throw new Error('Async error');
}, 'Async error');
```

### Performance Testing

```typescript
import { benchmark } from '@ghost-sdk/testing';

const metrics = await benchmark(async () => {
  await expensiveOperation();
}, 100); // 100 iterations

console.log(`Average: ${metrics.avg.toFixed(2)}ms`);
console.log(`P95: ${metrics.p95.toFixed(2)}ms`);
console.log(`P99: ${metrics.p99.toFixed(2)}ms`);
```

### Logging

```typescript
import { TestLogger } from '@ghost-sdk/testing';

const logger = new TestLogger();

logger.log('Test started');
logger.error('Error occurred');

// Get all logs
const logs = logger.getLogs();

// Print logs
logger.print();

// Clear logs
logger.clear();
```

## Custom Jest Matchers

```typescript
// Check if value is valid PublicKey
expect(publicKey).toBeValidPublicKey();

// Check if value is valid signature
expect(signature).toBeValidSignature();

// Check if value is valid ZK proof
expect(proof).toBeValidProof();
```

## Test Examples

### Unit Test Example

```typescript
import { MockProofGenerator, assertValidProof } from '@ghost-sdk/testing';

describe('Proof Generation', () => {
  it('should generate valid proof', async () => {
    const generator = new MockProofGenerator();
    const proof = await generator.generateProof({
      amount: 1000,
      recipient: randomBytes(32),
    });

    assertValidProof(proof);
    expect(proof.protocol).toBe('groth16');
  });
});
```

### Integration Test Example

```typescript
import {
  MockShieldedPool,
  MockProofGenerator,
  createMockCommitment,
  createMockNullifier,
} from '@ghost-sdk/testing';

describe('Shielded Pool', () => {
  it('should prevent double withdrawal', async () => {
    const pool = new MockShieldedPool();
    const generator = new MockProofGenerator();

    const commitment = createMockCommitment(1000);
    await pool.deposit(1000, commitment);

    const nullifier = createMockNullifier();
    const proof = await generator.generateProof({
      amount: 1000,
      commitment,
      nullifier,
    });

    await pool.withdraw(1000, nullifier, proof);

    // Second withdrawal should fail
    await expect(
      pool.withdraw(1000, nullifier, proof)
    ).rejects.toThrow('Nullifier already used');
  });
});
```

### E2E Test Example

```typescript
import {
  MockShieldedPool,
  MockProofGenerator,
  MockRingSignatureGenerator,
  TEST_ADDRESSES,
  TEST_AMOUNTS,
} from '@ghost-sdk/testing';

describe('Complete Privacy Flow', () => {
  it('should complete private payment', async () => {
    const pool = new MockShieldedPool();
    const proofGen = new MockProofGenerator();
    const ringGen = new MockRingSignatureGenerator();

    // 1. Deposit
    const commitment = createMockCommitment(TEST_AMOUNTS.large);
    await pool.deposit(TEST_AMOUNTS.large, commitment);

    // 2. Generate proofs
    const proof = await proofGen.generateProof({ ... });
    const ringSignature = await ringGen.generateRingSignature({ ... });

    // 3. Transfer
    const tx = await pool.transfer({ ... });

    // 4. Verify privacy
    expect(pool.hasCommitment(commitment)).toBe(true);
  });
});
```

## Running Tests

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run specific test types
npm run test:unit
npm run test:integration
npm run test:e2e

# Watch mode
npm run test:watch
```

## Coverage

The testing framework aims for high code coverage:

- Branches: 80%
- Functions: 80%
- Lines: 80%
- Statements: 80%

## Best Practices

### 1. Use Mocks for External Dependencies

```typescript
// Good: Use mocks
const connection = new MockConnection();

// Avoid: Real connections in tests
const connection = new Connection('https://api.devnet.solana.com');
```

### 2. Test Privacy Properties

```typescript
it('should hide transaction amount', async () => {
  const commitment = createMockCommitment(1000);

  // Verify amount is not exposed
  expect(commitment).not.toContain('1000');

  // Verify commitment is encrypted
  expect(commitment instanceof Uint8Array).toBe(true);
});
```

### 3. Test Error Cases

```typescript
it('should reject invalid proof', async () => {
  const invalidProof = { invalid: true };

  await expectAsyncError(
    async () => await verifyProof(invalidProof),
    'Invalid proof'
  );
});
```

### 4. Benchmark Performance

```typescript
it('should generate proof quickly', async () => {
  const metrics = await benchmark(async () => {
    await generator.generateProof({ ... });
  }, 50);

  expect(metrics.avg).toBeLessThan(200); // < 200ms average
});
```

### 5. Clean Up After Tests

```typescript
afterEach(() => {
  pool.reset();
  connection.clearMockData();
  logger.clear();
});
```

## Architecture

```
@ghost-sdk/testing/
├── src/
│   ├── __tests__/
│   │   ├── unit/              # Unit tests
│   │   ├── integration/       # Integration tests
│   │   └── e2e/               # End-to-end tests
│   ├── utils/
│   │   ├── mocks.ts          # Mock implementations
│   │   └── helpers.ts        # Test helpers
│   ├── setup.ts              # Jest setup
│   └── index.ts              # Main exports
├── jest.config.js            # Jest configuration
└── package.json
```

## Contributing

When adding new test utilities:

1. Add the utility to `utils/mocks.ts` or `utils/helpers.ts`
2. Export it from `index.ts`
3. Add tests in `__tests__/`
4. Update this README with examples
5. Ensure coverage thresholds are met

## Privacy Testing Checklist

When testing privacy features, ensure:

- [ ] Amounts are hidden (commitments)
- [ ] Sender is anonymous (ring signatures)
- [ ] Recipient is anonymous (stealth addresses)
- [ ] Transactions are unlinkable (nullifiers)
- [ ] Proofs are valid but reveal nothing
- [ ] Double-spending is prevented
- [ ] Replay attacks are prevented

## Performance Targets

Mock implementations should complete within:

- Proof generation: < 150ms
- Ring signature: < 150ms
- Proof verification: < 100ms
- Deposit/Withdraw/Transfer: < 50ms

## License

MIT

## Related Packages

- `@ghost-sdk/core` - Core Ghost SDK functionality
- `@ghost-sdk/monero` - Monero privacy features
- `@ghost-sdk/zcash` - Zcash shielded assets
- `@ghost-sdk/integrations` - Ultimate privacy client
