/**
 * Shielded Pool Management
 *
 * Manages commitments, Merkle tree, and pool state
 */

import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import os from 'os';

export interface Commitment {
  hash: string;
  index: number;
  amount: number;
  nonce: string;
  owner: string;
  timestamp: number;
  spent: boolean;
}

export interface MerkleTree {
  root: string;
  depth: number;
  leaves: string[];
  nodes: Map<string, string>; // key: level_index, value: hash
}

export interface PoolState {
  poolAddress: string;
  merkleTree: MerkleTree;
  commitments: Commitment[];
  usedNullifiers: Set<string>;
  usedKeyImages: Set<string>;
  tvl: number; // Total Value Locked
  denomination: number;
}

const POOL_STATE_FILE = path.join(os.homedir(), '.ghost-sdk', 'pool-state.json');

/**
 * Initialize shielded pool
 */
export function initializePool(
  poolAddress: string,
  treeDepth: number = 20,
  denomination: number = 0.1
): PoolState {
  console.log('Initializing shielded pool...');
  console.log(`  Pool address: ${poolAddress}`);
  console.log(`  Tree depth: ${treeDepth}`);
  console.log(`  Denomination: ${denomination} SOL`);

  const merkleTree: MerkleTree = {
    root: '0x0000000000000000000000000000000000000000000000000000000000000000',
    depth: treeDepth,
    leaves: [],
    nodes: new Map(),
  };

  const poolState: PoolState = {
    poolAddress,
    merkleTree,
    commitments: [],
    usedNullifiers: new Set(),
    usedKeyImages: new Set(),
    tvl: 0,
    denomination,
  };

  savePoolState(poolState);

  console.log('✓ Pool initialized');
  return poolState;
}

/**
 * Add commitment to pool and update Merkle tree
 */
export function addCommitment(
  poolState: PoolState,
  commitment: Omit<Commitment, 'index' | 'timestamp' | 'spent'>
): number {
  const index = poolState.commitments.length;

  const fullCommitment: Commitment = {
    ...commitment,
    index,
    timestamp: Date.now(),
    spent: false,
  };

  poolState.commitments.push(fullCommitment);
  poolState.merkleTree.leaves.push(commitment.hash);

  // Update Merkle tree
  updateMerkleTree(poolState.merkleTree);

  // Update TVL
  poolState.tvl += commitment.amount;

  savePoolState(poolState);

  console.log(`✓ Commitment added at index ${index}`);
  console.log(`  Hash: ${commitment.hash.substring(0, 16)}...`);
  console.log(`  New root: ${poolState.merkleTree.root.substring(0, 16)}...`);

  return index;
}

/**
 * Generate commitment hash
 */
export function generateCommitment(
  amount: number,
  nonce: string,
  publicKey: string
): string {
  const hash = crypto.createHash('sha256');
  hash.update(publicKey);
  hash.update(amount.toString());
  hash.update(nonce);

  return '0x' + hash.digest('hex');
}

/**
 * Update Merkle tree after adding new leaf
 */
function updateMerkleTree(tree: MerkleTree): void {
  if (tree.leaves.length === 0) {
    tree.root = '0x0000000000000000000000000000000000000000000000000000000000000000';
    return;
  }

  // Build tree bottom-up
  let currentLevel = tree.leaves.map(leaf => leaf);

  for (let level = 0; level < tree.depth; level++) {
    const nextLevel: string[] = [];

    for (let i = 0; i < currentLevel.length; i += 2) {
      const left = currentLevel[i];
      const right = i + 1 < currentLevel.length
        ? currentLevel[i + 1]
        : left; // Duplicate if odd number

      const parent = hashPair(left, right);
      nextLevel.push(parent);

      // Store node for proof generation
      tree.nodes.set(`${level}_${i / 2}`, parent);
    }

    currentLevel = nextLevel;

    if (currentLevel.length === 1) {
      tree.root = currentLevel[0];
      break;
    }
  }
}

/**
 * Generate Merkle proof for a leaf
 */
export function generateMerkleProof(
  tree: MerkleTree,
  leafIndex: number
): { pathElements: string[], pathIndices: number[] } {
  if (leafIndex >= tree.leaves.length) {
    throw new Error('Leaf index out of bounds');
  }

  const pathElements: string[] = [];
  const pathIndices: number[] = [];

  let currentIndex = leafIndex;
  let currentLevel = tree.leaves.map(leaf => leaf);

  for (let level = 0; level < tree.depth; level++) {
    const isLeft = currentIndex % 2 === 0;
    const siblingIndex = isLeft ? currentIndex + 1 : currentIndex - 1;

    // Get sibling (or duplicate current if no sibling)
    const sibling = siblingIndex < currentLevel.length
      ? currentLevel[siblingIndex]
      : currentLevel[currentIndex];

    pathElements.push(sibling);
    pathIndices.push(isLeft ? 0 : 1);

    // Move up to parent level
    const nextLevel: string[] = [];
    for (let i = 0; i < currentLevel.length; i += 2) {
      const left = currentLevel[i];
      const right = i + 1 < currentLevel.length
        ? currentLevel[i + 1]
        : left;

      nextLevel.push(hashPair(left, right));
    }

    currentLevel = nextLevel;
    currentIndex = Math.floor(currentIndex / 2);

    if (currentLevel.length === 1) {
      break;
    }
  }

  return { pathElements, pathIndices };
}

/**
 * Verify Merkle proof
 */
export function verifyMerkleProof(
  root: string,
  leaf: string,
  pathElements: string[],
  pathIndices: number[]
): boolean {
  let currentHash = leaf;

  for (let i = 0; i < pathElements.length; i++) {
    const sibling = pathElements[i];
    const isLeft = pathIndices[i] === 0;

    currentHash = isLeft
      ? hashPair(currentHash, sibling)
      : hashPair(sibling, currentHash);
  }

  return currentHash === root;
}

/**
 * Hash two values together (Poseidon-style)
 */
function hashPair(left: string, right: string): string {
  const hash = crypto.createHash('sha256');

  // Remove 0x prefix if present
  const leftClean = left.startsWith('0x') ? left.slice(2) : left;
  const rightClean = right.startsWith('0x') ? right.slice(2) : right;

  hash.update(Buffer.from(leftClean, 'hex'));
  hash.update(Buffer.from(rightClean, 'hex'));

  return '0x' + hash.digest('hex');
}

/**
 * Mark nullifier as used (prevents double-spend)
 */
export function useNullifier(poolState: PoolState, nullifier: string): boolean {
  if (poolState.usedNullifiers.has(nullifier)) {
    console.log('✗ Nullifier already used');
    return false;
  }

  poolState.usedNullifiers.add(nullifier);
  savePoolState(poolState);

  console.log('✓ Nullifier marked as used');
  return true;
}

/**
 * Check if nullifier was used
 */
export function isNullifierUsed(poolState: PoolState, nullifier: string): boolean {
  return poolState.usedNullifiers.has(nullifier);
}

/**
 * Mark key image as used (prevents double-sign)
 */
export function useKeyImage(poolState: PoolState, keyImage: string): boolean {
  if (poolState.usedKeyImages.has(keyImage)) {
    console.log('✗ Key image already used');
    return false;
  }

  poolState.usedKeyImages.add(keyImage);
  savePoolState(poolState);

  console.log('✓ Key image marked as used');
  return true;
}

/**
 * Check if key image was used
 */
export function isKeyImageUsed(poolState: PoolState, keyImage: string): boolean {
  return poolState.usedKeyImages.has(keyImage);
}

/**
 * Mark commitment as spent
 */
export function spendCommitment(poolState: PoolState, commitmentHash: string): void {
  const commitment = poolState.commitments.find(c => c.hash === commitmentHash);

  if (!commitment) {
    throw new Error('Commitment not found');
  }

  if (commitment.spent) {
    throw new Error('Commitment already spent');
  }

  commitment.spent = true;
  poolState.tvl -= commitment.amount;

  savePoolState(poolState);

  console.log('✓ Commitment marked as spent');
}

/**
 * Get user's unspent commitments
 */
export function getUserCommitments(
  poolState: PoolState,
  publicKey: string
): Commitment[] {
  return poolState.commitments.filter(
    c => c.owner === publicKey && !c.spent
  );
}

/**
 * Get user's balance (sum of unspent commitments)
 */
export function getUserBalance(poolState: PoolState, publicKey: string): number {
  const unspent = getUserCommitments(poolState, publicKey);
  return unspent.reduce((sum, c) => sum + c.amount, 0);
}

/**
 * Get pool statistics
 */
export function getPoolStats(poolState: PoolState): {
  tvl: number;
  totalCommitments: number;
  spentCommitments: number;
  merkleRoot: string;
  treeDepth: number;
} {
  const spent = poolState.commitments.filter(c => c.spent).length;

  return {
    tvl: poolState.tvl,
    totalCommitments: poolState.commitments.length,
    spentCommitments: spent,
    merkleRoot: poolState.merkleTree.root,
    treeDepth: poolState.merkleTree.depth,
  };
}

/**
 * Save pool state to disk
 */
function savePoolState(poolState: PoolState): void {
  const dir = path.dirname(POOL_STATE_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  // Convert Sets to Arrays for JSON serialization
  const serializable = {
    ...poolState,
    usedNullifiers: Array.from(poolState.usedNullifiers),
    usedKeyImages: Array.from(poolState.usedKeyImages),
    merkleTree: {
      ...poolState.merkleTree,
      nodes: Array.from(poolState.merkleTree.nodes.entries()),
    },
  };

  fs.writeFileSync(POOL_STATE_FILE, JSON.stringify(serializable, null, 2));
}

/**
 * Load pool state from disk
 */
export function loadPoolState(): PoolState | null {
  if (!fs.existsSync(POOL_STATE_FILE)) {
    return null;
  }

  try {
    const data = JSON.parse(fs.readFileSync(POOL_STATE_FILE, 'utf-8'));

    // Convert Arrays back to Sets
    return {
      ...data,
      usedNullifiers: new Set(data.usedNullifiers),
      usedKeyImages: new Set(data.usedKeyImages),
      merkleTree: {
        ...data.merkleTree,
        nodes: new Map(data.merkleTree.nodes),
      },
    };
  } catch (error) {
    console.error('Error loading pool state:', error);
    return null;
  }
}

/**
 * Clear pool state (for testing)
 */
export function clearPoolState(): void {
  if (fs.existsSync(POOL_STATE_FILE)) {
    fs.unlinkSync(POOL_STATE_FILE);
    console.log('✓ Pool state cleared');
  }
}

/**
 * Export pool state for backup
 */
export function exportPoolState(poolState: PoolState, filePath: string): void {
  const serializable = {
    ...poolState,
    usedNullifiers: Array.from(poolState.usedNullifiers),
    usedKeyImages: Array.from(poolState.usedKeyImages),
    merkleTree: {
      ...poolState.merkleTree,
      nodes: Array.from(poolState.merkleTree.nodes.entries()),
    },
  };

  fs.writeFileSync(filePath, JSON.stringify(serializable, null, 2));
  console.log(`✓ Pool state exported to: ${filePath}`);
}

/**
 * Import pool state from backup
 */
export function importPoolState(filePath: string): PoolState {
  const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

  return {
    ...data,
    usedNullifiers: new Set(data.usedNullifiers),
    usedKeyImages: new Set(data.usedKeyImages),
    merkleTree: {
      ...data.merkleTree,
      nodes: new Map(data.merkleTree.nodes),
    },
  };
}
