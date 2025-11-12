/**
 * Merkle Tree Implementation for Commitment Tracking
 * Used to prove membership in the commitment set
 */

import * as fs from 'fs';
import * as path from 'path';
import { buildPoseidon } from 'circomlibjs';

export class MerkleTree {
  private levels: number;
  private leaves: Map<number, string>;
  private tree: Map<string, string>; // Maps level:index -> hash
  private nextIndex: number;
  private zeroHashes: string[];
  private poseidon: any;
  private initialized: boolean = false;

  constructor(levels: number = 20) {
    this.levels = levels;
    this.leaves = new Map();
    this.tree = new Map();
    this.nextIndex = 0;
    this.zeroHashes = [];
  }

  /**
   * Initialize Poseidon hash function (must be called before using tree)
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;
    this.poseidon = await buildPoseidon();
    this.zeroHashes = this.computeZeroHashes();
    this.initialized = true;
  }

  private ensureInitialized(): void {
    if (!this.initialized) {
      throw new Error('MerkleTree not initialized. Call initialize() first.');
    }
  }

  /**
   * Compute zero hashes for empty tree positions
   */
  private computeZeroHashes(): string[] {
    const hashes = ['0'];

    for (let i = 1; i <= this.levels; i++) {
      const prev = hashes[i - 1];
      hashes.push(this.hash(prev, prev));
    }

    return hashes;
  }

  /**
   * Poseidon hash function
   */
  private hash(left: string, right: string): string {
    this.ensureInitialized();

    // Convert hex strings to BigInt for Poseidon
    const leftBigInt = left === '0' ? BigInt(0) : BigInt('0x' + left);
    const rightBigInt = right === '0' ? BigInt(0) : BigInt('0x' + right);

    // Hash using Poseidon
    const hash = this.poseidon([leftBigInt, rightBigInt]);
    const hashValue = this.poseidon.F.toString(hash);

    // Convert to hex string (remove 0x prefix if present)
    return BigInt(hashValue).toString(16).padStart(64, '0');
  }

  /**
   * Insert a new commitment leaf
   */
  insert(commitment: string): number {
    this.ensureInitialized();
    const index = this.nextIndex;
    this.leaves.set(index, commitment);
    this.tree.set(`0:${index}`, commitment);

    // Update tree
    this.updateTree(index);

    this.nextIndex++;
    return index;
  }

  /**
   * Update tree after inserting leaf at index
   */
  private updateTree(leafIndex: number): void {
    let currentIndex = leafIndex;
    let currentHash = this.leaves.get(leafIndex) || this.zeroHashes[0];

    for (let level = 0; level < this.levels; level++) {
      const isLeft = currentIndex % 2 === 0;
      const siblingIndex = isLeft ? currentIndex + 1 : currentIndex - 1;

      const sibling =
        this.tree.get(`${level}:${siblingIndex}`) || this.zeroHashes[level];

      const left = isLeft ? currentHash : sibling;
      const right = isLeft ? sibling : currentHash;

      currentHash = this.hash(left, right);

      const parentIndex = Math.floor(currentIndex / 2);
      this.tree.set(`${level + 1}:${parentIndex}`, currentHash);

      currentIndex = parentIndex;
    }
  }

  /**
   * Get current Merkle root
   */
  getRoot(): string {
    this.ensureInitialized();
    return this.tree.get(`${this.levels}:0`) || this.zeroHashes[this.levels];
  }

  /**
   * Get leaf at index
   */
  getLeaf(index: number): string | undefined {
    return this.leaves.get(index);
  }

  /**
   * Generate Merkle proof for a leaf
   */
  getProof(leafIndex: number): {
    pathElements: string[];
    pathIndices: number[];
  } {
    this.ensureInitialized();
    const pathElements: string[] = [];
    const pathIndices: number[] = [];

    let currentIndex = leafIndex;

    for (let level = 0; level < this.levels; level++) {
      const isLeft = currentIndex % 2 === 0;
      const siblingIndex = isLeft ? currentIndex + 1 : currentIndex - 1;

      const sibling =
        this.tree.get(`${level}:${siblingIndex}`) || this.zeroHashes[level];

      pathElements.push(sibling);
      pathIndices.push(isLeft ? 0 : 1);

      currentIndex = Math.floor(currentIndex / 2);
    }

    return { pathElements, pathIndices };
  }

  /**
   * Verify a Merkle proof
   */
  verifyProof(
    leaf: string,
    proof: { pathElements: string[]; pathIndices: number[] },
    root: string
  ): boolean {
    this.ensureInitialized();
    let currentHash = leaf;

    for (let i = 0; i < proof.pathElements.length; i++) {
      const sibling = proof.pathElements[i];
      const isLeft = proof.pathIndices[i] === 0;

      currentHash = isLeft
        ? this.hash(currentHash, sibling)
        : this.hash(sibling, currentHash);
    }

    return currentHash === root;
  }

  /**
   * Get number of leaves
   */
  getLeafCount(): number {
    return this.nextIndex;
  }

  /**
   * Export tree state
   */
  export(): any {
    return {
      levels: this.levels,
      nextIndex: this.nextIndex,
      leaves: Array.from(this.leaves.entries()),
      root: this.getRoot(),
    };
  }

  /**
   * Import tree state
   */
  import(data: any): void {
    this.ensureInitialized();
    this.levels = data.levels;
    this.nextIndex = data.nextIndex;
    this.leaves = new Map(data.leaves);

    // Rebuild tree
    this.tree.clear();
    for (const [index, commitment] of this.leaves.entries()) {
      this.tree.set(`0:${index}`, commitment);
    }

    // Rebuild all levels
    for (let i = 0; i < this.nextIndex; i++) {
      this.updateTree(i);
    }
  }

  /**
   * Save tree to file
   */
  save(filepath: string): void {
    const data = this.export();
    fs.writeFileSync(filepath, JSON.stringify(data, null, 2));
  }

  /**
   * Load tree from file
   */
  static async load(filepath: string): Promise<MerkleTree> {
    const tree = new MerkleTree();
    await tree.initialize();

    if (!fs.existsSync(filepath)) {
      return tree;
    }

    const data = JSON.parse(fs.readFileSync(filepath, 'utf-8'));
    tree.levels = data.levels;
    tree.import(data);

    return tree;
  }
}

// Example usage
export async function testMerkleTree() {
  const tree = new MerkleTree(20);
  await tree.initialize();

  // Insert some commitments
  const commitment1 = 'commitment_hash_1';
  const commitment2 = 'commitment_hash_2';
  const commitment3 = 'commitment_hash_3';

  const index1 = tree.insert(commitment1);
  const index2 = tree.insert(commitment2);
  const index3 = tree.insert(commitment3);

  const root = tree.getRoot();
  console.log('Root:', root);

  // Generate and verify proof
  const proof = tree.getProof(index1);
  const isValid = tree.verifyProof(commitment1, proof, root);
  console.log('Proof valid:', isValid);

  // Save tree
  const treePath = path.join(__dirname, 'merkle_tree.json');
  tree.save(treePath);

  // Load tree
  const loadedTree = await MerkleTree.load(treePath);
  console.log('Tree loaded successfully');
}
