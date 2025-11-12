import { GhostClient, ProofStatus } from '@ghost-sdk/core';
import { MoneroPrivacyClient } from '@ghost-sdk/monero';
import { ZcashZSAClient } from '@ghost-sdk/zcash';

export interface GhostContextType {
  client: GhostClient | null;
  monero: MoneroPrivacyClient | null;
  zcash: ZcashZSAClient | null;
  connected: boolean;
  connecting: boolean;
  initialize: () => Promise<void>;
  disconnect: () => void;
}

export interface TransferResult {
  signature: string | null;
  error: Error | null;
  status: 'idle' | 'generating' | 'submitting' | 'success' | 'error';
}

export interface BalanceData {
  balance: bigint;
  loading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
}

export { ProofStatus };
