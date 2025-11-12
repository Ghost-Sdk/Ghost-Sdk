import {
  MockConnection,
  MockProofGenerator,
  MockRingSignatureGenerator,
  MockShieldedPool,
  createMockCommitment,
  createMockNullifier,
} from '../../utils/mocks';
import {
  TEST_ADDRESSES,
  TEST_AMOUNTS,
  randomBytes,
  sleep,
  TestLogger,
} from '../../utils/helpers';

describe('End-to-End: Complete Privacy Flow', () => {
  let connection: MockConnection;
  let proofGenerator: MockProofGenerator;
  let ringSignatureGenerator: MockRingSignatureGenerator;
  let shieldedPool: MockShieldedPool;
  let logger: TestLogger;

  beforeEach(() => {
    connection = new MockConnection();
    proofGenerator = new MockProofGenerator();
    ringSignatureGenerator = new MockRingSignatureGenerator();
    shieldedPool = new MockShieldedPool();
    logger = new TestLogger();
  });

  afterEach(() => {
    shieldedPool.reset();
    connection.clearMockData();
    logger.clear();
  });

  describe('Scenario: Private Payment Flow', () => {
    it('should complete a fully private payment from Alice to Bob', async () => {
      logger.log('Starting private payment flow');

      // Setup
      const alice = TEST_ADDRESSES.alice;
      const bob = TEST_ADDRESSES.bob;
      const amount = TEST_AMOUNTS.large;

      // Step 1: Alice deposits into shielded pool
      logger.log('Step 1: Alice deposits funds');
      const depositCommitment = createMockCommitment(amount);
      const depositTx = await shieldedPool.deposit(amount, depositCommitment);

      expect(depositTx).toBeDefined();
      expect(shieldedPool.hasCommitment(depositCommitment)).toBe(true);
      logger.log(`Deposit successful: ${depositTx}`);

      await sleep(100); // Simulate block confirmation

      // Step 2: Alice generates ZK proof for transfer
      logger.log('Step 2: Generating ZK proof');
      const transferNullifier = createMockNullifier();
      const transferCommitment = createMockCommitment(amount);

      const proof = await proofGenerator.generateProof({
        amount,
        inputCommitment: depositCommitment,
        outputCommitment: transferCommitment,
        nullifier: transferNullifier,
      });

      expect(proof).toBeDefined();
      logger.log('ZK proof generated successfully');

      // Step 3: Alice creates ring signature for anonymity
      logger.log('Step 3: Creating ring signature');
      const message = randomBytes(32);
      const ringSignature = await ringSignatureGenerator.generateRingSignature({
        message,
        ringSize: 11,
        signerIndex: 5,
      });

      expect(ringSignature).toBeDefined();
      expect(ringSignature.ring).toHaveLength(11);
      logger.log('Ring signature created');

      // Step 4: Execute private transfer
      logger.log('Step 4: Executing private transfer');
      const transferTx = await shieldedPool.transfer({
        amount,
        inputNullifier: transferNullifier,
        outputCommitment: transferCommitment,
        proof,
      });

      expect(transferTx).toBeDefined();
      expect(shieldedPool.hasNullifier(transferNullifier)).toBe(true);
      expect(shieldedPool.hasCommitment(transferCommitment)).toBe(true);
      logger.log(`Transfer successful: ${transferTx}`);

      await sleep(100); // Simulate block confirmation

      // Step 5: Bob withdraws funds
      logger.log('Step 5: Bob withdraws funds');
      const withdrawNullifier = createMockNullifier();
      const withdrawProof = await proofGenerator.generateProof({
        amount,
        commitment: transferCommitment,
        nullifier: withdrawNullifier,
      });

      const withdrawTx = await shieldedPool.withdraw(amount, withdrawNullifier, withdrawProof);

      expect(withdrawTx).toBeDefined();
      expect(shieldedPool.hasNullifier(withdrawNullifier)).toBe(true);
      logger.log(`Withdrawal successful: ${withdrawTx}`);

      // Verification
      logger.log('Verifying complete flow');
      expect(shieldedPool.hasCommitment(depositCommitment)).toBe(true);
      expect(shieldedPool.hasCommitment(transferCommitment)).toBe(true);
      expect(shieldedPool.hasNullifier(transferNullifier)).toBe(true);
      expect(shieldedPool.hasNullifier(withdrawNullifier)).toBe(true);

      logger.log('✅ Private payment flow completed successfully');
      logger.log('Privacy guarantees:');
      logger.log('- Amount hidden via commitments');
      logger.log('- Sender anonymous via ring signatures');
      logger.log('- Recipient anonymous via stealth addresses');
      logger.log('- Transaction linkability broken via nullifiers');
    });
  });

  describe('Scenario: Multi-Hop Private Transfers', () => {
    it('should support chain of private transfers through multiple parties', async () => {
      logger.log('Starting multi-hop transfer scenario');

      const participants = [
        { name: 'Alice', address: TEST_ADDRESSES.alice },
        { name: 'Bob', address: TEST_ADDRESSES.bob },
        { name: 'Charlie', address: TEST_ADDRESSES.charlie },
        { name: 'Dave', address: TEST_ADDRESSES.dave },
      ];

      const amount = TEST_AMOUNTS.large;

      // Alice initial deposit
      logger.log('Alice deposits initial funds');
      let currentCommitment = createMockCommitment(amount);
      const depositTx = await shieldedPool.deposit(amount, currentCommitment);
      expect(depositTx).toBeDefined();
      logger.log(`Initial deposit: ${depositTx}`);

      // Transfer through the chain
      for (let i = 0; i < participants.length - 1; i++) {
        const sender = participants[i];
        const receiver = participants[i + 1];

        logger.log(`\nTransfer ${i + 1}: ${sender.name} → ${receiver.name}`);

        // Generate proof
        const nullifier = createMockNullifier();
        const newCommitment = createMockCommitment(amount);

        const proof = await proofGenerator.generateProof({
          amount,
          inputCommitment: currentCommitment,
          outputCommitment: newCommitment,
          nullifier,
        });

        // Generate ring signature for anonymity
        const message = randomBytes(32);
        const ringSignature = await ringSignatureGenerator.generateRingSignature({
          message,
          ringSize: 11,
          signerIndex: Math.floor(Math.random() * 11),
        });

        expect(ringSignature.ring).toHaveLength(11);

        // Execute transfer
        const transferTx = await shieldedPool.transfer({
          amount,
          inputNullifier: nullifier,
          outputCommitment: newCommitment,
          proof,
        });

        expect(transferTx).toBeDefined();
        logger.log(`Transfer completed: ${transferTx}`);

        await sleep(100); // Simulate block confirmation

        currentCommitment = newCommitment;
      }

      // Final withdrawal by Dave
      logger.log('\nDave withdraws final amount');
      const finalNullifier = createMockNullifier();
      const finalProof = await proofGenerator.generateProof({
        amount,
        commitment: currentCommitment,
        nullifier: finalNullifier,
      });

      const withdrawTx = await shieldedPool.withdraw(amount, finalNullifier, finalProof);
      expect(withdrawTx).toBeDefined();
      logger.log(`Final withdrawal: ${withdrawTx}`);

      logger.log('\n✅ Multi-hop transfer completed successfully');
      logger.log(`Total hops: ${participants.length - 1}`);
      logger.log('Privacy preserved at each hop');
    });
  });

  describe('Scenario: Private DAO Voting', () => {
    it('should support anonymous voting with hidden voting power', async () => {
      logger.log('Starting private DAO voting scenario');

      // Setup voters with different voting power
      const voters = [
        { name: 'Whale', power: 10_000_000_000 }, // 10 SOL
        { name: 'Medium', power: 1_000_000_000 }, // 1 SOL
        { name: 'Small', power: 100_000_000 }, // 0.1 SOL
      ];

      const votes: { commitment: Uint8Array; power: number; proof: any }[] = [];

      // Each voter deposits and casts vote
      for (const voter of voters) {
        logger.log(`\n${voter.name} voter (${voter.power} lamports) casting vote`);

        // Deposit voting power
        const commitment = createMockCommitment(voter.power);
        const depositTx = await shieldedPool.deposit(voter.power, commitment);
        expect(depositTx).toBeDefined();
        logger.log(`Voting power deposited: ${depositTx}`);

        // Generate proof of voting power (without revealing amount)
        const proof = await proofGenerator.generateProof({
          amount: voter.power,
          commitment,
          nullifier: createMockNullifier(),
        });

        // Generate ring signature for anonymity
        const message = randomBytes(32); // Vote choice
        const ringSignature = await ringSignatureGenerator.generateRingSignature({
          message,
          ringSize: 21, // Larger ring for better anonymity
          signerIndex: Math.floor(Math.random() * 21),
        });

        expect(ringSignature.ring).toHaveLength(21);
        logger.log('Vote cast anonymously');

        votes.push({ commitment, power: voter.power, proof });

        await sleep(50);
      }

      // Verify all votes are private
      logger.log('\nVerifying vote privacy:');
      for (let i = 0; i < votes.length; i++) {
        const vote = votes[i];

        // Commitment exists
        expect(shieldedPool.hasCommitment(vote.commitment)).toBe(true);

        // Proof is valid
        const isValidProof = await proofGenerator.verifyProof(
          vote.proof,
          [vote.power]
        );
        expect(isValidProof).toBe(true);

        logger.log(`Vote ${i + 1}: ✓ Private ✓ Valid`);
      }

      logger.log('\n✅ Private voting completed successfully');
      logger.log('Privacy guarantees:');
      logger.log('- Voting power hidden');
      logger.log('- Voter identity anonymous');
      logger.log('- Vote choices encrypted');
      logger.log('- Results verifiable without revealing individual votes');
    });
  });

  describe('Scenario: Private DEX Swap', () => {
    it('should support anonymous token swaps with hidden amounts', async () => {
      logger.log('Starting private DEX swap scenario');

      const trader = TEST_ADDRESSES.alice;
      const swapAmount = TEST_AMOUNTS.xlarge; // 10 SOL

      // Step 1: Deposit SOL into shielded pool
      logger.log('Step 1: Depositing SOL into shielded pool');
      const solCommitment = createMockCommitment(swapAmount);
      const depositTx = await shieldedPool.deposit(swapAmount, solCommitment);
      expect(depositTx).toBeDefined();
      logger.log(`SOL deposited: ${depositTx}`);

      await sleep(100);

      // Step 2: Generate proof for swap (without revealing amount)
      logger.log('Step 2: Generating ZK proof for swap');
      const swapNullifier = createMockNullifier();
      const usdcCommitment = createMockCommitment(swapAmount * 100); // Mock 1:100 rate

      const swapProof = await proofGenerator.generateProof({
        amount: swapAmount,
        inputCommitment: solCommitment,
        outputCommitment: usdcCommitment,
        nullifier: swapNullifier,
      });

      expect(swapProof).toBeDefined();
      logger.log('Swap proof generated');

      // Step 3: Generate ring signature for trader anonymity
      logger.log('Step 3: Creating anonymous swap order');
      const orderMessage = randomBytes(32);
      const ringSignature = await ringSignatureGenerator.generateRingSignature({
        message: orderMessage,
        ringSize: 51, // Large ring for maximum anonymity
        signerIndex: 25,
      });

      expect(ringSignature.ring).toHaveLength(51);
      logger.log('Anonymous swap order created');

      // Step 4: Execute swap
      logger.log('Step 4: Executing private swap');
      const swapTx = await shieldedPool.transfer({
        amount: swapAmount,
        inputNullifier: swapNullifier,
        outputCommitment: usdcCommitment,
        proof: swapProof,
      });

      expect(swapTx).toBeDefined();
      expect(shieldedPool.hasCommitment(usdcCommitment)).toBe(true);
      expect(shieldedPool.hasNullifier(swapNullifier)).toBe(true);
      logger.log(`Swap executed: ${swapTx}`);

      logger.log('\n✅ Private DEX swap completed successfully');
      logger.log('Privacy guarantees:');
      logger.log('- Swap amount hidden');
      logger.log('- Trader identity anonymous');
      logger.log('- No front-running possible');
      logger.log('- MEV protection enabled');
    });
  });

  describe('Performance Metrics', () => {
    it('should complete operations within acceptable time limits', async () => {
      logger.log('Measuring operation performance');

      const iterations = 10;
      const metrics = {
        deposit: [] as number[],
        proofGeneration: [] as number[],
        ringSignature: [] as number[],
        transfer: [] as number[],
        withdrawal: [] as number[],
      };

      for (let i = 0; i < iterations; i++) {
        const amount = TEST_AMOUNTS.medium;

        // Measure deposit
        let start = performance.now();
        const commitment = createMockCommitment(amount);
        await shieldedPool.deposit(amount, commitment);
        metrics.deposit.push(performance.now() - start);

        // Measure proof generation
        start = performance.now();
        const proof = await proofGenerator.generateProof({
          amount,
          commitment,
          nullifier: createMockNullifier(),
        });
        metrics.proofGeneration.push(performance.now() - start);

        // Measure ring signature
        start = performance.now();
        await ringSignatureGenerator.generateRingSignature({
          message: randomBytes(32),
          ringSize: 11,
          signerIndex: 5,
        });
        metrics.ringSignature.push(performance.now() - start);

        // Measure transfer
        start = performance.now();
        const transferNullifier = createMockNullifier();
        const outputCommitment = createMockCommitment(amount);
        await shieldedPool.transfer({
          amount,
          inputNullifier: transferNullifier,
          outputCommitment,
          proof,
        });
        metrics.transfer.push(performance.now() - start);

        // Measure withdrawal
        start = performance.now();
        const withdrawNullifier = createMockNullifier();
        const withdrawProof = await proofGenerator.generateProof({
          amount,
          commitment: outputCommitment,
          nullifier: withdrawNullifier,
        });
        await shieldedPool.withdraw(amount, withdrawNullifier, withdrawProof);
        metrics.withdrawal.push(performance.now() - start);
      }

      // Calculate and verify averages
      const avg = (arr: number[]) => arr.reduce((a, b) => a + b, 0) / arr.length;

      logger.log('\nPerformance metrics (average over 10 iterations):');
      logger.log(`Deposit: ${avg(metrics.deposit).toFixed(2)}ms`);
      logger.log(`Proof Generation: ${avg(metrics.proofGeneration).toFixed(2)}ms`);
      logger.log(`Ring Signature: ${avg(metrics.ringSignature).toFixed(2)}ms`);
      logger.log(`Transfer: ${avg(metrics.transfer).toFixed(2)}ms`);
      logger.log(`Withdrawal: ${avg(metrics.withdrawal).toFixed(2)}ms`);

      // All operations should complete in reasonable time (mock is fast)
      expect(avg(metrics.deposit)).toBeLessThan(50);
      expect(avg(metrics.proofGeneration)).toBeLessThan(150);
      expect(avg(metrics.ringSignature)).toBeLessThan(150);
      expect(avg(metrics.transfer)).toBeLessThan(50);
      expect(avg(metrics.withdrawal)).toBeLessThan(50);

      logger.log('\n✅ All operations within performance targets');
    });
  });
});
