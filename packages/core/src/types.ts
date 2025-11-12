import { PublicKey, Connection } from '@solana/web3.js';

export interface GhostClientConfig {
  connection: Connection;
  wallet: any; // Wallet adapter
  programId: PublicKey;
  circuitsPath?: string;
}

export interface Commitment {
  value: Uint8Array;
  nonce: Uint8Array;
  amount: bigint;
}

export interface Nullifier {
  value: Uint8Array;
  commitment: Uint8Array;
}

export interface ZKProof {
  proof: Uint8Array;
  publicSignals: string[];
}

export interface PrivateTransferParams {
  recipient: string;
  amount: bigint;
  memo?: string;
}

export interface DepositParams {
  amount: bigint;
}

export interface WithdrawParams {
  amount: bigint;
  recipient: string;
}

export interface BalanceProofParams {
  minBalance: bigint;
}

export type ProofStatus = 'idle' | 'generating' | 'success' | 'error';
