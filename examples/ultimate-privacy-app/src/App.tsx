import React from 'react';
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import { PhantomWalletAdapter } from '@solana/wallet-adapter-wallets';
import { clusterApiUrl } from '@solana/web3.js';
import { PrivateWallet } from '@ghost-sdk/react';
import '@solana/wallet-adapter-react-ui/styles.css';

// Configure Solana connection
const network = clusterApiUrl('devnet');
const wallets = [new PhantomWalletAdapter()];

export function App() {
  return (
    <ConnectionProvider endpoint={network}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>
          <div style={styles.app}>
            <header style={styles.header}>
              <h1 style={styles.title}>
                👻 Ghost SDK Demo
              </h1>
              <p style={styles.subtitle}>
                Ultimate Privacy for Solana
              </p>
            </header>

            <main style={styles.main}>
              <PrivateWallet theme="dark" showSubaddresses />
            </main>

            <footer style={styles.footer}>
              <p>
                Powered by <a href="https://github.com/ghost-sdk" style={styles.link}>Ghost SDK</a>
              </p>
              <p style={styles.features}>
                Ghost ZK + Monero Ring Signatures + Zcash Shielded Assets
              </p>
            </footer>
          </div>
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}

const styles = {
  app: {
    minHeight: '100vh',
    backgroundColor: '#0f0f1e',
    color: '#ffffff',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  },
  header: {
    padding: '40px 20px',
    textAlign: 'center' as const,
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  },
  title: {
    fontSize: '48px',
    fontWeight: '700',
    margin: '0 0 8px 0',
  },
  subtitle: {
    fontSize: '20px',
    margin: 0,
    opacity: 0.9,
  },
  main: {
    padding: '40px 20px',
    maxWidth: '800px',
    margin: '0 auto',
  },
  footer: {
    padding: '40px 20px',
    textAlign: 'center' as const,
    borderTop: '1px solid #2d3748',
    marginTop: '60px',
  },
  link: {
    color: '#667eea',
    textDecoration: 'none',
  },
  features: {
    fontSize: '14px',
    color: '#888',
    marginTop: '8px',
  },
};

export default App;
