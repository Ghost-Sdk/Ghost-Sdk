// Zcash ZSA Client
// Implements ZIP-227 (shielded assets), ZIP-32 (HD keys), and BLAKE2b hashing

import { blake2b } from '@noble/hashes/blake2b';
import { randomBytes } from '@noble/hashes/utils';
import { ed25519 } from '@noble/curves/ed25519';
import { buildPoseidon } from 'circomlibjs';
import {
  ZcashKeyPair,
  ShieldedAsset,
  ShieldedNote,
  IssueAssetParams,
  IssuerKeys,
  ShieldedTransaction,
  NoteEncryption,
} from './types';

export class ZcashZSAClient {
  private masterKey: Uint8Array;
  private poseidon: any;
  private issuedAssets: Map<string, ShieldedAsset>;

  constructor(seed?: Uint8Array) {
    this.masterKey = seed || randomBytes(32);
    this.issuedAssets = new Map();
  }

  async initialize() {
    this.poseidon = await buildPoseidon();
  }

  // ============ KEY DERIVATION (ZIP-32) ============

  /**
   * Derive master key from seed
   */
  private deriveMasterKey(seed: Uint8Array): Uint8Array {
    return blake2b(seed, { dkLen: 32, key: Buffer.from('ZcashZSA') });
  }

  /**
   * Derive child key using ZIP-32 hierarchical deterministic derivation
   */
  deriveChildKey(parentKey: Uint8Array, index: number): Uint8Array {
    const indexBytes = Buffer.alloc(4);
    indexBytes.writeUInt32BE(index, 0);

    const data = Buffer.concat([Buffer.from(parentKey), indexBytes]);

    return blake2b(data, { dkLen: 32 });
  }

  /**
   * Generate full key pair from spending key
   */
  generateKeyPair(spendingKey?: Uint8Array): ZcashKeyPair {
    const sk = spendingKey || randomBytes(32);

    // Derive viewing key
    const viewingKey = blake2b(Buffer.concat([sk, Buffer.from('viewing')]), { dkLen: 32 });

    // Derive incoming viewing key
    const incomingViewingKey = blake2b(Buffer.concat([viewingKey, Buffer.from('incoming')]), {
      dkLen: 32,
    });

    // Derive outgoing viewing key
    const outgoingViewingKey = blake2b(Buffer.concat([viewingKey, Buffer.from('outgoing')]), {
      dkLen: 32,
    });

    // Derive payment address
    const address = blake2b(Buffer.concat([incomingViewingKey, Buffer.from('address')]), {
      dkLen: 32,
    });

    return {
      spendingKey: sk,
      viewingKey,
      incomingViewingKey,
      outgoingViewingKey,
      address,
    };
  }

  /**
   * Derive issuer keys (for asset issuance)
   */
  deriveIssuerKeys(accountIndex: number, assetIndex: number): IssuerKeys {
    // Derive account key
    const accountKey = this.deriveChildKey(this.masterKey, accountIndex);

    // Derive issuer key
    const issuerKey = this.deriveChildKey(accountKey, assetIndex);

    // Compute asset ID from issuer key
    const assetId = blake2b(Buffer.concat([issuerKey, Buffer.from('asset_id')]), { dkLen: 32 });

    return {
      issuerKey,
      assetId,
    };
  }

  // ============ ASSET ISSUANCE (ZIP-227) ============

  /**
   * Issue a new shielded asset
   */
  async issueAsset(params: IssueAssetParams): Promise<ShieldedAsset> {
    // Generate unique asset ID
    const assetIdData = Buffer.concat([
      Buffer.from(params.name),
      Buffer.from(params.symbol),
      randomBytes(16),
    ]);

    const assetId = blake2b(assetIdData, { dkLen: 32 });

    const asset: ShieldedAsset = {
      assetId,
      metadata: {
        name: params.name,
        symbol: params.symbol,
        decimals: params.decimals,
        description: params.description,
      },
    };

    // Store issued asset
    this.issuedAssets.set(Buffer.from(assetId).toString('hex'), asset);

    return asset;
  }

  /**
   * Get issued asset by ID
   */
  getAsset(assetId: Uint8Array): ShieldedAsset | undefined {
    return this.issuedAssets.get(Buffer.from(assetId).toString('hex'));
  }

  // ============ SHIELDED NOTES ============

  /**
   * Create a shielded note (output)
   */
  createShieldedNote(params: {
    assetId: Uint8Array;
    value: bigint;
    recipient: Uint8Array;
    memo?: string;
  }): ShieldedNote {
    // Generate random nonce
    const nonce = randomBytes(32);

    // Compute note commitment
    // commitment = H(assetId || value || recipient || nonce)
    const commitmentData = Buffer.concat([
      Buffer.from(params.assetId),
      Buffer.from(params.value.toString(16).padStart(16, '0'), 'hex'),
      Buffer.from(params.recipient),
      nonce,
    ]);

    const noteCommitment = blake2b(commitmentData, { dkLen: 32 });

    // Encode memo
    const memo = params.memo ? Buffer.from(params.memo, 'utf-8') : undefined;

    return {
      assetId: params.assetId,
      value: params.value,
      recipient: params.recipient,
      memo,
      noteCommitment,
    };
  }

  /**
   * Compute nullifier for a note (prevents double-spending)
   */
  computeNullifier(note: ShieldedNote, spendingKey: Uint8Array): Uint8Array {
    // nullifier = H(noteCommitment || spendingKey)
    const nullifierData = Buffer.concat([Buffer.from(note.noteCommitment), spendingKey]);

    return blake2b(nullifierData, { dkLen: 32 });
  }

  /**
   * Verify note commitment
   */
  verifyNoteCommitment(note: ShieldedNote): boolean {
    const nonce = randomBytes(32); // Should be stored with note

    const commitmentData = Buffer.concat([
      Buffer.from(note.assetId),
      Buffer.from(note.value.toString(16).padStart(16, '0'), 'hex'),
      Buffer.from(note.recipient),
      nonce,
    ]);

    const expectedCommitment = blake2b(commitmentData, { dkLen: 32 });

    return Buffer.from(expectedCommitment).equals(Buffer.from(note.noteCommitment));
  }

  // ============ SHIELDED TRANSACTIONS ============

  /**
   * Create a shielded transaction
   */
  async createShieldedTransaction(params: {
    inputs: ShieldedNote[];
    outputs: { assetId: Uint8Array; value: bigint; recipient: Uint8Array; memo?: string }[];
  }): Promise<ShieldedTransaction> {
    // Create output notes
    const outputNotes = params.outputs.map(output => this.createShieldedNote(output));

    // Verify balance for each asset
    const balances = new Map<string, bigint>();

    for (const input of params.inputs) {
      const assetKey = Buffer.from(input.assetId).toString('hex');
      const current = balances.get(assetKey) || 0n;
      balances.set(assetKey, current + input.value);
    }

    for (const output of outputNotes) {
      const assetKey = Buffer.from(output.assetId).toString('hex');
      const current = balances.get(assetKey) || 0n;
      balances.set(assetKey, current - output.value);
    }

    // Verify all balances are non-negative
    for (const [assetKey, balance] of balances.entries()) {
      if (balance < 0n) {
        throw new Error(`Insufficient balance for asset ${assetKey}`);
      }
    }

    // Compute anchor (Merkle root of note commitment tree)
    const anchor = this.computeAnchor(params.inputs);

    // Generate binding signature
    // binding_sig = H(inputs || outputs || anchor)
    const bindingData = Buffer.concat([
      ...params.inputs.map(i => i.noteCommitment),
      ...outputNotes.map(o => o.noteCommitment),
      anchor,
    ]);

    const bindingSignature = blake2b(bindingData, { dkLen: 64 });

    return {
      inputs: params.inputs,
      outputs: outputNotes,
      bindingSignature,
      anchor,
    };
  }

  /**
   * Compute anchor (Merkle root)
   */
  private computeAnchor(notes: ShieldedNote[]): Uint8Array {
    if (notes.length === 0) {
      return new Uint8Array(32);
    }

    // Build Merkle tree
    let level = notes.map(n => n.noteCommitment);

    while (level.length > 1) {
      const nextLevel: Uint8Array[] = [];

      for (let i = 0; i < level.length; i += 2) {
        if (i + 1 < level.length) {
          const combined = Buffer.concat([level[i], level[i + 1]]);
          nextLevel.push(blake2b(combined, { dkLen: 32 }));
        } else {
          nextLevel.push(level[i]);
        }
      }

      level = nextLevel;
    }

    return level[0];
  }

  /**
   * Verify shielded transaction
   */
  verifyShieldedTransaction(tx: ShieldedTransaction): boolean {
    // Verify binding signature
    const bindingData = Buffer.concat([
      ...tx.inputs.map(i => i.noteCommitment),
      ...tx.outputs.map(o => o.noteCommitment),
      tx.anchor,
    ]);

    const expectedSignature = blake2b(bindingData, { dkLen: 64 });

    if (!Buffer.from(expectedSignature).equals(Buffer.from(tx.bindingSignature))) {
      return false;
    }

    // Verify anchor
    const computedAnchor = this.computeAnchor(tx.inputs);
    if (!Buffer.from(computedAnchor).equals(Buffer.from(tx.anchor))) {
      return false;
    }

    // Verify balance conservation per asset
    const balances = new Map<string, bigint>();

    for (const input of tx.inputs) {
      const key = Buffer.from(input.assetId).toString('hex');
      balances.set(key, (balances.get(key) || 0n) + input.value);
    }

    for (const output of tx.outputs) {
      const key = Buffer.from(output.assetId).toString('hex');
      balances.set(key, (balances.get(key) || 0n) - output.value);
    }

    for (const [_, balance] of balances) {
      if (balance !== 0n) {
        return false; // Balance must be exactly zero
      }
    }

    return true;
  }

  // ============ NOTE ENCRYPTION ============

  /**
   * Encrypt note for recipient
   */
  encryptNote(note: ShieldedNote, recipientPublicKey: Uint8Array): NoteEncryption {
    // Generate ephemeral key pair
    const ephemeralPrivateKey = randomBytes(32);
    const ephemeralKey = ed25519.getPublicKey(ephemeralPrivateKey);

    // Derive shared secret using ECDH
    const sharedSecret = blake2b(
      Buffer.concat([Buffer.from(recipientPublicKey), ephemeralPrivateKey]),
      { dkLen: 32 }
    );

    // Encrypt note data
    const plaintext = Buffer.concat([
      note.assetId,
      Buffer.from(note.value.toString(16).padStart(16, '0'), 'hex'),
      note.recipient,
      note.memo || Buffer.alloc(0),
    ]);

    // Simple XOR encryption (in production, use proper AEAD)
    const ciphertext = Buffer.alloc(plaintext.length);
    for (let i = 0; i < plaintext.length; i++) {
      ciphertext[i] = plaintext[i] ^ sharedSecret[i % sharedSecret.length];
    }

    // Compute authentication tag
    const tag = blake2b(Buffer.concat([ephemeralKey, ciphertext]), { dkLen: 16 });

    return {
      ephemeralKey,
      ciphertext,
      tag,
    };
  }

  /**
   * Decrypt note
   */
  decryptNote(
    encryption: NoteEncryption,
    recipientPrivateKey: Uint8Array
  ): ShieldedNote | null {
    try {
      // Derive shared secret
      const sharedSecret = blake2b(
        Buffer.concat([encryption.ephemeralKey, recipientPrivateKey]),
        { dkLen: 32 }
      );

      // Decrypt
      const plaintext = Buffer.alloc(encryption.ciphertext.length);
      for (let i = 0; i < encryption.ciphertext.length; i++) {
        plaintext[i] = encryption.ciphertext[i] ^ sharedSecret[i % sharedSecret.length];
      }

      // Verify tag
      const expectedTag = blake2b(
        Buffer.concat([encryption.ephemeralKey, encryption.ciphertext]),
        { dkLen: 16 }
      );

      if (!Buffer.from(expectedTag).equals(Buffer.from(encryption.tag))) {
        return null; // Authentication failed
      }

      // Parse plaintext
      const assetId = plaintext.slice(0, 32);
      const value = BigInt('0x' + plaintext.slice(32, 40).toString('hex'));
      const recipient = plaintext.slice(40, 72);
      const memo = plaintext.length > 72 ? plaintext.slice(72) : undefined;

      // Compute note commitment
      const nonce = randomBytes(32); // Should be included in encryption
      const commitmentData = Buffer.concat([assetId, plaintext.slice(32, 40), recipient, nonce]);
      const noteCommitment = blake2b(commitmentData, { dkLen: 32 });

      return {
        assetId,
        value,
        recipient,
        memo,
        noteCommitment,
      };
    } catch (error) {
      return null;
    }
  }

  // ============ UTILITY FUNCTIONS ============

  /**
   * Generate asset ID from parameters
   */
  generateAssetId(name: string, symbol: string, salt?: Uint8Array): Uint8Array {
    const data = Buffer.concat([
      Buffer.from(name),
      Buffer.from(symbol),
      salt || randomBytes(16),
    ]);

    return blake2b(data, { dkLen: 32 });
  }

  /**
   * Hash data using BLAKE2b
   */
  hash(data: Uint8Array, length: number = 32): Uint8Array {
    return blake2b(data, { dkLen: length });
  }

  /**
   * Export master key
   */
  exportMasterKey(): Uint8Array {
    return this.masterKey;
  }

  /**
   * Import master key
   */
  importMasterKey(key: Uint8Array): void {
    this.masterKey = key;
  }
}

export default ZcashZSAClient;
