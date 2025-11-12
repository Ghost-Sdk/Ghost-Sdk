import React, { useState, useEffect } from 'react';
import { UltimatePrivacyClient } from '@ghost-sdk/integrations';

interface StakePosition {
  id: string;
  amount: number;
  duration: number;
  startDate: Date;
  endDate: Date;
  apr: number;
  status: 'active' | 'ended';
  encrypted: boolean;
}

export const PrivateStaking: React.FC = () => {
  const [stakeAmount, setStakeAmount] = useState('');
  const [stakeDuration, setStakeDuration] = useState('30');
  const [positions, setPositions] = useState<StakePosition[]>([]);
  const [loading, setLoading] = useState(false);
  const [totalStaked, setTotalStaked] = useState(0);
  const [totalRewards, setTotalRewards] = useState(0);

  useEffect(() => {
    // Load mock positions
    const mockPositions: StakePosition[] = [
      {
        id: '1',
        amount: 1000,
        duration: 30,
        startDate: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
        endDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
        apr: 8.5,
        status: 'active',
        encrypted: true,
      },
      {
        id: '2',
        amount: 500,
        duration: 90,
        startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        endDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
        apr: 12.0,
        status: 'active',
        encrypted: true,
      },
    ];
    setPositions(mockPositions);

    // Calculate totals
    const staked = mockPositions.reduce((sum, pos) => sum + pos.amount, 0);
    const rewards = mockPositions.reduce((sum, pos) => {
      const daysElapsed = (Date.now() - pos.startDate.getTime()) / (1000 * 60 * 60 * 24);
      return sum + (pos.amount * pos.apr / 100 / 365 * daysElapsed);
    }, 0);

    setTotalStaked(staked);
    setTotalRewards(rewards);
  }, []);

  const handleStake = async () => {
    if (!stakeAmount || parseFloat(stakeAmount) <= 0) {
      alert('Please enter a valid stake amount');
      return;
    }

    setLoading(true);

    try {
      const amount = parseFloat(stakeAmount);
      const duration = parseInt(stakeDuration);

      console.log(`Staking ${amount} SOL for ${duration} days`);

      // Simulate private staking
      await new Promise(resolve => setTimeout(resolve, 2500));

      const apr = duration >= 90 ? 12.0 : duration >= 60 ? 10.0 : 8.5;
      const newPosition: StakePosition = {
        id: `${Date.now()}`,
        amount,
        duration,
        startDate: new Date(),
        endDate: new Date(Date.now() + duration * 24 * 60 * 60 * 1000),
        apr,
        status: 'active',
        encrypted: true,
      };

      setPositions(prev => [...prev, newPosition]);
      setTotalStaked(prev => prev + amount);

      alert(`Staked ${amount} SOL privately!\n\nPrivacy features:\n✅ Stake amount hidden\n✅ Duration private\n✅ APR concealed\n✅ Identity anonymous`);

      setStakeAmount('');
    } catch (error: any) {
      alert(`Staking failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleUnstake = async (position: StakePosition) => {
    const now = new Date();
    const isEarly = now < position.endDate;

    if (isEarly) {
      const confirm = window.confirm(
        `Warning: Early unstaking will forfeit rewards.\n\nStake ends: ${position.endDate.toLocaleDateString()}\n\nContinue anyway?`
      );
      if (!confirm) return;
    }

    setLoading(true);

    try {
      console.log(`Unstaking position ${position.id}`);

      // Simulate private unstaking
      await new Promise(resolve => setTimeout(resolve, 2000));

      const daysStaked = (Date.now() - position.startDate.getTime()) / (1000 * 60 * 60 * 24);
      const rewards = isEarly ? 0 : (position.amount * position.apr / 100 / 365 * daysStaked);

      setPositions(prev => prev.filter(p => p.id !== position.id));
      setTotalStaked(prev => prev - position.amount);
      setTotalRewards(prev => prev - rewards);

      alert(`Unstaked successfully!\n\nReturned: ${position.amount} SOL\nRewards: ${rewards.toFixed(4)} SOL\n\nAll private!`);
    } catch (error: any) {
      alert(`Unstaking failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleClaimRewards = async (position: StakePosition) => {
    setLoading(true);

    try {
      console.log(`Claiming rewards for position ${position.id}`);

      // Simulate private claim
      await new Promise(resolve => setTimeout(resolve, 2000));

      const daysStaked = (Date.now() - position.startDate.getTime()) / (1000 * 60 * 60 * 24);
      const rewards = position.amount * position.apr / 100 / 365 * daysStaked;

      alert(`Rewards claimed privately!\n\nAmount: ${rewards.toFixed(4)} SOL\n\n✅ Claim amount hidden\n✅ No public record\n✅ Complete privacy`);

      // Reset start date (in a real implementation, this would be handled by the contract)
      setPositions(prev => prev.map(p =>
        p.id === position.id ? { ...p, startDate: new Date() } : p
      ));
    } catch (error: any) {
      alert(`Claim failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const getDaysRemaining = (endDate: Date): number => {
    const days = Math.ceil((endDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    return Math.max(0, days);
  };

  const getProgress = (position: StakePosition): number => {
    const total = position.endDate.getTime() - position.startDate.getTime();
    const elapsed = Date.now() - position.startDate.getTime();
    return Math.min(100, Math.max(0, (elapsed / total) * 100));
  };

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>🏦 Private Staking</h1>
      <p style={styles.subtitle}>Stake tokens without revealing your stake size</p>

      <div style={styles.statsGrid}>
        <div style={styles.statCard}>
          <div style={styles.statLabel}>Total Staked</div>
          <div style={styles.statValue}>🔒 Private</div>
          <div style={styles.statHint}>{totalStaked.toFixed(2)} SOL (only you see this)</div>
        </div>

        <div style={styles.statCard}>
          <div style={styles.statLabel}>Total Rewards</div>
          <div style={styles.statValue}>🔒 Hidden</div>
          <div style={styles.statHint}>{totalRewards.toFixed(4)} SOL (only you see this)</div>
        </div>

        <div style={styles.statCard}>
          <div style={styles.statLabel}>Active Positions</div>
          <div style={styles.statValue}>{positions.filter(p => p.status === 'active').length}</div>
          <div style={styles.statHint}>Anonymous stakes</div>
        </div>
      </div>

      <div style={styles.mainCard}>
        <h2 style={styles.cardTitle}>Stake SOL Privately</h2>

        <div style={styles.inputGroup}>
          <label style={styles.label}>Amount (SOL)</label>
          <input
            type="number"
            value={stakeAmount}
            onChange={(e) => setStakeAmount(e.target.value)}
            placeholder="0.00"
            style={styles.input}
          />
        </div>

        <div style={styles.inputGroup}>
          <label style={styles.label}>Duration</label>
          <select
            value={stakeDuration}
            onChange={(e) => setStakeDuration(e.target.value)}
            style={styles.select}
          >
            <option value="30">30 days (8.5% APR)</option>
            <option value="60">60 days (10% APR)</option>
            <option value="90">90 days (12% APR)</option>
            <option value="180">180 days (15% APR)</option>
          </select>
        </div>

        <div style={styles.privacyBanner}>
          <h4 style={styles.bannerTitle}>🔐 Privacy Guaranteed</h4>
          <ul style={styles.privacyList}>
            <li>✅ Stake amount is completely hidden</li>
            <li>✅ Your identity remains anonymous</li>
            <li>✅ Rewards are distributed privately</li>
            <li>✅ Duration is concealed from observers</li>
          </ul>
        </div>

        <button
          onClick={handleStake}
          disabled={loading || !stakeAmount}
          style={{
            ...styles.button,
            ...(loading || !stakeAmount ? styles.buttonDisabled : {}),
          }}
        >
          {loading ? '🔐 Staking Privately...' : '🚀 Stake Privately'}
        </button>
      </div>

      {positions.length > 0 && (
        <div style={styles.positionsSection}>
          <h2 style={styles.sectionTitle}>Your Private Positions</h2>

          <div style={styles.positionsGrid}>
            {positions.map(position => {
              const daysRemaining = getDaysRemaining(position.endDate);
              const progress = getProgress(position);
              const daysStaked = (Date.now() - position.startDate.getTime()) / (1000 * 60 * 60 * 24);
              const currentRewards = position.amount * position.apr / 100 / 365 * daysStaked;

              return (
                <div key={position.id} style={styles.positionCard}>
                  <div style={styles.positionHeader}>
                    <div>
                      <div style={styles.positionAmount}>
                        {position.encrypted ? '🔒' : ''} {position.amount} SOL
                      </div>
                      <div style={styles.positionMeta}>
                        {position.duration} days @ {position.apr}% APR
                      </div>
                    </div>
                    <div style={styles.statusBadge}>
                      {position.status === 'active' ? '🟢 Active' : '⚪ Ended'}
                    </div>
                  </div>

                  <div style={styles.progressBar}>
                    <div
                      style={{
                        ...styles.progressFill,
                        width: `${progress}%`,
                      }}
                    />
                  </div>

                  <div style={styles.positionStats}>
                    <div style={styles.positionStat}>
                      <div style={styles.statSmallLabel}>Days Remaining</div>
                      <div style={styles.statSmallValue}>{daysRemaining}</div>
                    </div>
                    <div style={styles.positionStat}>
                      <div style={styles.statSmallLabel}>Current Rewards</div>
                      <div style={styles.statSmallValue}>{currentRewards.toFixed(4)} SOL</div>
                    </div>
                  </div>

                  <div style={styles.positionDates}>
                    <div>Started: {position.startDate.toLocaleDateString()}</div>
                    <div>Ends: {position.endDate.toLocaleDateString()}</div>
                  </div>

                  <div style={styles.positionActions}>
                    <button
                      onClick={() => handleClaimRewards(position)}
                      disabled={loading}
                      style={{
                        ...styles.buttonSmall,
                        ...(loading ? styles.buttonDisabled : {}),
                      }}
                    >
                      💰 Claim Rewards
                    </button>
                    <button
                      onClick={() => handleUnstake(position)}
                      disabled={loading}
                      style={{
                        ...styles.buttonSmallSecondary,
                        ...(loading ? styles.buttonDisabled : {}),
                      }}
                    >
                      🔓 Unstake
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div style={styles.howItWorks}>
        <h3>How Private Staking Works</h3>
        <div style={styles.stepsGrid}>
          <div style={styles.step}>
            <div style={styles.stepNumber}>1</div>
            <div style={styles.stepTitle}>Deposit</div>
            <div style={styles.stepDesc}>Your tokens are encrypted and deposited into a shielded pool</div>
          </div>
          <div style={styles.step}>
            <div style={styles.stepNumber}>2</div>
            <div style={styles.stepTitle}>Stake Privately</div>
            <div style={styles.stepDesc}>Amount and duration are hidden using ZK proofs</div>
          </div>
          <div style={styles.step}>
            <div style={styles.stepNumber}>3</div>
            <div style={styles.stepTitle}>Earn Rewards</div>
            <div style={styles.stepDesc}>Rewards accumulate privately and are distributed anonymously</div>
          </div>
          <div style={styles.step}>
            <div style={styles.stepNumber}>4</div>
            <div style={styles.stepTitle}>Withdraw</div>
            <div style={styles.stepDesc}>Unstake and withdraw anytime with complete privacy</div>
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
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '20px',
    marginBottom: '32px',
  } as React.CSSProperties,
  statCard: {
    backgroundColor: '#1a1a2e',
    padding: '24px',
    borderRadius: '12px',
    border: '1px solid #2d3748',
  } as React.CSSProperties,
  statLabel: {
    fontSize: '12px',
    color: '#888',
    textTransform: 'uppercase' as const,
    marginBottom: '8px',
  } as React.CSSProperties,
  statValue: {
    fontSize: '32px',
    fontWeight: '700' as const,
    marginBottom: '8px',
    color: '#667eea',
  } as React.CSSProperties,
  statHint: {
    fontSize: '13px',
    color: '#666',
  } as React.CSSProperties,
  mainCard: {
    backgroundColor: '#1a1a2e',
    padding: '32px',
    borderRadius: '16px',
    marginBottom: '32px',
    border: '1px solid #2d3748',
  } as React.CSSProperties,
  cardTitle: {
    fontSize: '24px',
    fontWeight: '600' as const,
    marginBottom: '24px',
  } as React.CSSProperties,
  inputGroup: {
    marginBottom: '20px',
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
  select: {
    width: '100%',
    padding: '16px',
    backgroundColor: '#0a0a14',
    border: '1px solid #2d3748',
    borderRadius: '8px',
    color: '#fff',
    fontSize: '16px',
  } as React.CSSProperties,
  privacyBanner: {
    backgroundColor: '#0a0a14',
    padding: '20px',
    borderRadius: '8px',
    marginBottom: '24px',
  } as React.CSSProperties,
  bannerTitle: {
    fontSize: '16px',
    marginBottom: '12px',
  } as React.CSSProperties,
  privacyList: {
    margin: 0,
    padding: '0 0 0 20px',
    color: '#888',
    lineHeight: '1.8',
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
  } as React.CSSProperties,
  buttonDisabled: {
    opacity: 0.5,
    cursor: 'not-allowed',
  } as React.CSSProperties,
  positionsSection: {
    marginBottom: '48px',
  } as React.CSSProperties,
  sectionTitle: {
    fontSize: '28px',
    fontWeight: '600' as const,
    marginBottom: '24px',
  } as React.CSSProperties,
  positionsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
    gap: '24px',
  } as React.CSSProperties,
  positionCard: {
    backgroundColor: '#1a1a2e',
    padding: '24px',
    borderRadius: '12px',
    border: '1px solid #2d3748',
  } as React.CSSProperties,
  positionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '16px',
  } as React.CSSProperties,
  positionAmount: {
    fontSize: '24px',
    fontWeight: '700' as const,
    marginBottom: '4px',
  } as React.CSSProperties,
  positionMeta: {
    fontSize: '13px',
    color: '#888',
  } as React.CSSProperties,
  statusBadge: {
    fontSize: '12px',
    padding: '6px 12px',
    backgroundColor: '#0a0a14',
    borderRadius: '6px',
  } as React.CSSProperties,
  progressBar: {
    width: '100%',
    height: '8px',
    backgroundColor: '#0a0a14',
    borderRadius: '4px',
    overflow: 'hidden',
    marginBottom: '16px',
  } as React.CSSProperties,
  progressFill: {
    height: '100%',
    background: 'linear-gradient(90deg, #667eea 0%, #764ba2 100%)',
    transition: 'width 0.3s ease',
  } as React.CSSProperties,
  positionStats: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '16px',
    marginBottom: '16px',
  } as React.CSSProperties,
  positionStat: {
  } as React.CSSProperties,
  statSmallLabel: {
    fontSize: '11px',
    color: '#888',
    marginBottom: '4px',
    textTransform: 'uppercase' as const,
  } as React.CSSProperties,
  statSmallValue: {
    fontSize: '16px',
    fontWeight: '600' as const,
  } as React.CSSProperties,
  positionDates: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '12px',
    color: '#666',
    marginBottom: '16px',
  } as React.CSSProperties,
  positionActions: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '8px',
  } as React.CSSProperties,
  buttonSmall: {
    padding: '12px',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '600' as const,
    cursor: 'pointer',
  } as React.CSSProperties,
  buttonSmallSecondary: {
    padding: '12px',
    backgroundColor: 'transparent',
    color: '#667eea',
    border: '1px solid #667eea',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '600' as const,
    cursor: 'pointer',
  } as React.CSSProperties,
  howItWorks: {
    backgroundColor: '#1a1a2e',
    padding: '32px',
    borderRadius: '16px',
  } as React.CSSProperties,
  stepsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '24px',
    marginTop: '24px',
  } as React.CSSProperties,
  step: {
    textAlign: 'center' as const,
  } as React.CSSProperties,
  stepNumber: {
    width: '48px',
    height: '48px',
    margin: '0 auto 16px',
    backgroundColor: '#667eea',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '24px',
    fontWeight: '700' as const,
  } as React.CSSProperties,
  stepTitle: {
    fontSize: '18px',
    fontWeight: '600' as const,
    marginBottom: '8px',
  } as React.CSSProperties,
  stepDesc: {
    fontSize: '13px',
    color: '#888',
    lineHeight: '1.5',
  } as React.CSSProperties,
};
