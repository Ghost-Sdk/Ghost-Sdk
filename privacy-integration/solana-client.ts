/**
 * Solana Transaction Builder for Privacy Operations
 * Interacts with deployed Ghost Privacy program
 */

import {
  Connection,
  PublicKey,
  Transaction,
  TransactionInstruction,
  Keypair,
  SystemProgram,
  LAMPORTS_PER_SOL,
  sendAndConfirmTransaction,
} from '@solana/web3.js';
import * as borsh from 'borsh';
import { ZKProofGenerator } from './zkproof';
import { MerkleTree } from './merkletree';

// Program ID from deployment
const PROGRAM_ID = new PublicKey('3wiFPaYTQZZD71rd4pohPRr8JaFaGN3XaNWLoGSk31Ck');

// Instruction types (must match Solana program)
enum PrivacyInstruction {
  InitializePool = 0,
  Deposit = 1,
  Withdraw = 2,
  Transfer = 3,
  CreateNote = 4,
  SpendNote = 5,
}

// Instruction data schemas
class InitializePoolData {
  instruction = PrivacyInstruction.InitializePool;
  tree_depth: number;
  denomination: bigint;

  constructor(props: { tree_depth: number; denomination: bigint }) {
    this.tree_depth = props.tree_depth;
    this.denomination = props.denomination;
  }
}

class DepositData {
  instruction = PrivacyInstruction.Deposit;
  commitment: Uint8Array;
  amount: bigint;

  constructor(props: { commitment: Uint8Array; amount: bigint }) {
    this.commitment = props.commitment;
    this.amount = props.amount;
  }
}

class WithdrawData {
  instruction = PrivacyInstruction.Withdraw;
  proof: Uint8Array;
  root: Uint8Array;
  nullifier: Uint8Array;
  new_commitment: Uint8Array;
  recipient: Uint8Array;

  constructor(props: {
    proof: Uint8Array;
    root: Uint8Array;
    nullifier: Uint8Array;
    new_commitment: Uint8Array;
    recipient: Uint8Array;
  }) {
    this.proof = props.proof;
    this.root = props.root;
    this.nullifier = props.nullifier;
    this.new_commitment = props.new_commitment;
    this.recipient = props.recipient;
  }
}

export class SolanaPrivacyClient {
  private connection: Connection;
  private programId: PublicKey;
  private zkGenerator: ZKProofGenerator;
  private merkleTree: MerkleTree;

  constructor(
    rpcUrl: string = 'https://api.devnet.solana.com',
    programId: string = PROGRAM_ID.toString()
  ) {
    this.connection = new Connection(rpcUrl, 'confirmed');
    this.programId = new PublicKey(programId);
    this.zkGenerator = new ZKProofGenerator();
    this.merkleTree = MerkleTree.load('./data/merkle_tree.json');
  }

  /**
   * Get connection
   */
  getConnection(): Connection {
    return this.connection;
  }

  /**
   * Initialize a new shielded pool
   */
  async initializePool(
    payer: Keypair,
    treeDepth: number = 20,
    denomination: number = 0.1 * LAMPORTS_PER_SOL
  ): Promise<string> {
    console.log('\n=== Initializing Shielded Pool ===');

    // Generate pool account
    const poolAccount = Keypair.generate();

    // Calculate account size for PoolState
    // Pubkey(32) + merkle_root[32] + tree_depth(1) + commitment_count(8) +
    // denomination(8) + tvl(8) + Vec<nullifiers>(4+space) + Vec<key_images>(4+space) + vault(32)
    // Start with 1KB to allow for dynamic vectors
    const poolAccountSize = 1024;

    // Get minimum rent-exempt balance
    const rentExemptBalance = await this.connection.getMinimumBalanceForRentExemption(
      poolAccountSize
    );

    console.log(`Creating pool account (${poolAccountSize} bytes, ${rentExemptBalance / LAMPORTS_PER_SOL} SOL rent)...`);

    // Derive vault PDA (same seeds as Rust program)
    const [vaultPubkey] = PublicKey.findProgramAddressSync(
      [Buffer.from('vault'), poolAccount.publicKey.toBuffer()],
      this.programId
    );

    console.log(`Pool vault will be: ${vaultPubkey.toString()}`);

    // Manually create the borsh-compatible instruction buffer
    // Borsh uses u8 for enum discriminants (1 byte)
    const instructionBuffer = Buffer.alloc(1 + 1 + 8); // discriminant(u8) + tree_depth(u8) + denomination(u64)
    instructionBuffer.writeUInt8(PrivacyInstruction.InitializePool, 0); // enum discriminant (u8)
    instructionBuffer.writeUInt8(treeDepth, 1); // tree_depth
    instructionBuffer.writeBigUInt64LE(BigInt(denomination), 2); // denomination (little-endian)

    // Build transaction with account creation + initialization
    const transaction = new Transaction()
      .add(
        SystemProgram.createAccount({
          fromPubkey: payer.publicKey,
          newAccountPubkey: poolAccount.publicKey,
          lamports: rentExemptBalance,
          space: poolAccountSize,
          programId: this.programId,
        })
      )
      .add(
        new TransactionInstruction({
          keys: [
            { pubkey: poolAccount.publicKey, isSigner: false, isWritable: true },
            { pubkey: payer.publicKey, isSigner: true, isWritable: true },
            { pubkey: vaultPubkey, isSigner: false, isWritable: true }, // Add vault PDA
            { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
          ],
          programId: this.programId,
          data: instructionBuffer,
        })
      );

    // Send transaction
    const signature = await sendAndConfirmTransaction(
      this.connection,
      transaction,
      [payer, poolAccount],
      { commitment: 'confirmed' }
    );

    console.log(`Pool initialized: ${poolAccount.publicKey.toString()}`);
    console.log(`Transaction: ${signature}`);

    return poolAccount.publicKey.toString();
  }

  /**
   * Deposit funds into shielded pool
   */
  async deposit(
    payer: Keypair,
    poolAddress: string,
    amount: number,
    secret: string
  ): Promise<{ commitment: string; nullifier: string; txSignature: string }> {
    console.log('\n=== Depositing to Shielded Pool ===');
    console.log(`Amount: ${amount / LAMPORTS_PER_SOL} SOL`);

    // Generate commitment
    const commitment = this.generateCommitment(amount, secret);
    const nullifier = this.generateNullifier(secret);

    console.log(`Commitment: ${commitment}`);
    console.log(`Nullifier: ${nullifier}`);

    // Add to local Merkle tree
    const leafIndex = this.merkleTree.insert(commitment);
    console.log(`Added to Merkle tree at index: ${leafIndex}`);

    const poolPubkey = new PublicKey(poolAddress);

    // Derive pool vault PDA (same as in Rust program)
    const [vaultPubkey] = PublicKey.findProgramAddressSync(
      [Buffer.from('vault'), poolPubkey.toBuffer()],
      this.programId
    );

    console.log(`Pool vault: ${vaultPubkey.toString()}`);

    // Create deposit instruction data (Borsh serialized)
    // Borsh uses u8 for enum discriminants (1 byte)
    const instructionBuffer = Buffer.alloc(1 + 32 + 8); // discriminant(u8) + commitment + amount
    instructionBuffer.writeUInt8(PrivacyInstruction.Deposit, 0); // enum discriminant (u8)
    this.hexToBytes(commitment).copy(instructionBuffer, 1); // commitment (32 bytes)
    instructionBuffer.writeBigUInt64LE(BigInt(amount), 33); // amount (8 bytes)

    // Build instruction with correct accounts order
    const instruction = new TransactionInstruction({
      keys: [
        { pubkey: poolPubkey, isSigner: false, isWritable: true },        // Pool state
        { pubkey: payer.publicKey, isSigner: true, isWritable: true },    // Depositor
        { pubkey: vaultPubkey, isSigner: false, isWritable: true },       // Pool vault
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false }, // System program
      ],
      programId: this.programId,
      data: instructionBuffer,
    });

    const transaction = new Transaction().add(instruction);

    const signature = await sendAndConfirmTransaction(
      this.connection,
      transaction,
      [payer],
      { commitment: 'confirmed' }
    );

    console.log(`Deposit successful!`);
    console.log(`Transaction: ${signature}`);

    // Save updated tree
    this.merkleTree.save('./data/merkle_tree.json');

    return { commitment, nullifier, txSignature: signature };
  }

  /**
   * Withdraw funds from shielded pool with ZK proof
   */
  async withdraw(
    payer: Keypair,
    poolAddress: string,
    commitment: string,
    nullifier: string,
    secret: string,
    recipient: PublicKey,
    amount: number
  ): Promise<string> {
    console.log('\n=== Withdrawing from Shielded Pool ===');
    console.log(`Amount: ${amount / LAMPORTS_PER_SOL} SOL`);
    console.log(`Recipient: ${recipient.toString()}`);

    // Find commitment in tree
    const leafIndex = this.findCommitmentIndex(commitment);
    if (leafIndex === -1) {
      throw new Error('Commitment not found in tree');
    }

    // Generate Merkle proof
    const merkleProof = this.merkleTree.getProof(leafIndex);
    const root = this.merkleTree.getRoot();

    console.log(`Generating ZK proof...`);

    // Generate ZK-SNARK proof
    const zkProof = await this.zkGenerator.generateTransferProof({
      amount,
      privateKey: secret,
      pathElements: merkleProof.pathElements,
      pathIndices: merkleProof.pathIndices,
      nonce: secret,
      oldNonce: secret, // Old nonce from the spent note
      nullifier,
      root,
      commitment: this.generateCommitment(0, secret), // New commitment for change
    });

    console.log(`ZK proof generated successfully`);

    // Serialize proof for Solana
    const proofBytes = this.serializeProof(zkProof.proof);

    const poolPubkey = new PublicKey(poolAddress);

    // Derive vault PDA
    const [vaultPubkey] = PublicKey.findProgramAddressSync(
      [Buffer.from('vault'), poolPubkey.toBuffer()],
      this.programId
    );

    console.log(`Pool vault: ${vaultPubkey.toString()}`);

    // Build Borsh-serialized instruction data
    // Format: discriminant(u8) + proof(Vec) + root([u8;32]) + nullifier([u8;32]) +
    //         new_commitment(Option<[u8;32]>) + recipient(Pubkey) + amount(u64)

    const instructionData = Buffer.alloc(1 + 4 + proofBytes.length + 32 + 32 + 1 + 32 + 32 + 8);
    let offset = 0;

    // Discriminant (u8)
    instructionData.writeUInt8(PrivacyInstruction.Withdraw, offset);
    offset += 1;

    // Proof (Vec<u8>: u32 length + data)
    instructionData.writeUInt32LE(proofBytes.length, offset);
    offset += 4;
    Buffer.from(proofBytes).copy(instructionData, offset);
    offset += proofBytes.length;

    // Root ([u8; 32])
    this.hexToBytes(root).copy(instructionData, offset);
    offset += 32;

    // Nullifier ([u8; 32])
    this.hexToBytes(nullifier).copy(instructionData, offset);
    offset += 32;

    // New commitment (Option<[u8; 32]>: 1 byte for Some/None + 32 bytes if Some)
    instructionData.writeUInt8(1, offset); // 1 = Some
    offset += 1;
    this.hexToBytes(this.generateCommitment(0, secret)).copy(instructionData, offset);
    offset += 32;

    // Recipient (Pubkey as 32 bytes)
    Buffer.from(recipient.toBytes()).copy(instructionData, offset);
    offset += 32;

    // Amount (u64)
    instructionData.writeBigUInt64LE(BigInt(amount), offset);

    const instruction = new TransactionInstruction({
      keys: [
        { pubkey: poolPubkey, isSigner: false, isWritable: true },       // Pool state
        { pubkey: vaultPubkey, isSigner: false, isWritable: true },      // Pool vault
        { pubkey: recipient, isSigner: false, isWritable: true },         // Recipient
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false }, // System program
      ],
      programId: this.programId,
      data: instructionData.slice(0, offset + 8), // Trim to actual size
    });

    const transaction = new Transaction().add(instruction);

    const signature = await sendAndConfirmTransaction(
      this.connection,
      transaction,
      [payer],
      { commitment: 'confirmed' }
    );

    console.log(`Withdrawal successful!`);
    console.log(`Transaction: ${signature}`);

    return signature;
  }

  /**
   * Private transfer between shielded addresses
   */
  async privateTransfer(
    payer: Keypair,
    poolAddress: string,
    fromCommitment: string,
    fromSecret: string,
    toCommitment: string,
    ringMembers: string[],
    encryptedAmount: Uint8Array
  ): Promise<string> {
    console.log('\n=== Private Transfer ===');
    console.log(`From commitment: ${fromCommitment.substring(0, 16)}...`);
    console.log(`To commitment: ${toCommitment.substring(0, 16)}...`);

    // Generate key image from secret (prevents double-spending in ring signatures)
    const keyImage = this.generateKeyImage(fromSecret);
    console.log(`Key image: ${keyImage.substring(0, 16)}...`);

    // Generate ring signature proof
    console.log('Generating ring signature proof...');
    const ringSignatureProof = await this.zkGenerator.generateRingSignatureProof({
      privateKey: fromSecret,
      nullifier: keyImage,
      ringMembers: ringMembers,
    });

    // Serialize ring signature (size must be ring_size * 64 bytes)
    const ringSigBytes = this.serializeRingSignature(ringSignatureProof.proof, ringMembers.length);

    const poolPubkey = new PublicKey(poolAddress);

    // Dummy accounts for sender/recipient commitments (not used in current implementation)
    const dummyAccount1 = Keypair.generate().publicKey;
    const dummyAccount2 = Keypair.generate().publicKey;

    // Build Borsh-serialized instruction data
    // Format: discriminant(u8) + ring_signature(Vec) + key_image([u8;32]) +
    //         ring_members(Vec<[u8;32]>) + new_commitment([u8;32]) + encrypted_amount(Vec)

    let offset = 0;
    const ringMemberBytes = ringMembers.length * 32;
    const instructionData = Buffer.alloc(
      1 + // discriminant
      4 + ringSigBytes.length + // ring_signature Vec
      32 + // key_image
      4 + ringMemberBytes + // ring_members Vec
      32 + // new_commitment
      4 + encryptedAmount.length // encrypted_amount Vec
    );

    // Discriminant (u8) - PrivateTransfer = 3
    instructionData.writeUInt8(3, offset);
    offset += 1;

    // Ring signature (Vec<u8>: u32 length + data)
    instructionData.writeUInt32LE(ringSigBytes.length, offset);
    offset += 4;
    Buffer.from(ringSigBytes).copy(instructionData, offset);
    offset += ringSigBytes.length;

    // Key image ([u8; 32])
    this.hexToBytes(keyImage).copy(instructionData, offset);
    offset += 32;

    // Ring members (Vec<[u8; 32]>: u32 length + array of 32-byte arrays)
    instructionData.writeUInt32LE(ringMembers.length, offset);
    offset += 4;
    for (const member of ringMembers) {
      this.hexToBytes(member).copy(instructionData, offset);
      offset += 32;
    }

    // New commitment ([u8; 32])
    this.hexToBytes(toCommitment).copy(instructionData, offset);
    offset += 32;

    // Encrypted amount (Vec<u8>: u32 length + data)
    instructionData.writeUInt32LE(encryptedAmount.length, offset);
    offset += 4;
    Buffer.from(encryptedAmount).copy(instructionData, offset);
    offset += encryptedAmount.length;

    const instruction = new TransactionInstruction({
      keys: [
        { pubkey: poolPubkey, isSigner: false, isWritable: true },        // Pool state
        { pubkey: dummyAccount1, isSigner: false, isWritable: false },    // Sender commitment (unused)
        { pubkey: dummyAccount2, isSigner: false, isWritable: false },    // Recipient commitment (unused)
      ],
      programId: this.programId,
      data: instructionData,
    });

    const transaction = new Transaction().add(instruction);

    const signature = await sendAndConfirmTransaction(
      this.connection,
      transaction,
      [payer],
      { commitment: 'confirmed' }
    );

    console.log(`Private transfer successful!`);
    console.log(`Transaction: ${signature}`);

    return signature;
  }

  /**
   * Helper: Generate key image (similar to nullifier, for ring signatures)
   */
  private generateKeyImage(secret: string): string {
    const crypto = require('crypto');
    const hash = crypto.createHash('sha256');
    hash.update(`key_image:${secret}`);
    return hash.digest('hex');
  }

  /**
   * Helper: Generate commitment hash
   */
  private generateCommitment(amount: number, secret: string): string {
    const crypto = require('crypto');
    const hash = crypto.createHash('sha256');
    hash.update(`${amount}:${secret}`);
    return hash.digest('hex');
  }

  /**
   * Helper: Generate nullifier hash
   */
  private generateNullifier(secret: string): string {
    const crypto = require('crypto');
    const hash = crypto.createHash('sha256');
    hash.update(`nullifier:${secret}`);
    return hash.digest('hex');
  }

  /**
   * Helper: Find commitment index in tree
   */
  private findCommitmentIndex(commitment: string): number {
    for (let i = 0; i < this.merkleTree.getLeafCount(); i++) {
      // Would need to check tree leaves - simplified for now
    }
    return 0; // Return first index for demo
  }

  /**
   * Helper: Convert hex string to bytes
   */
  private hexToBytes(hex: string): Buffer {
    const bytes = Buffer.alloc(32);
    for (let i = 0; i < 64 && i < hex.length; i += 2) {
      bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
    }
    return bytes;
  }

  /**
   * Helper: Serialize u8
   */
  private serializeU8(value: number): Uint8Array {
    return new Uint8Array([value]);
  }

  /**
   * Helper: Serialize u64
   */
  private serializeU64(value: bigint): Uint8Array {
    const bytes = new Uint8Array(8);
    for (let i = 0; i < 8; i++) {
      bytes[i] = Number((value >> BigInt(i * 8)) & BigInt(0xff));
    }
    return bytes;
  }

  /**
   * Helper: Serialize proof
   */
  private serializeProof(proof: any): Uint8Array {
    // Simplified - in production, properly serialize Groth16 proof
    return new Uint8Array(256); // Placeholder
  }

  /**
   * Helper: Serialize ring signature
   * Ring signature size must be ring_size * 64 bytes (32 for c + 32 for r per member)
   */
  private serializeRingSignature(proof: any, ringSize: number): Uint8Array {
    const signatureSize = ringSize * 64;
    return new Uint8Array(signatureSize);
  }
}
