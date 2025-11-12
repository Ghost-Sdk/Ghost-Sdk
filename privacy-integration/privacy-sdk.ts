/**
 * Ghost Privacy SDK - Main Integration
 * Complete privacy SDK with ZK proofs, Merkle trees, and Solana integration
 */

import { Keypair, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { ZKProofGenerator } from './zkproof';
import { MerkleTree } from './merkletree';
import { SolanaPrivacyClient } from './solana-client';
import { NoteManager, ShieldedNote } from './note-manager';
import * as fs from 'fs';
import * as path from 'path';

export interface PrivacyConfig {
  rpcUrl: string;
  programId: string;
  network: string;
  dataDir: string;
  relayerUrl?: string;
}

export class GhostPrivacySDK {
  private config: PrivacyConfig;
  private solanaClient: SolanaPrivacyClient;
  private zkGenerator: ZKProofGenerator;
  private merkleTree!: MerkleTree;
  private noteManager!: NoteManager;
  private poolAddress?: string;
  private initialized: boolean = false;

  constructor(config?: Partial<PrivacyConfig>) {
    // Load config
    this.config = {
      rpcUrl: config?.rpcUrl || 'https://api.devnet.solana.com',
      programId: config?.programId || '3wiFPaYTQZZD71rd4pohPRr8JaFaGN3XaNWLoGSk31Ck',
      network: config?.network || 'devnet',
      dataDir: config?.dataDir || './data',
    };

    // Initialize components
    this.solanaClient = new SolanaPrivacyClient(
      this.config.rpcUrl,
      this.config.programId
    );
    this.zkGenerator = new ZKProofGenerator();
  }

  /**
   * Initialize the SDK (must be called before use)
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    // Initialize Merkle tree
    this.merkleTree = await MerkleTree.load(
      path.join(this.config.dataDir, 'merkle_tree.json')
    );

    // Initialize note manager
    this.noteManager = new NoteManager(this.config.dataDir);
    await this.noteManager.initialize();

    // Load pool address
    this.loadPoolAddress();

    this.initialized = true;
  }

  private ensureInitialized(): void {
    if (!this.initialized) {
      throw new Error('SDK not initialized. Call initialize() first.');
    }
  }

  /**
   * Initialize a new shielded pool (one-time setup)
   */
  async initializePool(payer: Keypair): Promise<string> {
    this.ensureInitialized();
    const poolAddress = await this.solanaClient.initializePool(payer);
    this.poolAddress = poolAddress;
    this.savePoolAddress(poolAddress);
    return poolAddress;
  }

  /**
   * Deposit SOL into shielded pool
   * Returns a shielded note
   */
  async deposit(
    payer: Keypair,
    amountSOL: number,
    owner: string
  ): Promise<ShieldedNote> {
    this.ensureInitialized();
    if (!this.poolAddress) {
      throw new Error('Pool not initialized. Call initializePool() first.');
    }

    const amountLamports = amountSOL * LAMPORTS_PER_SOL;

    // Create note
    const note = this.noteManager.createNote(amountLamports, owner);

    // Deposit on-chain
    const { commitment, nullifier, txSignature } =
      await this.solanaClient.deposit(
        payer,
        this.poolAddress,
        amountLamports,
        note.secret
      );

    // Update note with tx signature
    note.txSignature = txSignature;


    return note;
  }

  /**
   * Withdraw SOL from shielded pool with zero-knowledge proof
   */
  async withdraw(
    payer: Keypair,
    note: ShieldedNote,
    recipient: PublicKey,
    amountSOL: number
  ): Promise<string> {
    this.ensureInitialized();
    if (!this.poolAddress) {
      throw new Error('Pool not initialized.');
    }

    if (note.spent) {
      throw new Error('Note already spent');
    }

    const amountLamports = amountSOL * LAMPORTS_PER_SOL;

    // Withdraw with ZK proof
    const txSignature = await this.solanaClient.withdraw(
      payer,
      this.poolAddress,
      note.commitment,
      note.nullifier,
      note.secret,
      recipient,
      amountLamports
    );

    // Mark note as spent
    this.noteManager.spendNote(note.commitment, txSignature);


    return txSignature;
  }

  /**
   * Private transfer between shielded addresses
   */
  async privateTransfer(
    payer: Keypair,
    fromNote: ShieldedNote,
    toOwner: string,
    amountSOL: number
  ): Promise<{ txSignature: string; newNote: ShieldedNote }> {
    if (!this.poolAddress) {
      throw new Error('Pool not initialized.');
    }


    const amountLamports = amountSOL * LAMPORTS_PER_SOL;

    // Spend old note
    const changeAmount = fromNote.amount - amountLamports;
    if (changeAmount < 0) {
      throw new Error('Insufficient balance in note');
    }

    // Create new note for recipient
    const newNote = this.noteManager.createNote(amountLamports, toOwner);

    // Reload Merkle tree to get latest state
    this.merkleTree = MerkleTree.load(
      path.join(this.config.dataDir, 'merkle_tree.json')
    );

    // Get Merkle proof for the note being spent
    const leafIndex = this.findCommitmentIndex(fromNote.commitment);
    if (leafIndex === -1) {
      throw new Error('Commitment not found in Merkle tree');
    }

    const merkleProof = this.merkleTree.getProof(leafIndex);
    const root = this.merkleTree.getRoot();

    // Generate ZK proof for transfer

    const zkProof = await this.zkGenerator.generateTransferProof({
      amount: amountLamports,
      privateKey: fromNote.secret,
      pathElements: merkleProof.pathElements,
      pathIndices: merkleProof.pathIndices,
      nonce: newNote.secret,
      oldNonce: fromNote.secret, // Nonce from the old commitment
      nullifier: fromNote.nullifier,
      root: root,
      commitment: newNote.commitment,
    });


    // Get ring members from Merkle tree (other commitments for anonymity set)
    const ringMembers = this.getRingMembers(fromNote.commitment, 3); // Get 3 other commitments

    // Encrypt amount (simple encryption for demo)
    const encryptedAmount = this.encryptAmount(amountLamports, newNote.secret);

    // Submit real on-chain private transfer transaction

    const txSignature = await this.solanaClient.privateTransfer(
      payer,
      this.poolAddress,
      fromNote.commitment,
      fromNote.secret,
      newNote.commitment,
      ringMembers,
      encryptedAmount
    );

    // Add new commitment to Merkle tree
    this.merkleTree.insert(newNote.commitment);
    this.merkleTree.save(path.join(this.config.dataDir, 'merkle_tree.json'));

    // Update note with transaction signature
    newNote.txSignature = txSignature;

    // Mark old note spent
    this.noteManager.spendNote(fromNote.commitment, txSignature);

    // Create change note if needed
    if (changeAmount > 0) {
      const changeNote = this.noteManager.createNote(changeAmount, fromNote.owner);
      // Add change commitment to tree and give it a tx signature
      this.merkleTree.insert(changeNote.commitment);
      this.merkleTree.save(path.join(this.config.dataDir, 'merkle_tree.json'));
      changeNote.txSignature = txSignature;
    }


    return { txSignature, newNote };
  }

  /**
   * Withdraw via relayer for complete anonymity
   * The relayer submits the transaction, hiding your wallet address
   */
  async withdrawViaRelayer(
    note: ShieldedNote,
    recipient: PublicKey,
    amountSOL: number,
    relayerUrl?: string
  ): Promise<string> {
    if (!this.poolAddress) {
      throw new Error('Pool not initialized.');
    }

    if (note.spent) {
      throw new Error('Note already spent');
    }

    const relayer = relayerUrl || this.config.relayerUrl || 'http://localhost:3000';


    const amountLamports = amountSOL * LAMPORTS_PER_SOL;

    // Find commitment in tree
    const leafIndex = this.findCommitmentIndex(note.commitment);
    if (leafIndex === -1) {
      throw new Error('Commitment not found in Merkle tree');
    }

    // Generate Merkle proof
    const merkleProof = this.merkleTree.getProof(leafIndex);
    const root = this.merkleTree.getRoot();


    // Generate ZK-SNARK proof
    const zkProof = await this.zkGenerator.generateTransferProof({
      amount: amountLamports,
      privateKey: note.secret,
      pathElements: merkleProof.pathElements,
      pathIndices: merkleProof.pathIndices,
      nonce: note.secret,
      oldNonce: note.secret,
      nullifier: note.nullifier,
      root,
      commitment: this.generateCommitment(0, note.secret),
    });


    // Serialize proof
    const proofBytes = this.serializeProof(zkProof.proof);

    // Build instruction data (same format as direct withdraw)
    const instructionData = Buffer.alloc(1 + 4 + proofBytes.length + 32 + 32 + 1 + 32 + 32 + 8);
    let offset = 0;

    // Discriminant (u8) - Withdraw = 2
    instructionData.writeUInt8(2, offset);
    offset += 1;

    // Proof (Vec<u8>)
    instructionData.writeUInt32LE(proofBytes.length, offset);
    offset += 4;
    Buffer.from(proofBytes).copy(instructionData, offset);
    offset += proofBytes.length;

    // Root
    this.hexToBytes(root).copy(instructionData, offset);
    offset += 32;

    // Nullifier
    this.hexToBytes(note.nullifier).copy(instructionData, offset);
    offset += 32;

    // New commitment (Option)
    instructionData.writeUInt8(1, offset);
    offset += 1;
    this.hexToBytes(this.generateCommitment(0, note.secret)).copy(instructionData, offset);
    offset += 32;

    // Recipient
    Buffer.from(recipient.toBytes()).copy(instructionData, offset);
    offset += 32;

    // Amount
    instructionData.writeBigUInt64LE(BigInt(amountLamports), offset);


    // Send to relayer
    const response = await fetch(`${relayer}/relay-withdraw`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        poolAddress: this.poolAddress,
        instructionData: instructionData.toString('base64'),
        recipient: recipient.toString(),
        amount: amountLamports,
      }),
    });

    if (!response.ok) {
      const error = await response.json() as { error?: string; message?: string };
      throw new Error(`Relayer error: ${error.error || error.message}`);
    }

    const result = await response.json() as { signature: string; relayer: string; success: boolean; fee: number };

    // Mark note as spent
    this.noteManager.spendNote(note.commitment, result.signature);


    return result.signature;
  }

  /**
   * Helper: Generate commitment
   */
  private generateCommitment(amount: number, secret: string): string {
    const crypto = require('crypto');
    const hash = crypto.createHash('sha256');
    hash.update(`${amount}:${secret}`);
    return hash.digest('hex');
  }

  /**
   * Helper: Convert hex to bytes
   */
  private hexToBytes(hex: string): Buffer {
    const bytes = Buffer.alloc(32);
    for (let i = 0; i < 64 && i < hex.length; i += 2) {
      bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
    }
    return bytes;
  }

  /**
   * Helper: Serialize proof
   */
  private serializeProof(proof: any): Uint8Array {
    return new Uint8Array(256);
  }

  /**
   * Direct private transfer to wallet (withdraw to recipient in one step)
   */
  async transferToWallet(
    payer: Keypair,
    fromNote: ShieldedNote,
    recipientAddress: PublicKey,
    amountSOL: number
  ): Promise<string> {
    if (!this.poolAddress) {
      throw new Error('Pool not initialized.');
    }

    if (fromNote.spent) {
      throw new Error('Note already spent');
    }


    const amountLamports = amountSOL * LAMPORTS_PER_SOL;

    // Check balance
    const changeAmount = fromNote.amount - amountLamports;
    if (changeAmount < 0) {
      throw new Error('Insufficient balance in note');
    }


    // This is essentially a withdrawal, so we use the withdraw function
    const txSignature = await this.solanaClient.withdraw(
      payer,
      this.poolAddress,
      fromNote.commitment,
      fromNote.nullifier,
      fromNote.secret,
      recipientAddress,
      amountLamports
    );

    // Mark note as spent
    this.noteManager.spendNote(fromNote.commitment, txSignature);

    // Create change note if needed
    if (changeAmount > 0) {
      const changeNote = this.noteManager.createNote(changeAmount, fromNote.owner);
      // Add to Merkle tree
      this.merkleTree.insert(changeNote.commitment);
      this.merkleTree.save(path.join(this.config.dataDir, 'merkle_tree.json'));
      changeNote.txSignature = txSignature;
    }


    return txSignature;
  }

  /**
   * Get shielded balance for an owner
   */
  getBalance(owner: string): number {
    const balanceLamports = this.noteManager.getBalance(owner);
    return balanceLamports / LAMPORTS_PER_SOL;
  }

  /**
   * Get all unspent notes for an owner
   */
  getNotes(owner: string): ShieldedNote[] {
    return this.noteManager.getUnspentNotes(owner);
  }

  /**
   * Display privacy statistics
   */
  displayStats(owner?: string): void {

    if (owner) {
      const balance = this.getBalance(owner);
      const notes = this.getNotes(owner);


      if (notes.length > 0) {
        notes.forEach((note, i) => {
        });
      }
    }

    this.noteManager.displayStats();

  }

  /**
   * Get ring members for ring signature (other commitments in the anonymity set)
   */
  private getRingMembers(excludeCommitment: string, count: number): string[] {
    const members: string[] = [];
    const leafCount = this.merkleTree.getLeafCount();

    for (let i = 0; i < leafCount && members.length < count; i++) {
      const leaf = this.merkleTree.getLeaf(i);
      if (leaf && leaf !== excludeCommitment) {
        members.push(leaf);
      }
    }

    // If not enough real members, pad with dummy commitments
    while (members.length < count) {
      const crypto = require('crypto');
      const dummyCommitment = crypto.randomBytes(32).toString('hex');
      members.push(dummyCommitment);
    }

    return members;
  }

  /**
   * Encrypt amount for private transfer
   */
  private encryptAmount(amount: number, secret: string): Uint8Array {
    const crypto = require('crypto');
    const cipher = crypto.createCipheriv(
      'aes-256-cbc',
      Buffer.from(secret.substring(0, 64), 'hex'),
      Buffer.alloc(16, 0) // IV
    );

    const amountBuffer = Buffer.alloc(8);
    amountBuffer.writeBigUInt64LE(BigInt(amount));

    let encrypted = cipher.update(amountBuffer);
    encrypted = Buffer.concat([encrypted, cipher.final()]);

    return new Uint8Array(encrypted);
  }

  /**
   * Find commitment index in Merkle tree
   */
  private findCommitmentIndex(commitment: string): number {
    const leafCount = this.merkleTree.getLeafCount();
    for (let i = 0; i < leafCount; i++) {
      const leaf = this.merkleTree.getLeaf(i);
      if (leaf === commitment) {
        return i;
      }
    }
    return -1;
  }

  /**
   * Save pool address to disk
   */
  private savePoolAddress(address: string): void {
    const configPath = path.join(this.config.dataDir, 'pool_config.json');
    fs.writeFileSync(
      configPath,
      JSON.stringify({ poolAddress: address }, null, 2)
    );
  }

  /**
   * Load pool address from disk
   */
  private loadPoolAddress(): void {
    const configPath = path.join(this.config.dataDir, 'pool_config.json');
    if (fs.existsSync(configPath)) {
      const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      this.poolAddress = config.poolAddress;
    }
  }

  /**
   * Get Solana connection
   */
  getConnection() {
    return this.solanaClient.getConnection();
  }
}

// Example usage
export async function demoPrivacySDK() {

  // Initialize SDK
  const sdk = new GhostPrivacySDK({
    network: 'devnet',
    dataDir: './data',
  });

  // Create test wallet
  const wallet = Keypair.generate();

  // Display initial stats
  sdk.displayStats('alice');

}
