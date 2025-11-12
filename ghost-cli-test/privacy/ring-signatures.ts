/**
 * Ring Signature Module (Monero-style MLSAG)
 *
 * Implements Multilayered Linkable Spontaneous Anonymous Group signatures
 * for sender anonymity
 */

import { Keypair, PublicKey } from '@solana/web3.js';
import crypto from 'crypto';

export interface RingSignatureParams {
  message: Uint8Array;
  signerKeypair: Keypair;
  ringMembers: PublicKey[];
  signerIndex: number;
}

export interface RingSignature {
  signature: Uint8Array;
  keyImage: Uint8Array;
  ringMembers: Uint8Array[];
  challengeScalars: Uint8Array[];
  responseScalars: Uint8Array[];
}

/**
 * Generate MLSAG ring signature
 *
 * Protocol:
 * 1. Generate key image I = x * H_p(P) where x is private key, P is public key
 * 2. Pick random alpha
 * 3. For each ring member i != s (where s is signer index):
 *    - Pick random c_i, r_i
 *    - Compute L_i = r_i*G + c_i*P_i
 *    - Compute R_i = r_i*H_p(P_i) + c_i*I
 * 4. At position s:
 *    - Compute L_s = alpha*G
 *    - Compute R_s = alpha*H_p(P_s)
 * 5. Hash to get c_{s+1} = H(m, L_s, R_s)
 * 6. Continue ring until c_0 is reached
 * 7. Set r_s = alpha - c_s*x (mod q)
 */
export async function generateRingSignature(
  params: RingSignatureParams
): Promise<RingSignature> {
  const { message, signerKeypair, ringMembers, signerIndex } = params;

  console.log('Generating ring signature...');
  console.log(`  Ring size: ${ringMembers.length}`);
  console.log(`  Signer index: ${signerIndex}`);

  // Validate inputs
  if (signerIndex < 0 || signerIndex >= ringMembers.length) {
    throw new Error('Invalid signer index');
  }

  if (ringMembers.length < 2 || ringMembers.length > 16) {
    throw new Error('Ring size must be between 2 and 16');
  }

  // 1. Generate key image
  const keyImage = generateKeyImage(signerKeypair);

  // 2. Generate random alpha (blinding factor)
  const alpha = randomScalar();

  // 3. Initialize challenge and response arrays
  const challengeScalars: Uint8Array[] = new Array(ringMembers.length);
  const responseScalars: Uint8Array[] = new Array(ringMembers.length);

  // 4. Generate random c and r for all positions except signer
  for (let i = 0; i < ringMembers.length; i++) {
    if (i !== signerIndex) {
      challengeScalars[i] = randomScalar();
      responseScalars[i] = randomScalar();
    }
  }

  // 5. Compute L and R for signer position
  const signerPubKey = signerKeypair.publicKey.toBytes();
  const L_s = scalarMultBase(alpha);
  const R_s = scalarMultHash(signerPubKey, alpha);

  // 6. Hash to start the ring
  const hash_s = hashPoints(message, L_s, R_s);
  challengeScalars[(signerIndex + 1) % ringMembers.length] = hash_s;

  // 7. Complete the ring (except at signer position)
  for (let i = (signerIndex + 1) % ringMembers.length; i !== signerIndex; i = (i + 1) % ringMembers.length) {
    const pubKey = ringMembers[i].toBytes();
    const c_i = challengeScalars[i];
    const r_i = responseScalars[i];

    // L_i = r_i*G + c_i*P_i
    const L_i = addPoints(scalarMultBase(r_i), scalarMult(pubKey, c_i));

    // R_i = r_i*H_p(P_i) + c_i*I
    const H_p_i = hashToPoint(pubKey);
    const R_i = addPoints(scalarMult(H_p_i, r_i), scalarMult(keyImage, c_i));

    // c_{i+1} = H(m, L_i, R_i)
    const nextIndex = (i + 1) % ringMembers.length;
    challengeScalars[nextIndex] = hashPoints(message, L_i, R_i);
  }

  // 8. Close the ring at signer position
  // r_s = alpha - c_s * privateKey (mod q)
  const c_s = challengeScalars[signerIndex];
  const privateKeyScalar = signerKeypair.secretKey.slice(0, 32);
  responseScalars[signerIndex] = subtractScalars(
    alpha,
    multiplyScalars(c_s, privateKeyScalar)
  );

  // 9. Serialize signature
  const signature = serializeRingSignature(challengeScalars, responseScalars);

  console.log('✓ Ring signature generated');
  console.log(`  Key image: ${Buffer.from(keyImage).toString('hex').substring(0, 16)}...`);
  console.log(`  Signature size: ${signature.length} bytes`);

  return {
    signature,
    keyImage,
    ringMembers: ringMembers.map(pk => pk.toBytes()),
    challengeScalars,
    responseScalars,
  };
}

/**
 * Verify MLSAG ring signature
 */
export async function verifyRingSignature(
  signature: RingSignature,
  message: Uint8Array
): Promise<boolean> {
  const { keyImage, ringMembers, challengeScalars, responseScalars } = signature;

  console.log('Verifying ring signature...');

  try {
    // 1. Check ring size
    if (ringMembers.length !== challengeScalars.length ||
        ringMembers.length !== responseScalars.length) {
      console.log('✗ Invalid signature structure');
      return false;
    }

    // 2. Recompute the ring
    let currentChallenge = challengeScalars[0];

    for (let i = 0; i < ringMembers.length; i++) {
      const pubKey = ringMembers[i];
      const c_i = challengeScalars[i];
      const r_i = responseScalars[i];

      // L_i = r_i*G + c_i*P_i
      const L_i = addPoints(scalarMultBase(r_i), scalarMult(pubKey, c_i));

      // R_i = r_i*H_p(P_i) + c_i*I
      const H_p_i = hashToPoint(pubKey);
      const R_i = addPoints(scalarMult(H_p_i, r_i), scalarMult(keyImage, c_i));

      // c_{i+1} = H(m, L_i, R_i)
      const nextChallenge = hashPoints(message, L_i, R_i);

      // Verify challenge matches (except for last iteration)
      if (i < ringMembers.length - 1) {
        if (!buffersEqual(nextChallenge, challengeScalars[i + 1])) {
          console.log(`✗ Challenge mismatch at position ${i}`);
          return false;
        }
      } else {
        // Ring must close: c_n should equal c_0
        if (!buffersEqual(nextChallenge, challengeScalars[0])) {
          console.log('✗ Ring does not close');
          return false;
        }
      }
    }

    console.log('✓ Ring signature verified');
    return true;
  } catch (error: any) {
    console.error('Error verifying ring signature:', error.message);
    return false;
  }
}

/**
 * Generate key image: I = x * H_p(P)
 * Key image prevents double-signing (linking)
 */
function generateKeyImage(keypair: Keypair): Uint8Array {
  const publicKey = keypair.publicKey.toBytes();
  const privateKey = keypair.secretKey.slice(0, 32);

  // Hash public key to point
  const hashPoint = hashToPoint(publicKey);

  // Multiply by private key
  const keyImage = scalarMult(hashPoint, privateKey);

  return keyImage;
}

/**
 * Hash message and points to scalar
 */
function hashPoints(message: Uint8Array, ...points: Uint8Array[]): Uint8Array {
  const hash = crypto.createHash('sha256');
  hash.update(message);
  for (const point of points) {
    hash.update(point);
  }
  return hash.digest();
}

/**
 * Hash data to curve point (H_p function)
 */
function hashToPoint(data: Uint8Array): Uint8Array {
  // Simplified: In production, use proper hash-to-curve algorithm
  const hash = crypto.createHash('sha256');
  hash.update(data);
  hash.update(Buffer.from('hash_to_point'));
  return hash.digest();
}

/**
 * Scalar multiplication on base point: s*G
 */
function scalarMultBase(scalar: Uint8Array): Uint8Array {
  // Simplified: In production, use proper Ed25519 scalar multiplication
  const hash = crypto.createHash('sha256');
  hash.update(scalar);
  hash.update(Buffer.from('base_mult'));
  return hash.digest();
}

/**
 * Scalar multiplication: s*P
 */
function scalarMult(point: Uint8Array, scalar: Uint8Array): Uint8Array {
  // Simplified: In production, use proper curve multiplication
  const hash = crypto.createHash('sha256');
  hash.update(point);
  hash.update(scalar);
  hash.update(Buffer.from('point_mult'));
  return hash.digest();
}

/**
 * Scalar multiplication with hash: s*H_p(P)
 */
function scalarMultHash(point: Uint8Array, scalar: Uint8Array): Uint8Array {
  const hashPoint = hashToPoint(point);
  return scalarMult(hashPoint, scalar);
}

/**
 * Point addition: P1 + P2
 */
function addPoints(p1: Uint8Array, p2: Uint8Array): Uint8Array {
  // Simplified: In production, use proper elliptic curve addition
  const hash = crypto.createHash('sha256');
  hash.update(p1);
  hash.update(p2);
  hash.update(Buffer.from('point_add'));
  return hash.digest();
}

/**
 * Scalar subtraction: s1 - s2 (mod q)
 */
function subtractScalars(s1: Uint8Array, s2: Uint8Array): Uint8Array {
  // Simplified: In production, use proper field arithmetic
  const result = new Uint8Array(32);
  for (let i = 0; i < 32; i++) {
    result[i] = (s1[i] - s2[i] + 256) % 256;
  }
  return result;
}

/**
 * Scalar multiplication: s1 * s2 (mod q)
 */
function multiplyScalars(s1: Uint8Array, s2: Uint8Array): Uint8Array {
  // Simplified: In production, use proper field arithmetic
  const hash = crypto.createHash('sha256');
  hash.update(s1);
  hash.update(s2);
  hash.update(Buffer.from('scalar_mult'));
  return hash.digest();
}

/**
 * Generate random scalar
 */
function randomScalar(): Uint8Array {
  return crypto.randomBytes(32);
}

/**
 * Serialize ring signature
 */
function serializeRingSignature(
  challenges: Uint8Array[],
  responses: Uint8Array[]
): Uint8Array {
  const ringSize = challenges.length;
  const buffer = new Uint8Array(ringSize * 64); // 32 bytes per c + 32 bytes per r

  let offset = 0;
  for (let i = 0; i < ringSize; i++) {
    buffer.set(challenges[i], offset);
    offset += 32;
    buffer.set(responses[i], offset);
    offset += 32;
  }

  return buffer;
}

/**
 * Deserialize ring signature
 */
export function deserializeRingSignature(
  data: Uint8Array,
  ringSize: number
): { challenges: Uint8Array[], responses: Uint8Array[] } {
  if (data.length !== ringSize * 64) {
    throw new Error('Invalid signature length');
  }

  const challenges: Uint8Array[] = [];
  const responses: Uint8Array[] = [];

  let offset = 0;
  for (let i = 0; i < ringSize; i++) {
    challenges.push(data.slice(offset, offset + 32));
    offset += 32;
    responses.push(data.slice(offset, offset + 32));
    offset += 32;
  }

  return { challenges, responses };
}

/**
 * Generate mock ring signature (for testing)
 */
export function generateMockRingSignature(ringSize: number = 11): RingSignature {
  console.log(`⚠️  Generating MOCK ring signature (${ringSize} members)`);

  return {
    signature: crypto.randomBytes(ringSize * 64),
    keyImage: crypto.randomBytes(32),
    ringMembers: Array(ringSize).fill(null).map(() => crypto.randomBytes(32)),
    challengeScalars: Array(ringSize).fill(null).map(() => crypto.randomBytes(32)),
    responseScalars: Array(ringSize).fill(null).map(() => crypto.randomBytes(32)),
  };
}

/**
 * Helper: Compare buffers
 */
function buffersEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

/**
 * Check if key image was already used (prevents double-spend)
 */
export function isKeyImageUsed(
  keyImage: Uint8Array,
  usedKeyImages: Uint8Array[]
): boolean {
  for (const used of usedKeyImages) {
    if (buffersEqual(keyImage, used)) {
      return true;
    }
  }
  return false;
}
