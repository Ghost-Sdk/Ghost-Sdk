import { useState, useCallback } from 'react';
import { GhostClient } from '@ghost-sdk/core';
import { TransferResult } from '../types';

export function usePrivateTransfer(client: GhostClient | null) {
  const [result, setResult] = useState<TransferResult>({
    signature: null,
    error: null,
    status: 'idle',
  });

  const transfer = useCallback(
    async (params: { recipient: string; amount: bigint; memo?: string }) => {
      if (!client) {
        setResult({
          signature: null,
          error: new Error('Client not initialized'),
          status: 'error',
        });
        return;
      }

      setResult({ signature: null, error: null, status: 'generating' });

      try {
        const signature = await client.privateTransfer({
          recipient: params.recipient,
          amount: params.amount,
          memo: params.memo,
        });

        setResult({
          signature,
          error: null,
          status: 'success',
        });

        return signature;
      } catch (error) {
        setResult({
          signature: null,
          error: error as Error,
          status: 'error',
        });
      }
    },
    [client]
  );

  const reset = useCallback(() => {
    setResult({
      signature: null,
      error: null,
      status: 'idle',
    });
  }, []);

  return {
    ...result,
    transfer,
    reset,
  };
}
