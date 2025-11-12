/**
 * Jest setup file
 * This file runs before all tests
 */

// Increase timeout for crypto operations
jest.setTimeout(30000);

// Mock console methods in tests if needed
global.console = {
  ...console,
  // Uncomment to silence console logs in tests
  // log: jest.fn(),
  // debug: jest.fn(),
  // info: jest.fn(),
  // warn: jest.fn(),
  // error: jest.fn(),
};

// Add custom matchers
expect.extend({
  toBeValidPublicKey(received: any) {
    const pass = received && typeof received === 'object' && received.toBase58;

    return {
      message: () =>
        pass
          ? `expected ${received} not to be a valid PublicKey`
          : `expected ${received} to be a valid PublicKey`,
      pass,
    };
  },

  toBeValidSignature(received: any) {
    const pass = received && typeof received === 'string' && received.length === 88;

    return {
      message: () =>
        pass
          ? `expected ${received} not to be a valid signature`
          : `expected ${received} to be a valid signature (base58 string of length 88)`,
      pass,
    };
  },

  toBeValidProof(received: any) {
    const pass =
      received &&
      typeof received === 'object' &&
      received.pi_a &&
      received.pi_b &&
      received.pi_c;

    return {
      message: () =>
        pass
          ? `expected ${received} not to be a valid ZK proof`
          : `expected ${received} to be a valid ZK proof with pi_a, pi_b, pi_c`,
      pass,
    };
  },
});

// Extend Jest matchers TypeScript definitions
declare global {
  namespace jest {
    interface Matchers<R> {
      toBeValidPublicKey(): R;
      toBeValidSignature(): R;
      toBeValidProof(): R;
    }
  }
}

export {};
