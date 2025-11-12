import React, { useState } from 'react';
import { useGhost } from '../hooks/useGhost';
import { usePrivateBalance } from '../hooks/usePrivateTransfer';
import { usePrivateTransfer } from '../hooks/usePrivateTransfer';
import { ProofStatus } from './ProofStatus';
import { BalanceDisplay } from './BalanceDisplay';

export interface PrivateWalletProps {
  theme?: 'dark' | 'light';
  showSubaddresses?: boolean;
}

export const PrivateWallet: React.FC<PrivateWalletProps> = ({ theme = 'dark', showSubaddresses = false }) => {
  const { client, monero, connected, connecting } = useGhost();
  const { balance, loading: balanceLoading, refresh } = usePrivateBalance(client);
  const { transfer, status, error: transferError } = usePrivateTransfer(client);

  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [memo, setMemo] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);

  const handleTransfer = async () => {
    if (!recipient || !amount) {
      alert('Please enter recipient and amount');
      return;
    }

    try {
      const amountLamports = BigInt(parseFloat(amount) * 1_000_000_000);
      await transfer({ recipient, amount: amountLamports, memo });

      // Reset form
      setRecipient('');
      setAmount('');
      setMemo('');
    } catch (error: any) {
      alert(`Transfer failed: ${error.message}`);
    }
  };

  const isDark = theme === 'dark';

  const styles = {
    container: {
      maxWidth: '600px',
      margin: '0 auto',
      padding: '20px',
      backgroundColor: isDark ? '#1a1a2e' : '#ffffff',
      color: isDark ? '#ffffff' : '#000000',
      borderRadius: '12px',
      boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
    },
    header: {
      marginBottom: '24px',
    },
    title: {
      fontSize: '24px',
      fontWeight: '600',
      marginBottom: '8px',
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
    },
    subtitle: {
      fontSize: '14px',
      color: isDark ? '#888' : '#666',
    },
    balanceCard: {
      backgroundColor: isDark ? '#0a0a14' : '#f5f5f5',
      padding: '20px',
      borderRadius: '8px',
      marginBottom: '20px',
    },
    balanceLabel: {
      fontSize: '12px',
      color: isDark ? '#888' : '#666',
      marginBottom: '8px',
      textTransform: 'uppercase' as const,
    },
    balanceAmount: {
      fontSize: '32px',
      fontWeight: '700',
      marginBottom: '8px',
    },
    balanceUsd: {
      fontSize: '14px',
      color: isDark ? '#888' : '#666',
    },
    form: {
      display: 'flex',
      flexDirection: 'column' as const,
      gap: '16px',
    },
    inputGroup: {
      display: 'flex',
      flexDirection: 'column' as const,
      gap: '4px',
    },
    label: {
      fontSize: '12px',
      color: isDark ? '#888' : '#666',
      fontWeight: '500',
    },
    input: {
      padding: '12px',
      backgroundColor: isDark ? '#0a0a14' : '#f5f5f5',
      border: `1px solid ${isDark ? '#2d3748' : '#e0e0e0'}`,
      borderRadius: '6px',
      color: isDark ? '#fff' : '#000',
      fontSize: '14px',
      outline: 'none',
    },
    button: {
      padding: '14px',
      background: status === 'generating'
        ? '#4a5568'
        : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      color: '#fff',
      border: 'none',
      borderRadius: '8px',
      fontSize: '16px',
      fontWeight: '600',
      cursor: status === 'generating' ? 'not-allowed' : 'pointer',
      transition: 'all 0.2s',
    },
    features: {
      display: 'grid',
      gridTemplateColumns: 'repeat(2, 1fr)',
      gap: '8px',
      marginTop: '16px',
      fontSize: '12px',
      color: isDark ? '#888' : '#666',
    },
    feature: {
      display: 'flex',
      alignItems: 'center',
      gap: '4px',
    },
    link: {
      color: isDark ? '#667eea' : '#764ba2',
      textDecoration: 'none',
      fontSize: '12px',
    },
  };

  if (!connected) {
    return (
      <div style={styles.container}>
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <h2 style={styles.title}>👻 Connect Your Wallet</h2>
          <p style={styles.subtitle}>Connect a Solana wallet to use Ghost SDK</p>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2 style={styles.title}>
          <span>👻</span>
          Ghost Wallet
        </h2>
        <p style={styles.subtitle}>Private transactions on Solana</p>
      </div>

      <BalanceDisplay balance={balance} loading={balanceLoading} refresh={refresh} theme={theme} />

      <div style={styles.form}>
        <div style={styles.inputGroup}>
          <label style={styles.label}>Recipient Address</label>
          <input
            type="text"
            value={recipient}
            onChange={(e) => setRecipient(e.target.value)}
            placeholder="Monero-style address or Solana pubkey"
            style={styles.input}
          />
        </div>

        <div style={styles.inputGroup}>
          <label style={styles.label}>Amount (SOL)</label>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            step="0.01"
            style={styles.input}
          />
        </div>

        {showAdvanced && (
          <div style={styles.inputGroup}>
            <label style={styles.label}>Memo (Optional, Encrypted)</label>
            <input
              type="text"
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              placeholder="Private message"
              style={styles.input}
            />
          </div>
        )}

        <button onClick={() => setShowAdvanced(!showAdvanced)} style={styles.link}>
          {showAdvanced ? '− Hide' : '+ Show'} Advanced Options
        </button>

        <button
          onClick={handleTransfer}
          disabled={status === 'generating' || !recipient || !amount}
          style={styles.button}
        >
          {status === 'generating' ? '🔐 Generating Proof...' : '🚀 Send Privately'}
        </button>

        {status === 'generating' && <ProofStatus status={status} progress={75} />}

        {transferError && (
          <div style={{ color: '#ff5555', fontSize: '14px' }}>
            Error: {transferError.message}
          </div>
        )}

        {status === 'success' && (
          <div style={{ color: '#50fa7b', fontSize: '14px' }}>
            ✅ Transfer successful! Transaction is completely private.
          </div>
        )}

        <div style={styles.features}>
          <div style={styles.feature}>✅ Hidden sender</div>
          <div style={styles.feature}>✅ Hidden amount</div>
          <div style={styles.feature}>✅ Hidden recipient</div>
          <div style={styles.feature}>✅ ZK proof</div>
        </div>
      </div>
    </div>
  );
};
