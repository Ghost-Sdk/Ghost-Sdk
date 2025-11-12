import {
  Connection,
  PublicKey,
  Transaction,
  SystemProgram,
  TransactionInstruction,
  Keypair,
} from '@solana/web3.js';
import { buildPoseidon } from 'circomlibjs';
import { sha256 } from '@noble/hashes/sha256';
import { randomBytes } from '@noble/hashes/utils';
import * as snarkjs from 'snarkjs';
import {
  GhostClientConfig,
  Commitment,
  Nullifier,
  ZKProof,
  PrivateTransferParams,
  DepositParams,
  WithdrawParams,
} from './types';
import { GHOST_PROGRAM_ID, MERKLE_TREE_DEPTH, CIRCUITS } from './constants';

export class GhostClient {
  private connection: Connection;
  private wallet: any;
  private programId: PublicKey;
  private poseidon: any;
  private circuitsPath: string;
  private privateKey: Uint8Array;
  private publicKey: Uint8Array;
  private commitments: Map<string, Commitment>;
  private nullifiers: Set<string>;

  constructor(config: GhostClientConfig) {
    this.connection = config.connection;
    this.wallet = config.wallet;
    this.programId = config.programId || GHOST_PROGRAM_ID;
    this.circuitsPath = config.circuitsPath || './circuits/build';
    this.commitments = new Map();
    this.nullifiers = new Set();
    this.privateKey = randomBytes(32);
    this.publicKey = new Uint8Array(32);
  }

  /**
   * Initialize the client
   */
  async initialize(): Promise<void> {
    console.log('🔧 Initializing Ghost SDK...');

    // Initialize Poseidon hash function
    this.poseidon = await buildPoseidon();

    // Derive public key from private key
    const publicKeyHash = this.poseidon([BigInt('0x' + Buffer.from(this.privateKey).toString('hex'))]);
    this.publicKey = this.poseidon.F.toObject(publicKeyHash);

    console.log('✅ Ghost SDK initialized');
    console.log('   Public key:', Buffer.from(this.publicKey).toString('hex').slice(0, 16) + '...');
  }

  /**
   * Get Ghost identifier (your privacy identity)
   */
  getGhostIdentifier(): string {
    return Buffer.from(this.publicKey).toString('hex');
  }

  /**
   * Generate a commitment for an amount
   */
  async generateCommitment(params: {
    amount: bigint;
    recipient: string;
    nonce?: Uint8Array;
  }): Promise<Commitment> {
    const nonce = params.nonce || randomBytes(32);
    const recipientPubKey = Buffer.from(params.recipient, 'hex');

    // commitment = H(recipient, amount, nonce)
    const commitment = this.poseidon([
      BigInt('0x' + recipientPubKey.toString('hex')),
      params.amount,
      BigInt('0x' + Buffer.from(nonce).toString('hex')),
    ]);

    const commitmentBytes = this.poseidon.F.toObject(commitment);

    return {
      value: new Uint8Array(commitmentBytes),
      nonce,
      amount: params.amount,
    };
  }

  /**
   * Generate nullifier (prevents double-spending)
   */
  async generateNullifier(commitment: Commitment): Promise<Nullifier> {
    // nullifier = H(commitment, privateKey)
    const nullifier = this.poseidon([
      BigInt('0x' + Buffer.from(commitment.value).toString('hex')),
      BigInt('0x' + Buffer.from(this.privateKey).toString('hex')),
    ]);

    const nullifierBytes = this.poseidon.F.toObject(nullifier);

    return {
      value: new Uint8Array(nullifierBytes),
      commitment: commitment.value,
    };
  }

  /**
   * Generate ZK proof for private transfer
   */
  async generateTransferProof(params: {
    amount: bigint;
    recipient: string;
    commitment: string;
    nullifier: string;
  }): Promise<ZKProof> {
    console.log('🔐 Generating ZK proof...');

    // Circuit inputs
    const input = {
      // Public inputs
      root: '0', // Merkle root (would be actual root in production)
      nullifier: params.nullifier,
      newCommitment: params.commitment,

      // Private inputs
      amount: params.amount.toString(),
      privateKey: '0x' + Buffer.from(this.privateKey).toString('hex'),
      recipientPublicKey: params.recipient,
      nonce: '0x' + Buffer.from(randomBytes(32)).toString('hex'),
      oldNonce: '0x' + Buffer.from(randomBytes(32)).toString('hex'),

      // Merkle proof (simplified - would be actual path in production)
      pathElements: Array(MERKLE_TREE_DEPTH).fill('0'),
      pathIndices: Array(MERKLE_TREE_DEPTH).fill(0),
    };

    // Generate proof using snarkjs
    try {
      const { proof, publicSignals } = await snarkjs.groth16.fullProve(
        input,
        `${this.circuitsPath}/transfer.wasm`,
        `${this.circuitsPath}/transfer_final.zkey`
      );

      // Convert proof to bytes
      const proofBytes = this.serializeProof(proof);

      console.log('✅ ZK proof generated');
      console.log('   Proof size:', proofBytes.length, 'bytes');

      return {
        proof: proofBytes,
        publicSignals,
      };
    } catch (error) {
      console.error('❌ Failed to generate proof:', error);
      throw error;
    }
  }

  /**
   * Deposit into privacy pool
   */
  async deposit(params: DepositParams): Promise<string> {
    console.log('💰 Depositing into privacy pool...');
    console.log('   Amount:', params.amount.toString(), 'lamports');

    // Generate commitment
    const commitment = await this.generateCommitment({
      amount: params.amount,
      recipient: this.getGhostIdentifier(),
    });

    // Store commitment locally
    const commitmentKey = Buffer.from(commitment.value).toString('hex');
    this.commitments.set(commitmentKey, commitment);

    // Get pool and vault addresses
    const [poolAddress] = PublicKey.findProgramAddressSync(
      [Buffer.from('pool'), Buffer.from(params.amount.toString())],
      this.programId
    );

    const [vaultAddress] = PublicKey.findProgramAddressSync(
      [Buffer.from('vault'), poolAddress.toBuffer()],
      this.programId
    );

    // Build instruction
    const instruction = new TransactionInstruction({
      keys: [
        { pubkey: poolAddress, isSigner: false, isWritable: true },
        { pubkey: this.wallet.publicKey, isSigner: true, isWritable: true },
        { pubkey: vaultAddress, isSigner: false, isWritable: true },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      ],
      programId: this.programId,
      data: this.encodeDepositInstruction(commitment.value, params.amount),
    });

    // Send transaction
    const transaction = new Transaction().add(instruction);
    const signature = await this.sendAndConfirm(transaction);

    console.log('✅ Deposit successful!');
    console.log('   Signature:', signature);
    console.log('   Commitment:', commitmentKey.slice(0, 16) + '...');

    return signature;
  }

  /**
   * Withdraw from privacy pool
   */
  async withdraw(params: WithdrawParams): Promise<string> {
    console.log('💸 Withdrawing from privacy pool...');
    console.log('   Amount:', params.amount.toString(), 'lamports');
    console.log('   Recipient:', params.recipient);

    // Find a commitment with sufficient balance
    const commitment = Array.from(this.commitments.values())
      .find(c => c.amount >= params.amount);

    if (!commitment) {
      throw new Error('Insufficient balance');
    }

    // Generate nullifier
    const nullifier = await this.generateNullifier(commitment);

    // Check if already spent
    const nullifierKey = Buffer.from(nullifier.value).toString('hex');
    if (this.nullifiers.has(nullifierKey)) {
      throw new Error('Commitment already spent');
    }

    // Generate ZK proof
    const proof = await this.generateTransferProof({
      amount: params.amount,
      recipient: params.recipient,
      commitment: Buffer.from(commitment.value).toString('hex'),
      nullifier: nullifierKey,
    });

    // Get pool and vault addresses
    const [poolAddress] = PublicKey.findProgramAddressSync(
      [Buffer.from('pool'), Buffer.from(params.amount.toString())],
      this.programId
    );

    const [vaultAddress] = PublicKey.findProgramAddressSync(
      [Buffer.from('vault'), poolAddress.toBuffer()],
      this.programId
    );

    const recipientPubkey = new PublicKey(params.recipient);

    // Build instruction
    const instruction = new TransactionInstruction({
      keys: [
        { pubkey: poolAddress, isSigner: false, isWritable: true },
        { pubkey: vaultAddress, isSigner: false, isWritable: true },
        { pubkey: recipientPubkey, isSigner: false, isWritable: true },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      ],
      programId: this.programId,
      data: this.encodeWithdrawInstruction(
        proof.proof,
        commitment.value,
        nullifier.value,
        params.amount,
        recipientPubkey
      ),
    });

    // Send transaction
    const transaction = new Transaction().add(instruction);
    const signature = await this.sendAndConfirm(transaction);

    // Mark as spent
    this.nullifiers.add(nullifierKey);
    this.commitments.delete(Buffer.from(commitment.value).toString('hex'));

    console.log('✅ Withdrawal successful!');
    console.log('   Signature:', signature);
    console.log('   Nullifier:', nullifierKey.slice(0, 16) + '...');

    return signature;
  }

  /**
   * Private transfer (combines deposit + withdraw in one transaction)
   */
  async privateTransfer(params: PrivateTransferParams): Promise<string> {
    console.log('🔒 Executing private transfer...');
    console.log('   Amount:', params.amount.toString(), 'lamports');
    console.log('   Recipient:', params.recipient.slice(0, 16) + '...');

    // For simplicity, do withdraw to recipient
    // In production, this would be optimized
    return await this.withdraw({
      amount: params.amount,
      recipient: params.recipient,
    });
  }

  /**
   * Get private balance (sum of unspent commitments)
   */
  async getPrivateBalance(): Promise<bigint> {
    let total = 0n;

    for (const commitment of this.commitments.values()) {
      total += commitment.amount;
    }

    return total;
  }

  /**
   * Generate balance proof (prove you have at least X without revealing exact amount)
   */
  async generateBalanceProof(minBalance: bigint): Promise<ZKProof> {
    console.log('🔐 Generating balance proof...');
    console.log('   Minimum balance:', minBalance.toString());

    const actualBalance = await this.getPrivateBalance();

    if (actualBalance < minBalance) {
      throw new Error('Insufficient balance');
    }

    // Generate balance commitment
    const balanceCommitment = await this.generateCommitment({
      amount: actualBalance,
      recipient: this.getGhostIdentifier(),
    });

    const input = {
      // Public inputs
      minBalance: minBalance.toString(),
      balanceCommitment: '0x' + Buffer.from(balanceCommitment.value).toString('hex'),

      // Private inputs
      actualBalance: actualBalance.toString(),
      balanceNonce: '0x' + Buffer.from(balanceCommitment.nonce).toString('hex'),
      privateKey: '0x' + Buffer.from(this.privateKey).toString('hex'),
    };

    try {
      const { proof, publicSignals } = await snarkjs.groth16.fullProve(
        input,
        `${this.circuitsPath}/balance.wasm`,
        `${this.circuitsPath}/balance_final.zkey`
      );

      const proofBytes = this.serializeProof(proof);

      console.log('✅ Balance proof generated');

      return {
        proof: proofBytes,
        publicSignals,
      };
    } catch (error) {
      console.error('❌ Failed to generate balance proof:', error);
      throw error;
    }
  }

  // ============ HELPER METHODS ============

  private serializeProof(proof: any): Uint8Array {
    // Serialize Groth16 proof to bytes
    // In production, use proper serialization
    const proofStr = JSON.stringify(proof);
    return new Uint8Array(Buffer.from(proofStr));
  }

  private encodeDepositInstruction(commitment: Uint8Array, amount: bigint): Buffer {
    // Encode deposit instruction for Solana program
    // Format: [instruction_id (1 byte), commitment (32 bytes), amount (8 bytes)]
    const buffer = Buffer.alloc(1 + 32 + 8);
    buffer.writeUInt8(1, 0); // Deposit instruction ID
    buffer.set(commitment, 1);
    buffer.writeBigUInt64LE(amount, 33);
    return buffer;
  }

  private encodeWithdrawInstruction(
    proof: Uint8Array,
    root: Uint8Array,
    nullifier: Uint8Array,
    amount: bigint,
    recipient: PublicKey
  ): Buffer {
    // Encode withdraw instruction
    const buffer = Buffer.alloc(1 + 4 + proof.length + 32 + 32 + 8 + 32);
    let offset = 0;

    buffer.writeUInt8(2, offset); // Withdraw instruction ID
    offset += 1;

    buffer.writeUInt32LE(proof.length, offset);
    offset += 4;

    buffer.set(proof, offset);
    offset += proof.length;

    buffer.set(root, offset);
    offset += 32;

    buffer.set(nullifier, offset);
    offset += 32;

    buffer.writeBigUInt64LE(amount, offset);
    offset += 8;

    buffer.set(recipient.toBytes(), offset);

    return buffer;
  }

  private async sendAndConfirm(transaction: Transaction): Promise<string> {
    const { blockhash } = await this.connection.getLatestBlockhash();
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = this.wallet.publicKey;

    const signed = await this.wallet.signTransaction(transaction);
    const signature = await this.connection.sendRawTransaction(signed.serialize());
    await this.connection.confirmTransaction(signature);

    return signature;
  }
}

export type { GhostClientConfig };
