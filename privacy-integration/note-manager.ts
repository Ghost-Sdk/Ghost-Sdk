/**
 * Shielded Note Management System
 * Handles encrypted notes, nullifier tracking, and note database
 */

import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { buildPoseidon } from 'circomlibjs';

export interface ShieldedNote {
  commitment: string;
  nullifier: string;
  amount: number;
  secret: string;
  owner: string;
  spent: boolean;
  createdAt: number;
  txSignature?: string;
}

export interface NullifierEntry {
  nullifier: string;
  usedAt: number;
  txSignature: string;
}

export class NoteManager {
  private notes: Map<string, ShieldedNote>;
  private nullifiers: Map<string, NullifierEntry>;
  private dataDir: string;
  private poseidon: any;
  private initialized: boolean = false;

  constructor(dataDir: string = './data') {
    this.notes = new Map();
    this.nullifiers = new Map();
    this.dataDir = dataDir;

    // Create data directory if it doesn't exist
    if (!fs.existsSync(this.dataDir)) {
      fs.mkdirSync(this.dataDir, { recursive: true });
    }
  }

  /**
   * Initialize Poseidon hash function (must be called before using manager)
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;
    this.poseidon = await buildPoseidon();
    this.initialized = true;
    this.load();
  }

  private ensureInitialized(): void {
    if (!this.initialized) {
      throw new Error('NoteManager not initialized. Call initialize() first.');
    }
  }

  /**
   * Create a new shielded note
   */
  createNote(
    amount: number,
    owner: string,
    txSignature?: string
  ): ShieldedNote {
    this.ensureInitialized();
    const secret = crypto.randomBytes(32).toString('hex');
    const commitment = this.generateCommitment(amount, secret, owner);
    const nullifier = this.generateNullifier(secret);

    const note: ShieldedNote = {
      commitment,
      nullifier,
      amount,
      secret,
      owner,
      spent: false,
      createdAt: Date.now(),
      txSignature,
    };

    this.notes.set(commitment, note);
    this.save();

    return note;
  }

  /**
   * Mark a note as spent
   */
  spendNote(commitment: string, txSignature: string): boolean {
    const note = this.notes.get(commitment);
    if (!note) {
      console.error(`Note not found: ${commitment}`);
      return false;
    }

    if (note.spent) {
      console.error(`Note already spent: ${commitment}`);
      return false;
    }

    // Check if nullifier already used
    if (this.isNullifierUsed(note.nullifier)) {
      console.error(`Nullifier already used: ${note.nullifier}`);
      return false;
    }

    // Mark note as spent
    note.spent = true;

    // Record nullifier
    this.nullifiers.set(note.nullifier, {
      nullifier: note.nullifier,
      usedAt: Date.now(),
      txSignature,
    });

    this.save();


    return true;
  }

  /**
   * Get all unspent notes for an owner
   */
  getUnspentNotes(owner: string): ShieldedNote[] {
    const unspent: ShieldedNote[] = [];

    for (const note of this.notes.values()) {
      // Only return notes that have been successfully deposited (have txSignature)
      if (note.owner === owner && !note.spent && note.txSignature) {
        unspent.push(note);
      }
    }

    return unspent;
  }

  /**
   * Get total unspent balance for an owner
   */
  getBalance(owner: string): number {
    let total = 0;

    for (const note of this.notes.values()) {
      // Only count notes that have been successfully deposited
      if (note.owner === owner && !note.spent && note.txSignature) {
        total += note.amount;
      }
    }

    return total;
  }

  /**
   * Get note by commitment
   */
  getNote(commitment: string): ShieldedNote | undefined {
    return this.notes.get(commitment);
  }

  /**
   * Check if nullifier has been used
   */
  isNullifierUsed(nullifier: string): boolean {
    return this.nullifiers.has(nullifier);
  }

  /**
   * Get all notes
   */
  getAllNotes(): ShieldedNote[] {
    return Array.from(this.notes.values());
  }

  /**
   * Get note count
   */
  getNoteCount(): number {
    return this.notes.size;
  }

  /**
   * Get spent note count
   */
  getSpentCount(): number {
    let count = 0;
    for (const note of this.notes.values()) {
      if (note.spent) count++;
    }
    return count;
  }

  /**
   * Export notes for backup
   */
  export(): { notes: any[]; nullifiers: any[] } {
    return {
      notes: Array.from(this.notes.entries()),
      nullifiers: Array.from(this.nullifiers.entries()),
    };
  }

  /**
   * Import notes from backup
   */
  import(data: { notes: any[]; nullifiers: any[] }): void {
    this.notes = new Map(data.notes);
    this.nullifiers = new Map(data.nullifiers);
    this.save();
  }

  /**
   * Save to disk
   */
  private save(): void {
    const data = this.export();
    const notesPath = path.join(this.dataDir, 'notes.json');
    fs.writeFileSync(notesPath, JSON.stringify(data, null, 2));
  }

  /**
   * Load from disk
   */
  private load(): void {
    const notesPath = path.join(this.dataDir, 'notes.json');

    if (!fs.existsSync(notesPath)) {
      return;
    }

    try {
      const data = JSON.parse(fs.readFileSync(notesPath, 'utf-8'));
      this.import(data);
    } catch (error) {
      console.error('Failed to load notes database:', error);
    }
  }

  /**
   * Helper: Generate commitment using Poseidon
   */
  private generateCommitment(amount: number, secret: string, owner: string): string {
    // commitment = H(amount, secret, owner)
    const amountBigInt = BigInt(amount);
    const secretBigInt = BigInt('0x' + secret);
    const ownerBigInt = BigInt('0x' + Buffer.from(owner).toString('hex').padStart(64, '0').slice(0, 64));

    const hash = this.poseidon([amountBigInt, secretBigInt, ownerBigInt]);
    const hashValue = this.poseidon.F.toString(hash);

    return BigInt(hashValue).toString(16).padStart(64, '0');
  }

  /**
   * Helper: Generate nullifier using Poseidon
   */
  private generateNullifier(secret: string): string {
    // nullifier = H(secret, 'nullifier')
    const secretBigInt = BigInt('0x' + secret);
    const nullifierTag = BigInt('0x' + Buffer.from('nullifier').toString('hex'));

    const hash = this.poseidon([secretBigInt, nullifierTag]);
    const hashValue = this.poseidon.F.toString(hash);

    return BigInt(hashValue).toString(16).padStart(64, '0');
  }

  /**
   * Encrypt note data
   */
  encryptNote(note: ShieldedNote, password: string): string {
    const algorithm = 'aes-256-cbc';
    const key = crypto.scryptSync(password, 'salt', 32);
    const iv = crypto.randomBytes(16);

    const cipher = crypto.createCipheriv(algorithm, key, iv);

    let encrypted = cipher.update(JSON.stringify(note), 'utf8', 'hex');
    encrypted += cipher.final('hex');

    return iv.toString('hex') + ':' + encrypted;
  }

  /**
   * Decrypt note data
   */
  decryptNote(encryptedData: string, password: string): ShieldedNote {
    const algorithm = 'aes-256-cbc';
    const key = crypto.scryptSync(password, 'salt', 32);

    const [ivHex, encrypted] = encryptedData.split(':');
    const iv = Buffer.from(ivHex, 'hex');

    const decipher = crypto.createDecipheriv(algorithm, key, iv);

    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return JSON.parse(decrypted);
  }

  /**
   * Display note statistics
   */
  displayStats(): void {
  }

  /**
   * Display all notes for an owner
   */
  displayNotes(owner: string): void {
    const notes = this.getUnspentNotes(owner);


    for (const note of notes) {
      if (note.txSignature) {
      }
    }
  }
}

// Example usage
export async function testNoteManager() {
  const manager = new NoteManager('./data');
  await manager.initialize();

  // Create some notes
  const note1 = manager.createNote(1000, 'alice', 'tx1');
  const note2 = manager.createNote(2000, 'alice', 'tx2');
  const note3 = manager.createNote(500, 'bob', 'tx3');

  // Display stats
  manager.displayStats();

  // Display Alice's notes
  manager.displayNotes('alice');

  // Check balance
  console.log('Alice balance:', manager.getBalance('alice'));

  // Spend a note
  manager.spendNote(note1.commitment, 'tx4');

  // Check nullifier
  console.log(`Nullifier used: ${manager.isNullifierUsed(note1.nullifier)}`);

  // Display updated stats
  manager.displayStats();
}
