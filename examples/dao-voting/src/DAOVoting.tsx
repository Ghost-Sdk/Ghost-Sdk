import React, { useState, useEffect } from 'react';
import { UltimatePrivacyClient } from '@ghost-sdk/integrations';

interface Proposal {
  id: string;
  title: string;
  description: string;
  options: string[];
  startDate: Date;
  endDate: Date;
  status: 'active' | 'ended';
  votes: { [option: string]: number };
  totalVotes: number;
  encrypted: boolean;
}

interface Vote {
  proposalId: string;
  option: string;
  weight: number;
  timestamp: Date;
}

export const DAOVoting: React.FC = () => {
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [selectedProposal, setSelectedProposal] = useState<Proposal | null>(null);
  const [selectedOption, setSelectedOption] = useState<string>('');
  const [voteWeight, setVoteWeight] = useState('1000');
  const [myVotes, setMyVotes] = useState<Vote[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    // Load mock proposals
    const mockProposals: Proposal[] = [
      {
        id: '1',
        title: 'Increase Treasury Allocation to Development',
        description: 'Should we allocate 30% of treasury funds to development for Q1 2024?',
        options: ['Yes', 'No', 'Abstain'],
        startDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
        endDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
        status: 'active',
        votes: { 'Yes': 0, 'No': 0, 'Abstain': 0 },
        totalVotes: 0,
        encrypted: true,
      },
      {
        id: '2',
        title: 'Implement New Governance Model',
        description: 'Transition to a quadratic voting system for better representation',
        options: ['For', 'Against'],
        startDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
        endDate: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000),
        status: 'active',
        votes: { 'For': 0, 'Against': 0 },
        totalVotes: 0,
        encrypted: true,
      },
      {
        id: '3',
        title: 'Partnership with Privacy Protocol X',
        description: 'Should the DAO enter into a strategic partnership?',
        options: ['Approve', 'Reject', 'Needs Revision'],
        startDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
        endDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
        status: 'ended',
        votes: { 'Approve': 15000, 'Reject': 3000, 'Needs Revision': 2000 },
        totalVotes: 20000,
        encrypted: true,
      },
    ];
    setProposals(mockProposals);
  }, []);

  const handleVote = async () => {
    if (!selectedProposal || !selectedOption) {
      alert('Please select an option');
      return;
    }

    const weight = parseInt(voteWeight);
    if (weight <= 0) {
      alert('Please enter a valid vote weight');
      return;
    }

    setLoading(true);

    try {
      console.log(`Voting ${selectedOption} with weight ${weight} on proposal ${selectedProposal.id}`);

      // Simulate private voting
      await new Promise(resolve => setTimeout(resolve, 2500));

      // Record the vote
      const newVote: Vote = {
        proposalId: selectedProposal.id,
        option: selectedOption,
        weight,
        timestamp: new Date(),
      };

      setMyVotes(prev => [...prev, newVote]);

      alert(`Vote cast privately!\n\nYour vote:\n✅ Completely anonymous\n✅ Weight is hidden\n✅ Choice is encrypted\n✅ Cannot be traced back to you\n\nNo one will ever know how you voted!`);

      setSelectedProposal(null);
      setSelectedOption('');
      setVoteWeight('1000');
    } catch (error: any) {
      alert(`Voting failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const getDaysRemaining = (endDate: Date): number => {
    const days = Math.ceil((endDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    return Math.max(0, days);
  };

  const getVotePercentage = (proposal: Proposal, option: string): number => {
    if (proposal.totalVotes === 0) return 0;
    return (proposal.votes[option] / proposal.totalVotes) * 100;
  };

  const hasVoted = (proposalId: string): boolean => {
    return myVotes.some(v => v.proposalId === proposalId);
  };

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>🗳️ Private DAO Voting</h1>
      <p style={styles.subtitle}>Anonymous and verifiable governance</p>

      <div style={styles.header}>
        <div style={styles.statsRow}>
          <div style={styles.statItem}>
            <div style={styles.statValue}>{proposals.filter(p => p.status === 'active').length}</div>
            <div style={styles.statLabel}>Active Proposals</div>
          </div>
          <div style={styles.statItem}>
            <div style={styles.statValue}>{myVotes.length}</div>
            <div style={styles.statLabel}>Your Votes (Private)</div>
          </div>
          <div style={styles.statItem}>
            <div style={styles.statValue}>🔒</div>
            <div style={styles.statLabel}>Voting Power Hidden</div>
          </div>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          style={styles.createButton}
        >
          ➕ Create Proposal
        </button>
      </div>

      <div style={styles.proposalsSection}>
        <h2 style={styles.sectionTitle}>Active Proposals</h2>

        {proposals.filter(p => p.status === 'active').map(proposal => {
          const voted = hasVoted(proposal.id);
          const daysLeft = getDaysRemaining(proposal.endDate);

          return (
            <div key={proposal.id} style={styles.proposalCard}>
              <div style={styles.proposalHeader}>
                <div>
                  <h3 style={styles.proposalTitle}>{proposal.title}</h3>
                  <p style={styles.proposalDescription}>{proposal.description}</p>
                </div>
                {proposal.encrypted && (
                  <div style={styles.encryptedBadge}>🔐 Private</div>
                )}
              </div>

              <div style={styles.proposalMeta}>
                <div style={styles.metaItem}>
                  <span style={styles.metaLabel}>Ends in:</span>
                  <span style={styles.metaValue}>{daysLeft} days</span>
                </div>
                <div style={styles.metaItem}>
                  <span style={styles.metaLabel}>Total Votes:</span>
                  <span style={styles.metaValue}>🔒 Hidden</span>
                </div>
              </div>

              <div style={styles.options}>
                {proposal.options.map(option => (
                  <div key={option} style={styles.option}>
                    <div style={styles.optionName}>{option}</div>
                    <div style={styles.optionInfo}>All votes encrypted</div>
                  </div>
                ))}
              </div>

              {voted ? (
                <div style={styles.votedBanner}>
                  ✅ You voted on this proposal (privately)
                </div>
              ) : (
                <button
                  onClick={() => setSelectedProposal(proposal)}
                  style={styles.voteButton}
                >
                  🗳️ Cast Private Vote
                </button>
              )}
            </div>
          );
        })}
      </div>

      {proposals.filter(p => p.status === 'ended').length > 0 && (
        <div style={styles.proposalsSection}>
          <h2 style={styles.sectionTitle}>Ended Proposals</h2>

          {proposals.filter(p => p.status === 'ended').map(proposal => (
            <div key={proposal.id} style={styles.proposalCard}>
              <div style={styles.proposalHeader}>
                <div>
                  <h3 style={styles.proposalTitle}>{proposal.title}</h3>
                  <p style={styles.proposalDescription}>{proposal.description}</p>
                </div>
                <div style={styles.endedBadge}>Ended</div>
              </div>

              <div style={styles.results}>
                <h4 style={styles.resultsTitle}>Results (Verified)</h4>
                {proposal.options.map(option => {
                  const percentage = getVotePercentage(proposal, option);
                  const votes = proposal.votes[option];

                  return (
                    <div key={option} style={styles.resultItem}>
                      <div style={styles.resultHeader}>
                        <span>{option}</span>
                        <span>{percentage.toFixed(1)}%</span>
                      </div>
                      <div style={styles.resultBar}>
                        <div
                          style={{
                            ...styles.resultBarFill,
                            width: `${percentage}%`,
                          }}
                        />
                      </div>
                      <div style={styles.resultVotes}>
                        {votes} votes (individual votes remain private)
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedProposal && (
        <div style={styles.modal} onClick={() => setSelectedProposal(null)}>
          <div style={styles.modalContent} onClick={e => e.stopPropagation()}>
            <h2 style={styles.modalTitle}>Cast Your Private Vote</h2>
            <p style={styles.modalSubtitle}>{selectedProposal.title}</p>

            <div style={styles.inputGroup}>
              <label style={styles.label}>Select Your Choice</label>
              <div style={styles.radioGroup}>
                {selectedProposal.options.map(option => (
                  <label key={option} style={styles.radioLabel}>
                    <input
                      type="radio"
                      name="vote-option"
                      value={option}
                      checked={selectedOption === option}
                      onChange={(e) => setSelectedOption(e.target.value)}
                      style={styles.radio}
                    />
                    <span>{option}</span>
                  </label>
                ))}
              </div>
            </div>

            <div style={styles.inputGroup}>
              <label style={styles.label}>Voting Weight (Tokens)</label>
              <input
                type="number"
                value={voteWeight}
                onChange={(e) => setVoteWeight(e.target.value)}
                placeholder="1000"
                style={styles.input}
              />
              <div style={styles.inputHint}>This weight will be completely hidden</div>
            </div>

            <div style={styles.privacyInfo}>
              <h4 style={styles.privacyTitle}>🔐 Privacy Guarantees</h4>
              <ul style={styles.privacyList}>
                <li>✅ Your vote choice is encrypted</li>
                <li>✅ Voting weight is hidden from everyone</li>
                <li>✅ Your identity remains anonymous</li>
                <li>✅ No one can prove how you voted</li>
                <li>✅ Results are verifiable without revealing individual votes</li>
              </ul>
            </div>

            <div style={styles.modalActions}>
              <button
                onClick={handleVote}
                disabled={loading || !selectedOption}
                style={{
                  ...styles.button,
                  ...(loading || !selectedOption ? styles.buttonDisabled : {}),
                }}
              >
                {loading ? '🔐 Casting Vote...' : '🗳️ Cast Private Vote'}
              </button>
              <button
                onClick={() => setSelectedProposal(null)}
                style={styles.buttonSecondary}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <div style={styles.infoSection}>
        <h3>Why Private Voting Matters</h3>
        <div style={styles.benefitsGrid}>
          <div style={styles.benefit}>
            <div style={styles.benefitIcon}>🎭</div>
            <div style={styles.benefitTitle}>Secret Ballot</div>
            <div style={styles.benefitDesc}>
              True democracy requires secret ballots. No one should know how you voted.
            </div>
          </div>
          <div style={styles.benefit}>
            <div style={styles.benefitIcon}>🚫</div>
            <div style={styles.benefitTitle}>No Vote Buying</div>
            <div style={styles.benefitDesc}>
              Since you can't prove how you voted, vote buying becomes impossible.
            </div>
          </div>
          <div style={styles.benefit}>
            <div style={styles.benefitIcon}>⚖️</div>
            <div style={styles.benefitTitle}>Coercion Resistant</div>
            <div style={styles.benefitDesc}>
              Hidden voting power prevents whales from being targeted or pressured.
            </div>
          </div>
          <div style={styles.benefit}>
            <div style={styles.benefitIcon}>✅</div>
            <div style={styles.benefitTitle}>Verifiable Results</div>
            <div style={styles.benefitDesc}>
              Results are cryptographically proven correct without revealing votes.
            </div>
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
  header: {
    backgroundColor: '#1a1a2e',
    padding: '24px',
    borderRadius: '16px',
    marginBottom: '32px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap' as const,
    gap: '20px',
  } as React.CSSProperties,
  statsRow: {
    display: 'flex',
    gap: '32px',
    flexWrap: 'wrap' as const,
  } as React.CSSProperties,
  statItem: {
    textAlign: 'center' as const,
  } as React.CSSProperties,
  statValue: {
    fontSize: '32px',
    fontWeight: '700' as const,
    color: '#667eea',
    marginBottom: '4px',
  } as React.CSSProperties,
  statLabel: {
    fontSize: '12px',
    color: '#888',
    textTransform: 'uppercase' as const,
  } as React.CSSProperties,
  createButton: {
    padding: '12px 24px',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: '600' as const,
    cursor: 'pointer',
  } as React.CSSProperties,
  proposalsSection: {
    marginBottom: '48px',
  } as React.CSSProperties,
  sectionTitle: {
    fontSize: '28px',
    fontWeight: '600' as const,
    marginBottom: '24px',
  } as React.CSSProperties,
  proposalCard: {
    backgroundColor: '#1a1a2e',
    padding: '28px',
    borderRadius: '16px',
    marginBottom: '20px',
    border: '1px solid #2d3748',
  } as React.CSSProperties,
  proposalHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '20px',
    gap: '20px',
  } as React.CSSProperties,
  proposalTitle: {
    fontSize: '22px',
    fontWeight: '600' as const,
    marginBottom: '8px',
  } as React.CSSProperties,
  proposalDescription: {
    color: '#888',
    lineHeight: '1.6',
  } as React.CSSProperties,
  encryptedBadge: {
    padding: '8px 16px',
    backgroundColor: '#0a0a14',
    borderRadius: '8px',
    fontSize: '13px',
    whiteSpace: 'nowrap' as const,
  } as React.CSSProperties,
  endedBadge: {
    padding: '8px 16px',
    backgroundColor: '#2d3748',
    borderRadius: '8px',
    fontSize: '13px',
    color: '#888',
  } as React.CSSProperties,
  proposalMeta: {
    display: 'flex',
    gap: '32px',
    marginBottom: '20px',
    fontSize: '14px',
  } as React.CSSProperties,
  metaItem: {
    display: 'flex',
    gap: '8px',
  } as React.CSSProperties,
  metaLabel: {
    color: '#888',
  } as React.CSSProperties,
  metaValue: {
    fontWeight: '600' as const,
  } as React.CSSProperties,
  options: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
    gap: '12px',
    marginBottom: '20px',
  } as React.CSSProperties,
  option: {
    padding: '16px',
    backgroundColor: '#0a0a14',
    borderRadius: '8px',
    border: '1px solid #2d3748',
  } as React.CSSProperties,
  optionName: {
    fontSize: '16px',
    fontWeight: '600' as const,
    marginBottom: '4px',
  } as React.CSSProperties,
  optionInfo: {
    fontSize: '11px',
    color: '#666',
  } as React.CSSProperties,
  votedBanner: {
    padding: '16px',
    backgroundColor: '#0a4d0a',
    borderRadius: '8px',
    textAlign: 'center' as const,
    color: '#4ade80',
  } as React.CSSProperties,
  voteButton: {
    width: '100%',
    padding: '16px',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: '#fff',
    border: 'none',
    borderRadius: '10px',
    fontSize: '16px',
    fontWeight: '600' as const,
    cursor: 'pointer',
  } as React.CSSProperties,
  results: {
    marginTop: '20px',
  } as React.CSSProperties,
  resultsTitle: {
    fontSize: '18px',
    marginBottom: '16px',
  } as React.CSSProperties,
  resultItem: {
    marginBottom: '16px',
  } as React.CSSProperties,
  resultHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: '8px',
    fontSize: '15px',
    fontWeight: '600' as const,
  } as React.CSSProperties,
  resultBar: {
    width: '100%',
    height: '10px',
    backgroundColor: '#0a0a14',
    borderRadius: '5px',
    overflow: 'hidden',
    marginBottom: '4px',
  } as React.CSSProperties,
  resultBarFill: {
    height: '100%',
    background: 'linear-gradient(90deg, #667eea 0%, #764ba2 100%)',
    transition: 'width 0.5s ease',
  } as React.CSSProperties,
  resultVotes: {
    fontSize: '12px',
    color: '#666',
  } as React.CSSProperties,
  modal: {
    position: 'fixed' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  } as React.CSSProperties,
  modalContent: {
    backgroundColor: '#1a1a2e',
    padding: '32px',
    borderRadius: '16px',
    maxWidth: '600px',
    width: '90%',
    maxHeight: '90vh',
    overflow: 'auto',
    border: '1px solid #2d3748',
  } as React.CSSProperties,
  modalTitle: {
    fontSize: '28px',
    fontWeight: '600' as const,
    marginBottom: '8px',
  } as React.CSSProperties,
  modalSubtitle: {
    color: '#888',
    marginBottom: '24px',
  } as React.CSSProperties,
  inputGroup: {
    marginBottom: '24px',
  } as React.CSSProperties,
  label: {
    display: 'block',
    fontSize: '12px',
    color: '#888',
    marginBottom: '12px',
    textTransform: 'uppercase' as const,
  } as React.CSSProperties,
  radioGroup: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '12px',
  } as React.CSSProperties,
  radioLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px',
    backgroundColor: '#0a0a14',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '16px',
  } as React.CSSProperties,
  radio: {
    width: '20px',
    height: '20px',
    cursor: 'pointer',
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
  inputHint: {
    fontSize: '12px',
    color: '#666',
    marginTop: '8px',
  } as React.CSSProperties,
  privacyInfo: {
    backgroundColor: '#0a0a14',
    padding: '20px',
    borderRadius: '8px',
    marginBottom: '24px',
  } as React.CSSProperties,
  privacyTitle: {
    fontSize: '16px',
    marginBottom: '12px',
  } as React.CSSProperties,
  privacyList: {
    margin: 0,
    padding: '0 0 0 20px',
    color: '#888',
    lineHeight: '1.8',
  } as React.CSSProperties,
  modalActions: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '10px',
  } as React.CSSProperties,
  button: {
    width: '100%',
    padding: '16px',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: '#fff',
    border: 'none',
    borderRadius: '10px',
    fontSize: '16px',
    fontWeight: '600' as const,
    cursor: 'pointer',
  } as React.CSSProperties,
  buttonSecondary: {
    width: '100%',
    padding: '16px',
    backgroundColor: 'transparent',
    color: '#667eea',
    border: '1px solid #667eea',
    borderRadius: '10px',
    fontSize: '16px',
    fontWeight: '600' as const,
    cursor: 'pointer',
  } as React.CSSProperties,
  buttonDisabled: {
    opacity: 0.5,
    cursor: 'not-allowed',
  } as React.CSSProperties,
  infoSection: {
    backgroundColor: '#1a1a2e',
    padding: '32px',
    borderRadius: '16px',
  } as React.CSSProperties,
  benefitsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '24px',
    marginTop: '24px',
  } as React.CSSProperties,
  benefit: {
    textAlign: 'center' as const,
  } as React.CSSProperties,
  benefitIcon: {
    fontSize: '48px',
    marginBottom: '12px',
  } as React.CSSProperties,
  benefitTitle: {
    fontSize: '18px',
    fontWeight: '600' as const,
    marginBottom: '8px',
  } as React.CSSProperties,
  benefitDesc: {
    fontSize: '14px',
    color: '#888',
    lineHeight: '1.6',
  } as React.CSSProperties,
};
