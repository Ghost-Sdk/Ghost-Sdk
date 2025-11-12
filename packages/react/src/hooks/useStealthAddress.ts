import { useState, useCallback } from 'react';
import { MoneroPrivacyClient, MoneroAddress } from '@ghost-sdk/monero';

export function useStealthAddress(monero: MoneroPrivacyClient | null) {
  const [address, setAddress] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const generate = useCallback(
    (recipient: MoneroAddress, index: number = 0) => {
      if (!monero) {
        throw new Error('Monero client not initialized');
      }

      setLoading(true);

      try {
        const stealth = monero.generateStealthAddress(recipient, index);
        setAddress(stealth.address);
        return stealth;
      } finally {
        setLoading(false);
      }
    },
    [monero]
  );

  const getPrimaryAddress = useCallback(() => {
    if (!monero) {
      throw new Error('Monero client not initialized');
    }

    return monero.getPrimaryAddress();
  }, [monero]);

  return {
    address,
    loading,
    generate,
    getPrimaryAddress,
  };
}
