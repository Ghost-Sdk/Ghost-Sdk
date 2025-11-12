import React from 'react';

export interface BalanceDisplayProps {
  balance: bigint;
  loading: boolean;
  refresh: () => Promise<void>;
  theme?: 'dark' | 'light';
}

export const BalanceDisplay: React.FC<BalanceDisplayProps> = ({
  balance,
  loading,
  refresh,
  theme = 'dark',
}) => {
  const isDark = theme === 'dark';

  const formatBalance = (lamports: bigint): string => {
    const sol = Number(lamports) / 1_000_000_000;
    return sol.toFixed(4);
  };

  const estimateUSD = (lamports: bigint): string => {
    // Mock price - in production, fetch from API
    const sol = Number(lamports) / 1_000_000_000;
    const price = 100; // Mock SOL price
    return (sol * price).toFixed(2);
  };

  const styles = {
    container: {
      backgroundColor: isDark ? '#0a0a14' : '#f5f5f5',
      padding: '20px',
      borderRadius: '8px',
      marginBottom: '20px',
      position: 'relative' as const,
    },
    header: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '12px',
    },
    label: {
      fontSize: '12px',
      color: isDark ? '#888' : '#666',
      textTransform: 'uppercase' as const,
      fontWeight: '600' as const,
    },
    refreshButton: {
      background: 'none',
      border: 'none',
      color: isDark ? '#667eea' : '#764ba2',
      cursor: 'pointer',
      fontSize: '18px',
      padding: '4px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      transition: 'transform 0.2s',
    },
    amount: {
      fontSize: '32px',
      fontWeight: '700' as const,
      marginBottom: '4px',
      color: isDark ? '#fff' : '#000',
    },
    currency: {
      fontSize: '20px',
      color: isDark ? '#888' : '#666',
      marginLeft: '8px',
    },
    usd: {
      fontSize: '14px',
      color: isDark ? '#888' : '#666',
    },
    badge: {
      display: 'inline-block',
      padding: '4px 8px',
      backgroundColor: isDark ? '#1a1a2e' : '#e0e0e0',
      borderRadius: '4px',
      fontSize: '10px',
      fontWeight: '600' as const,
      color: isDark ? '#667eea' : '#764ba2',
      marginTop: '8px',
    },
    loading: {
      position: 'absolute' as const,
      top: '20px',
      right: '20px',
      fontSize: '14px',
      color: isDark ? '#888' : '#666',
    },
  };

  return (
    <div style={styles.container}>
      {loading && <div style={styles.loading}>Loading...</div>}

      <div style={styles.header}>
        <div style={styles.label}>Private Balance</div>
        <button
          onClick={refresh}
          style={{
            ...styles.refreshButton,
            transform: loading ? 'rotate(360deg)' : 'rotate(0deg)',
          }}
          disabled={loading}
          title="Refresh balance"
        >
          🔄
        </button>
      </div>

      <div>
        <div style={styles.amount}>
          {formatBalance(balance)}
          <span style={styles.currency}>SOL</span>
        </div>
        <div style={styles.usd}>
          ≈ ${estimateUSD(balance)} USD
        </div>
        <div style={styles.badge}>
          🔐 HIDDEN
        </div>
      </div>
    </div>
  );
};
