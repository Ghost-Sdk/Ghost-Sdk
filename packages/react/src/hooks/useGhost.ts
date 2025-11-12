import { useState, useEffect, useCallback } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { GhostClient } from '@ghost-sdk/core';
import { MoneroPrivacyClient } from '@ghost-sdk/monero';
import { ZcashZSAClient } from '@ghost-sdk/zcash';
import { GHOST_PROGRAM_ID } from '@ghost-sdk/core';
import { GhostContextType } from '../types';

export function useGhost(): GhostContextType {
  const { connection } = useConnection();
  const wallet = useWallet();

  const [client, setClient] = useState<GhostClient | null>(null);
  const [monero, setMonero] = useState<MoneroPrivacyClient | null>(null);
  const [zcash, setZcash] = useState<ZcashZSAClient | null>(null);
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);

  const initialize = useCallback(async () => {
    if (!wallet.publicKey || connecting) return;

    setConnecting(true);

    try {
      // Initialize Ghost client
      const ghostClient = new GhostClient({
        connection,
        wallet,
        programId: GHOST_PROGRAM_ID,
      });

      await ghostClient.initialize();
      setClient(ghostClient);

      // Initialize Monero client
      const moneroClient = new MoneroPrivacyClient();
      await moneroClient.initialize();
      setMonero(moneroClient);

      // Initialize Zcash client
      const zcashClient = new ZcashZSAClient();
      await zcashClient.initialize();
      setZcash(zcashClient);

      setConnected(true);
      console.log('✅ Ghost SDK initialized');
    } catch (error) {
      console.error('Failed to initialize Ghost SDK:', error);
      setConnected(false);
    } finally {
      setConnecting(false);
    }
  }, [connection, wallet, connecting]);

  const disconnect = useCallback(() => {
    setClient(null);
    setMonero(null);
    setZcash(null);
    setConnected(false);
  }, []);

  useEffect(() => {
    if (wallet.publicKey && !connected && !connecting) {
      initialize();
    }
  }, [wallet.publicKey, connected, connecting, initialize]);

  return {
    client,
    monero,
    zcash,
    connected,
    connecting,
    initialize,
    disconnect,
  };
}
