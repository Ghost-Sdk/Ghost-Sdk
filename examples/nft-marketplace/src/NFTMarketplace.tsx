import React, { useState, useEffect } from 'react';
import { UltimatePrivacyClient } from '@ghost-sdk/integrations';

interface NFT {
  id: string;
  name: string;
  image: string;
  price?: number;
  forSale: boolean;
  encrypted: boolean;
}

export const NFTMarketplace: React.FC = () => {
  const [nfts, setNfts] = useState<NFT[]>([]);
  const [selectedNFT, setSelectedNFT] = useState<NFT | null>(null);
  const [bidAmount, setBidAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'browse' | 'my-nfts'>('browse');

  useEffect(() => {
    // Load mock NFTs
    const mockNFTs: NFT[] = [
      {
        id: '1',
        name: 'Phantom Ape #1234',
        image: '🦍',
        price: 15,
        forSale: true,
        encrypted: true,
      },
      {
        id: '2',
        name: 'Shadow Dragon #5678',
        image: '🐉',
        price: 25,
        forSale: true,
        encrypted: true,
      },
      {
        id: '3',
        name: 'Ghost Punk #9012',
        image: '👻',
        price: 10,
        forSale: true,
        encrypted: true,
      },
      {
        id: '4',
        name: 'Stealth Bear #3456',
        image: '🐻',
        forSale: false,
        encrypted: true,
      },
    ];
    setNfts(mockNFTs);
  }, []);

  const handleBuyNFT = async (nft: NFT) => {
    setLoading(true);

    try {
      console.log(`Buying NFT: ${nft.name} for ${nft.price} SOL`);

      // Simulate private purchase
      await new Promise(resolve => setTimeout(resolve, 2000));

      alert(`Successfully purchased ${nft.name} privately!\n\nNo one knows:\n- Who bought it\n- For how much\n- Your wallet balance`);

      // Update NFT state
      setNfts(prev => prev.map(n =>
        n.id === nft.id ? { ...n, forSale: false } : n
      ));
      setSelectedNFT(null);
    } catch (error: any) {
      alert(`Purchase failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handlePlaceBid = async (nft: NFT) => {
    if (!bidAmount) {
      alert('Please enter a bid amount');
      return;
    }

    setLoading(true);

    try {
      console.log(`Placing private bid: ${bidAmount} SOL on ${nft.name}`);

      // Simulate private bid
      await new Promise(resolve => setTimeout(resolve, 2000));

      alert(`Private bid placed!\n\nYour bid of ${bidAmount} SOL is:\n✅ Anonymous\n✅ Encrypted\n✅ Hidden from other bidders`);

      setBidAmount('');
      setSelectedNFT(null);
    } catch (error: any) {
      alert(`Bid failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleListNFT = async (nft: NFT, price: number) => {
    setLoading(true);

    try {
      console.log(`Listing NFT: ${nft.name} for ${price} SOL`);

      // Simulate private listing
      await new Promise(resolve => setTimeout(resolve, 2000));

      alert(`NFT listed privately!\n\nPrice is hidden from:\n✅ Other sellers\n✅ Potential buyers\n✅ The public`);

      setNfts(prev => prev.map(n =>
        n.id === nft.id ? { ...n, price, forSale: true } : n
      ));
    } catch (error: any) {
      alert(`Listing failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>🖼️ Private NFT Marketplace</h1>
      <p style={styles.subtitle}>Anonymous NFT trading with Ghost SDK</p>

      <div style={styles.tabs}>
        <button
          onClick={() => setActiveTab('browse')}
          style={{
            ...styles.tab,
            ...(activeTab === 'browse' ? styles.tabActive : {}),
          }}
        >
          Browse
        </button>
        <button
          onClick={() => setActiveTab('my-nfts')}
          style={{
            ...styles.tab,
            ...(activeTab === 'my-nfts' ? styles.tabActive : {}),
          }}
        >
          My NFTs
        </button>
      </div>

      {activeTab === 'browse' && (
        <div style={styles.grid}>
          {nfts
            .filter(nft => nft.forSale)
            .map(nft => (
              <div key={nft.id} style={styles.card}>
                <div style={styles.nftImage}>{nft.image}</div>
                <h3 style={styles.nftName}>{nft.name}</h3>

                <div style={styles.priceSection}>
                  <div style={styles.priceLabel}>Price</div>
                  <div style={styles.price}>
                    {nft.encrypted ? '🔒 Private' : `${nft.price} SOL`}
                  </div>
                </div>

                <div style={styles.badges}>
                  {nft.encrypted && <span style={styles.badge}>🔐 Encrypted</span>}
                  <span style={styles.badge}>✅ Anonymous</span>
                </div>

                <div style={styles.actions}>
                  <button
                    onClick={() => handleBuyNFT(nft)}
                    disabled={loading}
                    style={{
                      ...styles.button,
                      ...(loading ? styles.buttonDisabled : {}),
                    }}
                  >
                    {loading ? '🔐 Processing...' : '🚀 Buy Privately'}
                  </button>

                  <button
                    onClick={() => setSelectedNFT(nft)}
                    style={styles.buttonSecondary}
                  >
                    💰 Place Bid
                  </button>
                </div>
              </div>
            ))}
        </div>
      )}

      {activeTab === 'my-nfts' && (
        <div style={styles.grid}>
          {nfts
            .filter(nft => !nft.forSale)
            .map(nft => (
              <div key={nft.id} style={styles.card}>
                <div style={styles.nftImage}>{nft.image}</div>
                <h3 style={styles.nftName}>{nft.name}</h3>

                <div style={styles.priceSection}>
                  <div style={styles.priceLabel}>Status</div>
                  <div style={styles.price}>Not Listed</div>
                </div>

                <div style={styles.badges}>
                  <span style={styles.badge}>👤 Owned</span>
                  <span style={styles.badge}>🔐 Private</span>
                </div>

                <button
                  onClick={() => {
                    const price = prompt('Enter listing price (SOL):');
                    if (price) handleListNFT(nft, parseFloat(price));
                  }}
                  disabled={loading}
                  style={{
                    ...styles.button,
                    ...(loading ? styles.buttonDisabled : {}),
                  }}
                >
                  📝 List for Sale
                </button>
              </div>
            ))}

          {nfts.filter(nft => !nft.forSale).length === 0 && (
            <div style={styles.emptyState}>
              <p>You don't own any NFTs yet</p>
              <p style={styles.emptyHint}>Browse the marketplace to get started!</p>
            </div>
          )}
        </div>
      )}

      {selectedNFT && (
        <div style={styles.modal} onClick={() => setSelectedNFT(null)}>
          <div style={styles.modalContent} onClick={e => e.stopPropagation()}>
            <h2>Place Private Bid</h2>
            <p style={styles.modalSubtitle}>on {selectedNFT.name}</p>

            <div style={styles.inputGroup}>
              <label style={styles.label}>Bid Amount (SOL)</label>
              <input
                type="number"
                value={bidAmount}
                onChange={(e) => setBidAmount(e.target.value)}
                placeholder="0.00"
                style={styles.input}
              />
            </div>

            <div style={styles.privacyInfo}>
              <h4>Privacy Features:</h4>
              <ul style={styles.privacyList}>
                <li>✅ Bid amount is encrypted</li>
                <li>✅ Your identity is hidden</li>
                <li>✅ Other bidders can't see your bid</li>
                <li>✅ Seller can't identify you</li>
              </ul>
            </div>

            <div style={styles.modalActions}>
              <button
                onClick={() => handlePlaceBid(selectedNFT)}
                disabled={loading || !bidAmount}
                style={{
                  ...styles.button,
                  ...(loading || !bidAmount ? styles.buttonDisabled : {}),
                }}
              >
                {loading ? '🔐 Placing Bid...' : '💰 Place Private Bid'}
              </button>
              <button
                onClick={() => setSelectedNFT(null)}
                style={styles.buttonSecondary}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <div style={styles.features}>
        <h3>Why Private NFT Trading?</h3>
        <div style={styles.featureGrid}>
          <div style={styles.feature}>
            <div style={styles.featureIcon}>🔒</div>
            <div style={styles.featureTitle}>Hidden Ownership</div>
            <div style={styles.featureDesc}>No one knows who owns which NFTs</div>
          </div>
          <div style={styles.feature}>
            <div style={styles.featureIcon}>💰</div>
            <div style={styles.featureTitle}>Private Sales</div>
            <div style={styles.featureDesc}>Purchase prices remain confidential</div>
          </div>
          <div style={styles.feature}>
            <div style={styles.featureIcon}>🎭</div>
            <div style={styles.featureTitle}>Anonymous Bids</div>
            <div style={styles.featureDesc}>Bid amounts are encrypted</div>
          </div>
          <div style={styles.feature}>
            <div style={styles.featureIcon}>🛡️</div>
            <div style={styles.featureTitle}>Stealth Collections</div>
            <div style={styles.featureDesc}>Collection sizes stay private</div>
          </div>
        </div>
      </div>
    </div>
  );
};

const styles = {
  container: {
    maxWidth: '1200px',
    margin: '40px auto',
    padding: '20px',
  } as React.CSSProperties,
  title: {
    fontSize: '42px',
    fontWeight: '700' as const,
    marginBottom: '8px',
  } as React.CSSProperties,
  subtitle: {
    color: '#888',
    marginBottom: '32px',
    fontSize: '16px',
  } as React.CSSProperties,
  tabs: {
    display: 'flex',
    gap: '12px',
    marginBottom: '32px',
    borderBottom: '2px solid #2d3748',
  } as React.CSSProperties,
  tab: {
    padding: '12px 24px',
    backgroundColor: 'transparent',
    border: 'none',
    color: '#888',
    fontSize: '16px',
    cursor: 'pointer',
    borderBottom: '2px solid transparent',
    marginBottom: '-2px',
  } as React.CSSProperties,
  tabActive: {
    color: '#fff',
    borderBottomColor: '#667eea',
  } as React.CSSProperties,
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
    gap: '24px',
    marginBottom: '48px',
  } as React.CSSProperties,
  card: {
    backgroundColor: '#1a1a2e',
    padding: '24px',
    borderRadius: '16px',
    border: '1px solid #2d3748',
  } as React.CSSProperties,
  nftImage: {
    fontSize: '120px',
    textAlign: 'center' as const,
    marginBottom: '16px',
  } as React.CSSProperties,
  nftName: {
    fontSize: '20px',
    fontWeight: '600' as const,
    marginBottom: '16px',
    textAlign: 'center' as const,
  } as React.CSSProperties,
  priceSection: {
    marginBottom: '16px',
  } as React.CSSProperties,
  priceLabel: {
    fontSize: '11px',
    color: '#888',
    textTransform: 'uppercase' as const,
    marginBottom: '4px',
  } as React.CSSProperties,
  price: {
    fontSize: '24px',
    fontWeight: '700' as const,
    color: '#667eea',
  } as React.CSSProperties,
  badges: {
    display: 'flex',
    gap: '8px',
    flexWrap: 'wrap' as const,
    marginBottom: '16px',
  } as React.CSSProperties,
  badge: {
    fontSize: '11px',
    padding: '4px 8px',
    backgroundColor: '#2d3748',
    borderRadius: '4px',
    color: '#888',
  } as React.CSSProperties,
  actions: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '8px',
  } as React.CSSProperties,
  button: {
    width: '100%',
    padding: '14px',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    fontSize: '15px',
    fontWeight: '600' as const,
    cursor: 'pointer',
  } as React.CSSProperties,
  buttonSecondary: {
    width: '100%',
    padding: '14px',
    backgroundColor: 'transparent',
    color: '#667eea',
    border: '1px solid #667eea',
    borderRadius: '8px',
    fontSize: '15px',
    fontWeight: '600' as const,
    cursor: 'pointer',
  } as React.CSSProperties,
  buttonDisabled: {
    opacity: 0.5,
    cursor: 'not-allowed',
  } as React.CSSProperties,
  emptyState: {
    gridColumn: '1 / -1',
    textAlign: 'center' as const,
    padding: '60px 20px',
    color: '#888',
  } as React.CSSProperties,
  emptyHint: {
    marginTop: '8px',
    fontSize: '14px',
  } as React.CSSProperties,
  modal: {
    position: 'fixed' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  } as React.CSSProperties,
  modalContent: {
    backgroundColor: '#1a1a2e',
    padding: '32px',
    borderRadius: '16px',
    maxWidth: '500px',
    width: '90%',
    border: '1px solid #2d3748',
  } as React.CSSProperties,
  modalSubtitle: {
    color: '#888',
    marginTop: '-8px',
    marginBottom: '24px',
  } as React.CSSProperties,
  inputGroup: {
    marginBottom: '24px',
  } as React.CSSProperties,
  label: {
    display: 'block',
    fontSize: '12px',
    color: '#888',
    marginBottom: '8px',
    textTransform: 'uppercase' as const,
  } as React.CSSProperties,
  input: {
    width: '100%',
    padding: '16px',
    backgroundColor: '#0a0a14',
    border: '1px solid #2d3748',
    borderRadius: '8px',
    color: '#fff',
    fontSize: '18px',
  } as React.CSSProperties,
  privacyInfo: {
    backgroundColor: '#0a0a14',
    padding: '16px',
    borderRadius: '8px',
    marginBottom: '24px',
  } as React.CSSProperties,
  privacyList: {
    margin: '8px 0 0 0',
    padding: '0 0 0 20px',
    color: '#888',
    lineHeight: '1.8',
  } as React.CSSProperties,
  modalActions: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '8px',
  } as React.CSSProperties,
  features: {
    backgroundColor: '#1a1a2e',
    padding: '32px',
    borderRadius: '16px',
    marginTop: '48px',
  } as React.CSSProperties,
  featureGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '24px',
    marginTop: '24px',
  } as React.CSSProperties,
  feature: {
    textAlign: 'center' as const,
  } as React.CSSProperties,
  featureIcon: {
    fontSize: '48px',
    marginBottom: '12px',
  } as React.CSSProperties,
  featureTitle: {
    fontSize: '16px',
    fontWeight: '600' as const,
    marginBottom: '8px',
  } as React.CSSProperties,
  featureDesc: {
    fontSize: '13px',
    color: '#888',
    lineHeight: '1.5',
  } as React.CSSProperties,
};
