import { useState, useEffect, useCallback } from 'react';
import { GhostClient } from '@ghost-sdk/core';
import { BalanceData } from '../types';

export function usePrivateBalance(client: GhostClient | null): BalanceData {
  const [balance, setBalance] = useState<bigint>(0n);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const refresh = useCallback(async () => {
    if (!client) {
      setError(new Error('Client not initialized'));
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const privateBalance = await client.getPrivateBalance();
      setBalance(privateBalance);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, [client]);

  useEffect(() => {
    if (client) {
      refresh();
    }
  }, [client, refresh]);

  return {
    balance,
    loading,
    error,
    refresh,
  };
}
