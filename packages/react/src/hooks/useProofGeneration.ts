import { useState, useCallback } from 'react';
import { GhostClient, ZKProof } from '@ghost-sdk/core';
import { ProofStatus } from '../types';

export function useProofGeneration(client: GhostClient | null) {
  const [proof, setProof] = useState<ZKProof | null>(null);
  const [status, setStatus] = useState<ProofStatus>('idle');
  const [error, setError] = useState<Error | null>(null);
  const [progress, setProgress] = useState(0);

  const generateProof = useCallback(
    async (params: { amount: bigint; recipient: string; commitment: string; nullifier: string }) => {
      if (!client) {
        setError(new Error('Client not initialized'));
        setStatus('error');
        return;
      }

      setStatus('generating');
      setError(null);
      setProgress(0);

      try {
        // Simulate progress
        const progressInterval = setInterval(() => {
          setProgress(prev => Math.min(prev + 10, 90));
        }, 100);

        const zkProof = await client.generateTransferProof(params);

        clearInterval(progressInterval);
        setProgress(100);
        setProof(zkProof);
        setStatus('success');

        return zkProof;
      } catch (err) {
        setError(err as Error);
        setStatus('error');
        setProgress(0);
      }
    },
    [client]
  );

  const reset = useCallback(() => {
    setProof(null);
    setStatus('idle');
    setError(null);
    setProgress(0);
  }, []);

  return {
    proof,
    status,
    error,
    progress,
    generateProof,
    reset,
  };
}
