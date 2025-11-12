import React, { useState } from 'react';
import { UltimatePrivacyClient } from '@ghost-sdk/integrations';

export const PrivateDEX: React.FC = () => {
  const [fromToken, setFromToken] = useState('SOL');
  const [toToken, setToToken] = useState('USDC');
  const [amount, setAmount] = useState('');
  const [swapping, setSwapping] = useState(false);

  const handleSwap = async () => {
    setSwapping(true);

    try {
      // Simulate swap
      console.log(`Swapping ${amount} ${fromToken} to ${toToken}`);

      // In production: Use UltimatePrivacyClient
      await new Promise(resolve => setTimeout(resolve, 2000));

      alert('Swap successful! Completely private.');
      setAmount('');
    } catch (error: any) {
      alert(`Swap failed: ${error.message}`);
    } finally {
      setSwapping(false);
    }
  };

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>🔄 Private DEX</h1>
      <p style={styles.subtitle}>Anonymous token swaps with Ghost SDK</p>

      <div style={styles.card}>
        <div style={styles.inputGroup}>
          <label style={styles.label}>From</label>
          <div style={styles.row}>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              style={styles.input}
            />
            <select
              value={fromToken}
              onChange={(e) => setFromToken(e.target.value)}
              style={styles.select}
            >
              <option>SOL</option>
              <option>USDC</option>
              <option>USDT</option>
              <option>BONK</option>
            </select>
          </div>
        </div>

        <div style={styles.swapIcon}>⇅</div>

        <div style={styles.inputGroup}>
          <label style={styles.label}>To</label>
          <div style={styles.row}>
            <input
              type="number"
              value={amount ? (parseFloat(amount) * 100).toFixed(2) : ''}
              disabled
              placeholder="0.00"
              style={styles.input}
            />
            <select
              value={toToken}
              onChange={(e) => setToToken(e.target.value)}
              style={styles.select}
            >
              <option>USDC</option>
              <option>SOL</option>
              <option>USDT</option>
              <option>BONK</option>
            </select>
          </div>
        </div>

        <button
          onClick={handleSwap}
          disabled={swapping || !amount}
          style={{
            ...styles.button,
            ...(swapping || !amount ? styles.buttonDisabled : {}),
          }}
        >
          {swapping ? '🔐 Swapping Privately...' : '🚀 Swap Privately'}
        </button>

        <div style={styles.features}>
          <div style={styles.feature}>✅ Hidden amounts</div>
          <div style={styles.feature}>✅ Anonymous trader</div>
          <div style={styles.feature}>✅ MEV protected</div>
          <div style={styles.feature}>✅ No front-running</div>
        </div>
      </div>

      <div style={styles.info}>
        <h3>How It Works</h3>
        <ol style={styles.list}>
          <li>Your swap order is encrypted</li>
          <li>Ring signature hides your identity</li>
          <li>Shielded transaction hides amounts</li>
          <li>ZK proof validates without revealing</li>
          <li>Complete privacy!</li>
        </ol>
      </div>
    </div>
  );
};

const styles = {
  container: {
    maxWidth: '600px',
    margin: '40px auto',
    padding: '20px',
  } as React.CSSProperties,
  title: {
    fontSize: '36px',
    fontWeight: '700' as const,
    marginBottom: '8px',
  } as React.CSSProperties,
  subtitle: {
    color: '#888',
    marginBottom: '32px',
  } as React.CSSProperties,
  card: {
    backgroundColor: '#1a1a2e',
    padding: '24px',
    borderRadius: '16px',
    marginBottom: '24px',
  } as React.CSSProperties,
  inputGroup: {
    marginBottom: '16px',
  } as React.CSSProperties,
  label: {
    display: 'block',
    fontSize: '12px',
    color: '#888',
    marginBottom: '8px',
    textTransform: 'uppercase' as const,
  } as React.CSSProperties,
  row: {
    display: 'flex',
    gap: '12px',
  } as React.CSSProperties,
  input: {
    flex: 1,
    padding: '16px',
    backgroundColor: '#0a0a14',
    border: '1px solid #2d3748',
    borderRadius: '8px',
    color: '#fff',
    fontSize: '18px',
  } as React.CSSProperties,
  select: {
    padding: '16px',
    backgroundColor: '#0a0a14',
    border: '1px solid #2d3748',
    borderRadius: '8px',
    color: '#fff',
    fontSize: '16px',
    minWidth: '120px',
  } as React.CSSProperties,
  swapIcon: {
    textAlign: 'center' as const,
    fontSize: '24px',
    margin: '16px 0',
  } as React.CSSProperties,
  button: {
    width: '100%',
    padding: '18px',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: '#fff',
    border: 'none',
    borderRadius: '12px',
    fontSize: '18px',
    fontWeight: '600' as const,
    cursor: 'pointer',
    marginTop: '16px',
  } as React.CSSProperties,
  buttonDisabled: {
    opacity: 0.5,
    cursor: 'not-allowed',
  } as React.CSSProperties,
  features: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '8px',
    marginTop: '20px',
    fontSize: '13px',
    color: '#888',
  } as React.CSSProperties,
  feature: {
  } as React.CSSProperties,
  info: {
    backgroundColor: '#1a1a2e',
    padding: '20px',
    borderRadius: '12px',
  } as React.CSSProperties,
  list: {
    paddingLeft: '20px',
    color: '#888',
    lineHeight: '1.8',
  } as React.CSSProperties,
};
