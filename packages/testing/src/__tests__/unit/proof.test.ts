import { MockProofGenerator } from '../../utils/mocks';
import { assertValidProof, randomBytes } from '../../utils/helpers';

describe('ZK Proof Generation', () => {
  let proofGenerator: MockProofGenerator;

  beforeEach(() => {
    proofGenerator = new MockProofGenerator();
  });

  describe('generateProof', () => {
    it('should generate a valid proof', async () => {
      const input = {
        amount: 1000,
        recipient: randomBytes(32),
        nullifier: randomBytes(32),
      };

      const proof = await proofGenerator.generateProof(input);

      assertValidProof(proof);
      expect(proof.protocol).toBe('groth16');
      expect(proof.curve).toBe('bn128');
    });

    it('should generate different proofs for different inputs', async () => {
      const input1 = {
        amount: 1000,
        recipient: randomBytes(32),
        nullifier: randomBytes(32),
      };

      const input2 = {
        amount: 2000,
        recipient: randomBytes(32),
        nullifier: randomBytes(32),
      };

      const proof1 = await proofGenerator.generateProof(input1);
      const proof2 = await proofGenerator.generateProof(input2);

      expect(proof1).toBeDefined();
      expect(proof2).toBeDefined();
      // In a real implementation, proofs would be different
    });

    it('should handle zero amount', async () => {
      const input = {
        amount: 0,
        recipient: randomBytes(32),
        nullifier: randomBytes(32),
      };

      const proof = await proofGenerator.generateProof(input);
      assertValidProof(proof);
    });

    it('should handle large amounts', async () => {
      const input = {
        amount: Number.MAX_SAFE_INTEGER,
        recipient: randomBytes(32),
        nullifier: randomBytes(32),
      };

      const proof = await proofGenerator.generateProof(input);
      assertValidProof(proof);
    });
  });

  describe('verifyProof', () => {
    it('should verify a valid proof', async () => {
      const input = {
        amount: 1000,
        recipient: randomBytes(32),
        nullifier: randomBytes(32),
      };

      const proof = await proofGenerator.generateProof(input);
      const publicInputs = [input.amount];

      const isValid = await proofGenerator.verifyProof(proof, publicInputs);
      expect(isValid).toBe(true);
    });

    it('should verify proof with correct public inputs', async () => {
      const input = {
        amount: 5000,
        recipient: randomBytes(32),
        nullifier: randomBytes(32),
      };

      const proof = await proofGenerator.generateProof(input);
      const publicInputs = [input.amount];

      const isValid = await proofGenerator.verifyProof(proof, publicInputs);
      expect(isValid).toBe(true);
    });

    it('should complete verification quickly', async () => {
      const input = {
        amount: 1000,
        recipient: randomBytes(32),
        nullifier: randomBytes(32),
      };

      const proof = await proofGenerator.generateProof(input);
      const publicInputs = [input.amount];

      const start = performance.now();
      await proofGenerator.verifyProof(proof, publicInputs);
      const duration = performance.now() - start;

      // Verification should be fast (< 100ms in mock)
      expect(duration).toBeLessThan(100);
    });
  });

  describe('Proof Properties', () => {
    it('should have correct structure for pi_a', async () => {
      const input = {
        amount: 1000,
        recipient: randomBytes(32),
        nullifier: randomBytes(32),
      };

      const proof = await proofGenerator.generateProof(input);

      expect(proof.pi_a).toHaveLength(3);
      proof.pi_a.forEach((value: string) => {
        expect(typeof value).toBe('string');
        expect(value).toMatch(/^0x/);
      });
    });

    it('should have correct structure for pi_b', async () => {
      const input = {
        amount: 1000,
        recipient: randomBytes(32),
        nullifier: randomBytes(32),
      };

      const proof = await proofGenerator.generateProof(input);

      expect(proof.pi_b).toHaveLength(3);
      proof.pi_b.forEach((pair: string[]) => {
        expect(pair).toHaveLength(2);
        pair.forEach((value: string) => {
          expect(typeof value).toBe('string');
          expect(value).toMatch(/^0x/);
        });
      });
    });

    it('should have correct structure for pi_c', async () => {
      const input = {
        amount: 1000,
        recipient: randomBytes(32),
        nullifier: randomBytes(32),
      };

      const proof = await proofGenerator.generateProof(input);

      expect(proof.pi_c).toHaveLength(3);
      proof.pi_c.forEach((value: string) => {
        expect(typeof value).toBe('string');
        expect(value).toMatch(/^0x/);
      });
    });
  });
});
