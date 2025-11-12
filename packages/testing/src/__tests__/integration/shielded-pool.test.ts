import {
  MockShieldedPool,
  MockProofGenerator,
  createMockCommitment,
  createMockNullifier,
} from '../../utils/mocks';
import { randomBytes, expectAsyncError } from '../../utils/helpers';

describe('Shielded Pool Integration', () => {
  let pool: MockShieldedPool;
  let proofGenerator: MockProofGenerator;

  beforeEach(() => {
    pool = new MockShieldedPool();
    proofGenerator = new MockProofGenerator();
  });

  afterEach(() => {
    pool.reset();
  });

  describe('Deposit Flow', () => {
    it('should successfully deposit funds', async () => {
      const amount = 1000000000; // 1 SOL
      const commitment = createMockCommitment(amount);

      const txSignature = await pool.deposit(amount, commitment);

      expect(txSignature).toBeDefined();
      expect(txSignature).toMatch(/^mock_deposit_tx_/);
      expect(pool.hasCommitment(commitment)).toBe(true);
    });

    it('should accept multiple deposits', async () => {
      const deposits = [
        { amount: 1000000000, commitment: createMockCommitment(1000000000) },
        { amount: 2000000000, commitment: createMockCommitment(2000000000) },
        { amount: 500000000, commitment: createMockCommitment(500000000) },
      ];

      for (const deposit of deposits) {
        const txSignature = await pool.deposit(deposit.amount, deposit.commitment);
        expect(txSignature).toBeDefined();
        expect(pool.hasCommitment(deposit.commitment)).toBe(true);
      }
    });

    it('should handle small deposits', async () => {
      const amount = 1; // 1 lamport
      const commitment = createMockCommitment(amount);

      const txSignature = await pool.deposit(amount, commitment);

      expect(txSignature).toBeDefined();
      expect(pool.hasCommitment(commitment)).toBe(true);
    });

    it('should handle large deposits', async () => {
      const amount = 10_000_000_000_000; // 10,000 SOL
      const commitment = createMockCommitment(amount);

      const txSignature = await pool.deposit(amount, commitment);

      expect(txSignature).toBeDefined();
      expect(pool.hasCommitment(commitment)).toBe(true);
    });
  });

  describe('Withdrawal Flow', () => {
    it('should successfully withdraw funds', async () => {
      // First deposit
      const amount = 1000000000;
      const commitment = createMockCommitment(amount);
      await pool.deposit(amount, commitment);

      // Then withdraw
      const nullifier = createMockNullifier();
      const proof = await proofGenerator.generateProof({
        amount,
        commitment,
        nullifier,
      });

      const txSignature = await pool.withdraw(amount, nullifier, proof);

      expect(txSignature).toBeDefined();
      expect(txSignature).toMatch(/^mock_withdraw_tx_/);
      expect(pool.hasNullifier(nullifier)).toBe(true);
    });

    it('should prevent double withdrawal with same nullifier', async () => {
      const amount = 1000000000;
      const commitment = createMockCommitment(amount);
      await pool.deposit(amount, commitment);

      const nullifier = createMockNullifier();
      const proof = await proofGenerator.generateProof({
        amount,
        commitment,
        nullifier,
      });

      // First withdrawal succeeds
      await pool.withdraw(amount, nullifier, proof);

      // Second withdrawal with same nullifier should fail
      await expectAsyncError(
        async () => {
          await pool.withdraw(amount, nullifier, proof);
        },
        'Nullifier already used'
      );
    });

    it('should allow withdrawals with different nullifiers', async () => {
      const amount = 1000000000;

      // Make two deposits
      const commitment1 = createMockCommitment(amount);
      const commitment2 = createMockCommitment(amount);
      await pool.deposit(amount, commitment1);
      await pool.deposit(amount, commitment2);

      // Withdraw both with different nullifiers
      const nullifier1 = createMockNullifier();
      const nullifier2 = createMockNullifier();

      const proof1 = await proofGenerator.generateProof({
        amount,
        commitment: commitment1,
        nullifier: nullifier1,
      });

      const proof2 = await proofGenerator.generateProof({
        amount,
        commitment: commitment2,
        nullifier: nullifier2,
      });

      const tx1 = await pool.withdraw(amount, nullifier1, proof1);
      const tx2 = await pool.withdraw(amount, nullifier2, proof2);

      expect(tx1).toBeDefined();
      expect(tx2).toBeDefined();
      expect(pool.hasNullifier(nullifier1)).toBe(true);
      expect(pool.hasNullifier(nullifier2)).toBe(true);
    });
  });

  describe('Private Transfer Flow', () => {
    it('should successfully perform private transfer', async () => {
      // Sender deposits
      const amount = 1000000000;
      const inputCommitment = createMockCommitment(amount);
      await pool.deposit(amount, inputCommitment);

      // Transfer to recipient
      const inputNullifier = createMockNullifier();
      const outputCommitment = createMockCommitment(amount);
      const proof = await proofGenerator.generateProof({
        amount,
        inputCommitment,
        inputNullifier,
        outputCommitment,
      });

      const txSignature = await pool.transfer({
        amount,
        inputNullifier,
        outputCommitment,
        proof,
      });

      expect(txSignature).toBeDefined();
      expect(txSignature).toMatch(/^mock_transfer_tx_/);
      expect(pool.hasNullifier(inputNullifier)).toBe(true);
      expect(pool.hasCommitment(outputCommitment)).toBe(true);
    });

    it('should prevent transfer with used nullifier', async () => {
      const amount = 1000000000;
      const inputCommitment = createMockCommitment(amount);
      await pool.deposit(amount, inputCommitment);

      const inputNullifier = createMockNullifier();
      const outputCommitment = createMockCommitment(amount);
      const proof = await proofGenerator.generateProof({
        amount,
        inputCommitment,
        inputNullifier,
        outputCommitment,
      });

      // First transfer succeeds
      await pool.transfer({
        amount,
        inputNullifier,
        outputCommitment,
        proof,
      });

      // Second transfer with same nullifier should fail
      const newOutputCommitment = createMockCommitment(amount);
      await expectAsyncError(
        async () => {
          await pool.transfer({
            amount,
            inputNullifier,
            outputCommitment: newOutputCommitment,
            proof,
          });
        },
        'Nullifier already used'
      );
    });

    it('should support chain of transfers', async () => {
      const amount = 1000000000;

      // Initial deposit
      let currentCommitment = createMockCommitment(amount);
      await pool.deposit(amount, currentCommitment);

      // Perform chain of 5 transfers
      for (let i = 0; i < 5; i++) {
        const inputNullifier = createMockNullifier();
        const outputCommitment = createMockCommitment(amount);
        const proof = await proofGenerator.generateProof({
          amount,
          inputCommitment: currentCommitment,
          inputNullifier,
          outputCommitment,
        });

        const txSignature = await pool.transfer({
          amount,
          inputNullifier,
          outputCommitment,
          proof,
        });

        expect(txSignature).toBeDefined();
        expect(pool.hasNullifier(inputNullifier)).toBe(true);
        expect(pool.hasCommitment(outputCommitment)).toBe(true);

        currentCommitment = outputCommitment;
      }
    });
  });

  describe('Complete User Journey', () => {
    it('should support full deposit -> transfer -> withdraw flow', async () => {
      const amount = 1000000000;

      // Step 1: Alice deposits
      const aliceCommitment = createMockCommitment(amount);
      const depositTx = await pool.deposit(amount, aliceCommitment);
      expect(depositTx).toBeDefined();

      // Step 2: Alice transfers to Bob
      const aliceNullifier = createMockNullifier();
      const bobCommitment = createMockCommitment(amount);
      const transferProof = await proofGenerator.generateProof({
        amount,
        inputCommitment: aliceCommitment,
        inputNullifier: aliceNullifier,
        outputCommitment: bobCommitment,
      });

      const transferTx = await pool.transfer({
        amount,
        inputNullifier: aliceNullifier,
        outputCommitment: bobCommitment,
        proof: transferProof,
      });
      expect(transferTx).toBeDefined();

      // Step 3: Bob withdraws
      const bobNullifier = createMockNullifier();
      const withdrawProof = await proofGenerator.generateProof({
        amount,
        commitment: bobCommitment,
        nullifier: bobNullifier,
      });

      const withdrawTx = await pool.withdraw(amount, bobNullifier, withdrawProof);
      expect(withdrawTx).toBeDefined();

      // Verify final state
      expect(pool.hasCommitment(aliceCommitment)).toBe(true);
      expect(pool.hasCommitment(bobCommitment)).toBe(true);
      expect(pool.hasNullifier(aliceNullifier)).toBe(true);
      expect(pool.hasNullifier(bobNullifier)).toBe(true);
    });

    it('should support multiple users with concurrent operations', async () => {
      const users = [
        { name: 'Alice', amount: 1_000_000_000 },
        { name: 'Bob', amount: 2_000_000_000 },
        { name: 'Charlie', amount: 500_000_000 },
      ];

      // All users deposit concurrently
      const deposits = await Promise.all(
        users.map(user => {
          const commitment = createMockCommitment(user.amount);
          return pool.deposit(user.amount, commitment).then(tx => ({
            user: user.name,
            commitment,
            tx,
          }));
        })
      );

      // Verify all deposits succeeded
      deposits.forEach(deposit => {
        expect(deposit.tx).toBeDefined();
        expect(pool.hasCommitment(deposit.commitment)).toBe(true);
      });

      // All users withdraw concurrently
      const withdrawals = await Promise.all(
        deposits.map(async deposit => {
          const nullifier = createMockNullifier();
          const user = users.find(u => u.name === deposit.user)!;
          const proof = await proofGenerator.generateProof({
            amount: user.amount,
            commitment: deposit.commitment,
            nullifier,
          });

          return pool.withdraw(user.amount, nullifier, proof).then(tx => ({
            user: deposit.user,
            nullifier,
            tx,
          }));
        })
      );

      // Verify all withdrawals succeeded
      withdrawals.forEach(withdrawal => {
        expect(withdrawal.tx).toBeDefined();
        expect(pool.hasNullifier(withdrawal.nullifier)).toBe(true);
      });
    });
  });

  describe('State Management', () => {
    it('should track commitments correctly', async () => {
      const commitments = [
        createMockCommitment(1000),
        createMockCommitment(2000),
        createMockCommitment(3000),
      ];

      for (const commitment of commitments) {
        await pool.deposit(1000, commitment);
      }

      for (const commitment of commitments) {
        expect(pool.hasCommitment(commitment)).toBe(true);
      }

      // Random commitment should not exist
      const randomCommitment = createMockCommitment(9999);
      expect(pool.hasCommitment(randomCommitment)).toBe(false);
    });

    it('should track nullifiers correctly', async () => {
      const amount = 1000000000;
      const commitments = [
        createMockCommitment(amount),
        createMockCommitment(amount),
        createMockCommitment(amount),
      ];

      // Deposit all
      for (const commitment of commitments) {
        await pool.deposit(amount, commitment);
      }

      // Withdraw all
      const nullifiers = [
        createMockNullifier(),
        createMockNullifier(),
        createMockNullifier(),
      ];

      for (let i = 0; i < nullifiers.length; i++) {
        const proof = await proofGenerator.generateProof({
          amount,
          commitment: commitments[i],
          nullifier: nullifiers[i],
        });
        await pool.withdraw(amount, nullifiers[i], proof);
      }

      // All nullifiers should be tracked
      for (const nullifier of nullifiers) {
        expect(pool.hasNullifier(nullifier)).toBe(true);
      }

      // Random nullifier should not exist
      const randomNullifier = createMockNullifier();
      expect(pool.hasNullifier(randomNullifier)).toBe(false);
    });

    it('should reset state correctly', async () => {
      const amount = 1000000000;
      const commitment = createMockCommitment(amount);
      const nullifier = createMockNullifier();

      await pool.deposit(amount, commitment);
      const proof = await proofGenerator.generateProof({
        amount,
        commitment,
        nullifier,
      });
      await pool.withdraw(amount, nullifier, proof);

      expect(pool.hasCommitment(commitment)).toBe(true);
      expect(pool.hasNullifier(nullifier)).toBe(true);

      pool.reset();

      expect(pool.hasCommitment(commitment)).toBe(false);
      expect(pool.hasNullifier(nullifier)).toBe(false);
    });
  });
});
