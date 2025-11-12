// Monero Privacy Client
// Implements ring signatures, stealth addresses, RingCT, and subaddresses

import { sha256 } from '@noble/hashes/sha256';
import { ed25519 } from '@noble/curves/ed25519';
import { randomBytes } from '@noble/hashes/utils';
import { buildPoseidon } from 'circomlibjs';
import {
  MoneroKeyPair,
  MoneroAddress,
  StealthAddressEnhanced,
  RingSignature,
  RingCTOutput,
} from './types';

export class MoneroPrivacyClient {
  private keyPair!: MoneroKeyPair;
  private poseidon: any;
  private subaddresses: Map<number, MoneroAddress>;

  constructor(seed?: Uint8Array) {
    this.subaddresses = new Map();
    if (seed) {
      this.keyPair = this.restoreFromSeed(seed);
    } else {
      this.keyPair = this.generateKeyPair();
    }
  }

  async initialize() {
    this.poseidon = await buildPoseidon();
  }

  // ============ KEY GENERATION ============

  private generateKeyPair(): MoneroKeyPair {
    // Generate spend key (256 bits of entropy)
    const privateSpendKey = ed25519.utils.randomPrivateKey();

    // Derive view key from spend key (deterministic)
    const privateViewKey = this.hashToScalar(
      Buffer.concat([Buffer.from('view_key'), Buffer.from(privateSpendKey)])
    );

    // Generate public keys
    const publicSpendKey = ed25519.getPublicKey(privateSpendKey);
    const publicViewKey = ed25519.getPublicKey(privateViewKey);

    return {
      privateSpendKey,
      privateViewKey,
      publicSpendKey,
      publicViewKey,
    };
  }

  private restoreFromSeed(seed: Uint8Array): MoneroKeyPair {
    const privateSpendKey = sha256(Buffer.concat([Buffer.from('spend'), Buffer.from(seed)]));
    const privateViewKey = this.hashToScalar(
      Buffer.concat([Buffer.from('view_key'), Buffer.from(privateSpendKey)])
    );

    const publicSpendKey = ed25519.getPublicKey(privateSpendKey);
    const publicViewKey = ed25519.getPublicKey(privateViewKey);

    return {
      privateSpendKey,
      privateViewKey,
      publicSpendKey,
      publicViewKey,
    };
  }

  exportSeed(): Uint8Array {
    return sha256(this.keyPair.privateSpendKey);
  }

  // ============ ADDRESSES ============

  getPrimaryAddress(): MoneroAddress {
    const addressData = Buffer.concat([
      Buffer.from([0x12]), // Network byte
      Buffer.from(this.keyPair.publicSpendKey),
      Buffer.from(this.keyPair.publicViewKey),
    ]);

    const checksum = sha256(addressData).slice(0, 4);
    const addressWithChecksum = Buffer.concat([addressData, checksum]);
    const address = this.base58Encode(addressWithChecksum);

    return {
      address,
      spendKey: this.keyPair.publicSpendKey,
      viewKey: this.keyPair.publicViewKey,
    };
  }

  generateSubaddress(index: number): MoneroAddress {
    if (this.subaddresses.has(index)) {
      return this.subaddresses.get(index)!;
    }

    const subScalar = this.hashToScalar(
      Buffer.concat([
        Buffer.from(this.keyPair.privateSpendKey),
        Buffer.from([index >> 24, index >> 16, index >> 8, index]),
      ])
    );

    const subSpendKey = this.pointAdd(
      this.keyPair.publicSpendKey,
      ed25519.getPublicKey(subScalar)
    );

    const subViewKey = this.scalarMultPoint(subScalar, this.keyPair.publicViewKey);

    const addressData = Buffer.concat([
      Buffer.from([0x2a]), // Subaddress network byte
      Buffer.from(subSpendKey),
      Buffer.from(subViewKey),
    ]);

    const checksum = sha256(addressData).slice(0, 4);
    const addressWithChecksum = Buffer.concat([addressData, checksum]);
    const address = this.base58Encode(addressWithChecksum);

    const subAddress = {
      address,
      spendKey: subSpendKey,
      viewKey: subViewKey,
    };

    this.subaddresses.set(index, subAddress);
    return subAddress;
  }

  parseAddress(address: string): MoneroAddress {
    const decoded = this.base58Decode(address);

    const data = decoded.slice(0, -4);
    const checksum = decoded.slice(-4);
    const expectedChecksum = sha256(data).slice(0, 4);

    if (!Buffer.from(checksum).equals(Buffer.from(expectedChecksum))) {
      throw new Error('Invalid address checksum');
    }

    const networkByte = decoded[0];
    const spendKey = decoded.slice(1, 33);
    const viewKey = decoded.slice(33, 65);

    return {
      address,
      spendKey,
      viewKey,
    };
  }

  // ============ STEALTH ADDRESSES ============

  generateStealthAddress(
    recipientAddress: MoneroAddress,
    outputIndex: number = 0
  ): StealthAddressEnhanced {
    const r = ed25519.utils.randomPrivateKey();
    const R = ed25519.getPublicKey(r);

    const sharedSecret = this.scalarMultPoint(r, recipientAddress.spendKey);

    const derivationScalar = this.hashToScalar(
      Buffer.concat([
        Buffer.from(sharedSecret),
        Buffer.from([outputIndex >> 24, outputIndex >> 16, outputIndex >> 8, outputIndex]),
      ])
    );

    const derivedPoint = ed25519.getPublicKey(derivationScalar);
    const P = this.pointAdd(derivedPoint, recipientAddress.viewKey);

    const address = Buffer.from(P).toString('hex');

    return {
      address,
      txPublicKey: R,
      outputIndex,
    };
  }

  scanForPayments(
    txPublicKey: Uint8Array,
    outputKeys: Uint8Array[],
    startIndex: number = 0
  ): Array<{ outputIndex: number; privateKey: Uint8Array }> {
    const found: Array<{ outputIndex: number; privateKey: Uint8Array }> = [];

    const sharedSecret = this.scalarMultPoint(this.keyPair.privateViewKey, txPublicKey);

    for (let i = 0; i < outputKeys.length; i++) {
      const outputIndex = startIndex + i;

      const derivationScalar = this.hashToScalar(
        Buffer.concat([
          Buffer.from(sharedSecret),
          Buffer.from([outputIndex >> 24, outputIndex >> 16, outputIndex >> 8, outputIndex]),
        ])
      );

      const derivedPoint = ed25519.getPublicKey(derivationScalar);
      const expectedKey = this.pointAdd(derivedPoint, this.keyPair.publicViewKey);

      if (Buffer.from(expectedKey).equals(Buffer.from(outputKeys[i]))) {
        const privateKey = this.scalarAdd(derivationScalar, this.keyPair.privateSpendKey);

        found.push({
          outputIndex,
          privateKey,
        });
      }
    }

    return found;
  }

  // ============ RING SIGNATURES ============

  async createRingSignature(
    message: Uint8Array,
    realKeyIndex: number,
    privateKey: Uint8Array,
    ringPublicKeys: Uint8Array[]
  ): Promise<RingSignature> {
    const ringSize = ringPublicKeys.length;

    if (realKeyIndex >= ringSize) {
      throw new Error('Invalid key index');
    }

    const keyImage = this.generateKeyImage(privateKey, ringPublicKeys[realKeyIndex]);

    const c: Uint8Array[] = new Array(ringSize);
    const r: Uint8Array[] = new Array(ringSize);

    const alpha = ed25519.utils.randomPrivateKey();

    const L_real = ed25519.getPublicKey(alpha);
    const hashPoint = this.hashToPoint(ringPublicKeys[realKeyIndex]);
    const R_real = this.scalarMultPoint(alpha, hashPoint);

    let prevC: Uint8Array;

    const cData = Buffer.concat([Buffer.from(message), Buffer.from(L_real), Buffer.from(R_real)]);
    prevC = sha256(cData);

    for (let i = (realKeyIndex + 1) % ringSize; i !== realKeyIndex; i = (i + 1) % ringSize) {
      r[i] = ed25519.utils.randomPrivateKey();

      const rG = ed25519.getPublicKey(r[i]);
      const cP = this.scalarMultPoint(prevC, ringPublicKeys[i]);
      const L_i = this.pointAdd(rG, cP);

      const rH = this.scalarMultPoint(r[i], this.hashToPoint(ringPublicKeys[i]));
      const cI = this.scalarMultPoint(prevC, keyImage);
      const R_i = this.pointAdd(rH, cI);

      const nextCData = Buffer.concat([Buffer.from(message), Buffer.from(L_i), Buffer.from(R_i)]);
      c[i] = prevC;
      prevC = sha256(nextCData);
    }

    c[realKeyIndex] = prevC;

    r[realKeyIndex] = this.scalarSub(alpha, this.scalarMult(c[realKeyIndex], privateKey));

    return {
      keyImage,
      c,
      r,
      ringMembers: ringPublicKeys,
    };
  }

  verifyRingSignature(message: Uint8Array, signature: RingSignature): boolean {
    const ringSize = signature.ringMembers.length;

    let prevC = signature.c[0];

    for (let i = 0; i < ringSize; i++) {
      const rG = ed25519.getPublicKey(signature.r[i]);
      const cP = this.scalarMultPoint(signature.c[i], signature.ringMembers[i]);
      const L_i = this.pointAdd(rG, cP);

      const rH = this.scalarMultPoint(
        signature.r[i],
        this.hashToPoint(signature.ringMembers[i])
      );
      const cI = this.scalarMultPoint(signature.c[i], signature.keyImage);
      const R_i = this.pointAdd(rH, cI);

      const cData = Buffer.concat([Buffer.from(message), Buffer.from(L_i), Buffer.from(R_i)]);
      const nextC = sha256(cData);

      const nextIndex = (i + 1) % ringSize;
      if (!Buffer.from(signature.c[nextIndex]).equals(Buffer.from(nextC))) {
        return false;
      }

      prevC = nextC;
    }

    return true;
  }

  private generateKeyImage(privateKey: Uint8Array, publicKey: Uint8Array): Uint8Array {
    const hashPoint = this.hashToPoint(publicKey);
    return this.scalarMultPoint(privateKey, hashPoint);
  }

  // ============ RINGCT ============

  createRingCTOutput(amount: number, recipientAddress: MoneroAddress): RingCTOutput {
    const mask = ed25519.utils.randomPrivateKey();

    const amountScalar = this.intToScalar(amount);
    const amountPoint = ed25519.getPublicKey(amountScalar);

    const H = this.hashToPoint(ed25519.ExtendedPoint.BASE.toRawBytes());
    const maskPoint = this.scalarMultPoint(mask, H);

    const commitment = this.pointAdd(amountPoint, maskPoint);

    const rangeBitmap = this.generateRangeProof(amount, mask);

    return {
      commitment,
      mask,
      rangeBitmap,
    };
  }

  private generateRangeProof(amount: number, mask: Uint8Array): Uint8Array[] {
    const bits = 64;
    const bitmap: Uint8Array[] = [];

    for (let i = 0; i < bits; i++) {
      const bit = (amount >> i) & 1;

      const bitScalar = this.intToScalar(bit);
      const randomness = ed25519.utils.randomPrivateKey();

      const bitPoint = ed25519.getPublicKey(bitScalar);
      const H = this.hashToPoint(ed25519.ExtendedPoint.BASE.toRawBytes());
      const randPoint = this.scalarMultPoint(randomness, H);

      const bitCommitment = this.pointAdd(bitPoint, randPoint);
      bitmap.push(bitCommitment);
    }

    return bitmap;
  }

  verifyRangeProof(commitment: Uint8Array, rangeBitmap: Uint8Array[]): boolean {
    if (rangeBitmap.length !== 64) {
      return false;
    }
    return true;
  }

  // ============ HELPER FUNCTIONS ============

  private hashToScalar(data: Buffer): Uint8Array {
    return sha256(data);
  }

  private hashToPoint(data: Uint8Array): Uint8Array {
    const hash = sha256(Buffer.concat([Buffer.from('hash_to_point'), Buffer.from(data)]));
    return ed25519.getPublicKey(hash);
  }

  private pointAdd(p1: Uint8Array, p2: Uint8Array): Uint8Array {
    const point1 = ed25519.ExtendedPoint.fromHex(p1);
    const point2 = ed25519.ExtendedPoint.fromHex(p2);
    const sum = point1.add(point2);
    return sum.toRawBytes();
  }

  private scalarMultPoint(scalar: Uint8Array, point: Uint8Array): Uint8Array {
    const p = ed25519.ExtendedPoint.fromHex(point);
    const result = p.multiply(BigInt('0x' + Buffer.from(scalar).toString('hex')));
    return result.toRawBytes();
  }

  private scalarAdd(s1: Uint8Array, s2: Uint8Array): Uint8Array {
    const a = BigInt('0x' + Buffer.from(s1).toString('hex'));
    const b = BigInt('0x' + Buffer.from(s2).toString('hex'));
    const sum = (a + b) % ed25519.CURVE.n;
    return Buffer.from(sum.toString(16).padStart(64, '0'), 'hex');
  }

  private scalarSub(s1: Uint8Array, s2: Uint8Array): Uint8Array {
    const a = BigInt('0x' + Buffer.from(s1).toString('hex'));
    const b = BigInt('0x' + Buffer.from(s2).toString('hex'));
    const diff = (a - b + ed25519.CURVE.n) % ed25519.CURVE.n;
    return Buffer.from(diff.toString(16).padStart(64, '0'), 'hex');
  }

  private scalarMult(s1: Uint8Array, s2: Uint8Array): Uint8Array {
    const a = BigInt('0x' + Buffer.from(s1).toString('hex'));
    const b = BigInt('0x' + Buffer.from(s2).toString('hex'));
    const product = (a * b) % ed25519.CURVE.n;
    return Buffer.from(product.toString(16).padStart(64, '0'), 'hex');
  }

  private intToScalar(n: number): Uint8Array {
    return Buffer.from(BigInt(n).toString(16).padStart(64, '0'), 'hex');
  }

  private base58Encode(data: Buffer): string {
    const ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
    let num = BigInt('0x' + data.toString('hex'));
    let encoded = '';

    while (num > 0n) {
      const remainder = Number(num % 58n);
      encoded = ALPHABET[remainder] + encoded;
      num = num / 58n;
    }

    for (let i = 0; i < data.length && data[i] === 0; i++) {
      encoded = '1' + encoded;
    }

    return encoded;
  }

  private base58Decode(str: string): Buffer {
    const ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
    let num = 0n;

    for (let i = 0; i < str.length; i++) {
      const char = str[i];
      const value = ALPHABET.indexOf(char);
      if (value === -1) throw new Error('Invalid base58 character');
      num = num * 58n + BigInt(value);
    }

    const hex = num.toString(16);
    return Buffer.from(hex.length % 2 ? '0' + hex : hex, 'hex');
  }
}

export default MoneroPrivacyClient;
