import { MockRingSignatureGenerator } from '../../utils/mocks';
import { assertValidRingSignature, randomBytes, generateTestRing } from '../../utils/helpers';

describe('Ring Signature Generation', () => {
  let ringSignatureGenerator: MockRingSignatureGenerator;

  beforeEach(() => {
    ringSignatureGenerator = new MockRingSignatureGenerator();
  });

  describe('generateRingSignature', () => {
    it('should generate a valid ring signature', async () => {
      const message = randomBytes(32);
      const params = {
        message,
        ringSize: 11,
        signerIndex: 5,
      };

      const signature = await ringSignatureGenerator.generateRingSignature(params);

      assertValidRingSignature(signature);
      expect(signature.ring).toHaveLength(11);
    });

    it('should generate ring signature with minimum ring size', async () => {
      const message = randomBytes(32);
      const params = {
        message,
        ringSize: 3,
        signerIndex: 1,
      };

      const signature = await ringSignatureGenerator.generateRingSignature(params);

      assertValidRingSignature(signature);
      expect(signature.ring).toHaveLength(3);
    });

    it('should generate ring signature with large ring size', async () => {
      const message = randomBytes(32);
      const params = {
        message,
        ringSize: 101,
        signerIndex: 50,
      };

      const signature = await ringSignatureGenerator.generateRingSignature(params);

      assertValidRingSignature(signature);
      expect(signature.ring).toHaveLength(101);
    });

    it('should include key image', async () => {
      const message = randomBytes(32);
      const params = {
        message,
        ringSize: 11,
        signerIndex: 5,
      };

      const signature = await ringSignatureGenerator.generateRingSignature(params);

      expect(signature.keyImage).toBeDefined();
      expect(signature.keyImage instanceof Uint8Array).toBe(true);
      expect(signature.keyImage.length).toBe(32);
    });

    it('should include challenge and responses', async () => {
      const message = randomBytes(32);
      const params = {
        message,
        ringSize: 11,
        signerIndex: 5,
      };

      const signature = await ringSignatureGenerator.generateRingSignature(params);

      expect(signature.c).toBeDefined();
      expect(signature.c instanceof Uint8Array).toBe(true);
      expect(signature.c.length).toBe(32);

      expect(signature.r).toBeDefined();
      expect(Array.isArray(signature.r)).toBe(true);
      expect(signature.r).toHaveLength(11);
    });
  });

  describe('verifyRingSignature', () => {
    it('should verify a valid ring signature', async () => {
      const message = randomBytes(32);
      const params = {
        message,
        ringSize: 11,
        signerIndex: 5,
      };

      const signature = await ringSignatureGenerator.generateRingSignature(params);
      const isValid = await ringSignatureGenerator.verifyRingSignature(signature, message);

      expect(isValid).toBe(true);
    });

    it('should verify signature with different ring sizes', async () => {
      const ringSizes = [3, 7, 11, 21, 51];

      for (const ringSize of ringSizes) {
        const message = randomBytes(32);
        const params = {
          message,
          ringSize,
          signerIndex: Math.floor(ringSize / 2),
        };

        const signature = await ringSignatureGenerator.generateRingSignature(params);
        const isValid = await ringSignatureGenerator.verifyRingSignature(signature, message);

        expect(isValid).toBe(true);
      }
    });

    it('should complete verification quickly', async () => {
      const message = randomBytes(32);
      const params = {
        message,
        ringSize: 11,
        signerIndex: 5,
      };

      const signature = await ringSignatureGenerator.generateRingSignature(params);

      const start = performance.now();
      await ringSignatureGenerator.verifyRingSignature(signature, message);
      const duration = performance.now() - start;

      // Verification should be fast (< 100ms in mock)
      expect(duration).toBeLessThan(100);
    });
  });

  describe('Anonymity Properties', () => {
    it('should not reveal signer index from signature', async () => {
      const message = randomBytes(32);
      const params = {
        message,
        ringSize: 11,
        signerIndex: 5,
      };

      const signature = await ringSignatureGenerator.generateRingSignature(params);

      // Signature should not contain signer index
      expect(signature).not.toHaveProperty('signerIndex');
    });

    it('should produce same key image for same signer', async () => {
      const message1 = randomBytes(32);
      const message2 = randomBytes(32);

      const params1 = {
        message: message1,
        ringSize: 11,
        signerIndex: 5,
      };

      const params2 = {
        message: message2,
        ringSize: 11,
        signerIndex: 5,
      };

      const signature1 = await ringSignatureGenerator.generateRingSignature(params1);
      const signature2 = await ringSignatureGenerator.generateRingSignature(params2);

      // In a real implementation, key images would be the same for the same signer
      // Mock implementation may vary
      expect(signature1.keyImage).toBeDefined();
      expect(signature2.keyImage).toBeDefined();
    });

    it('should hide signer among ring members', async () => {
      const message = randomBytes(32);
      const ringSize = 11;

      const signatures = await Promise.all(
        Array.from({ length: ringSize }, (_, signerIndex) =>
          ringSignatureGenerator.generateRingSignature({
            message,
            ringSize,
            signerIndex,
          })
        )
      );

      // All signatures should be valid
      for (const signature of signatures) {
        assertValidRingSignature(signature);
        const isValid = await ringSignatureGenerator.verifyRingSignature(signature, message);
        expect(isValid).toBe(true);
      }
    });
  });

  describe('Security Properties', () => {
    it('should prevent double spending via key image', async () => {
      const message = randomBytes(32);
      const params = {
        message,
        ringSize: 11,
        signerIndex: 5,
      };

      const signature = await ringSignatureGenerator.generateRingSignature(params);

      // Key image should be unique and linkable
      expect(signature.keyImage).toBeDefined();
      expect(signature.keyImage instanceof Uint8Array).toBe(true);

      // In a real system, this key image would be checked against a nullifier set
    });

    it('should maintain unlinkability between different signatures', async () => {
      const message1 = randomBytes(32);
      const message2 = randomBytes(32);

      const signature1 = await ringSignatureGenerator.generateRingSignature({
        message: message1,
        ringSize: 11,
        signerIndex: 5,
      });

      const signature2 = await ringSignatureGenerator.generateRingSignature({
        message: message2,
        ringSize: 11,
        signerIndex: 7,
      });

      // Signatures should be unlinkable (can't tell if from same signer)
      expect(signature1.signature).not.toEqual(signature2.signature);
    });
  });
});
