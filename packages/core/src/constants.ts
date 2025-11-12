import { PublicKey } from '@solana/web3.js';

// Program IDs
export const GHOST_PROGRAM_ID = new PublicKey('GhostPrivacy11111111111111111111111111111111');

// Tree parameters
export const MERKLE_TREE_DEPTH = 20;
export const MAX_COMMITMENTS = 2 ** MERKLE_TREE_DEPTH;

// Privacy parameters
export const DEFAULT_RING_SIZE = 11;
export const MAX_RING_SIZE = 16;

// Denomination (in lamports)
export const DENOMINATIONS = {
  SMALL: 100_000_000n, // 0.1 SOL
  MEDIUM: 1_000_000_000n, // 1 SOL
  LARGE: 10_000_000_000n, // 10 SOL
};

// Circuit paths
export const CIRCUITS = {
  TRANSFER: 'circuits/build/transfer',
  BALANCE: 'circuits/build/balance',
  RING_SIGNATURE: 'circuits/build/ring_signature',
};
