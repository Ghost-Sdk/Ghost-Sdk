import React from 'react';
import { ProofStatus as ProofStatusType } from '../types';

export interface ProofStatusProps {
  status: ProofStatusType;
  progress?: number;
  theme?: 'dark' | 'light';
}

export const ProofStatus: React.FC<ProofStatusProps> = ({ status, progress = 0, theme = 'dark' }) => {
  const isDark = theme === 'dark';

  const styles = {
    container: {
      padding: '16px',
      backgroundColor: isDark ? '#0a0a14' : '#f5f5f5',
      borderRadius: '8px',
      border: `1px solid ${isDark ? '#2d3748' : '#e0e0e0'}`,
    },
    header: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: '12px',
    },
    title: {
      fontSize: '14px',
      fontWeight: '600',
      color: isDark ? '#fff' : '#000',
    },
    percentage: {
      fontSize: '14px',
      color: isDark ? '#888' : '#666',
    },
    progressBar: {
      width: '100%',
      height: '8px',
      backgroundColor: isDark ? '#1a1a2e' : '#e0e0e0',
      borderRadius: '4px',
      overflow: 'hidden',
    },
    progressFill: {
      height: '100%',
      background: 'linear-gradient(90deg, #667eea 0%, #764ba2 100%)',
      transition: 'width 0.3s ease',
    },
    steps: {
      marginTop: '12px',
      fontSize: '12px',
      color: isDark ? '#888' : '#666',
      display: 'flex',
      flexDirection: 'column' as const,
      gap: '4px',
    },
    step: {
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
    },
  };

  const getSteps = () => {
    const steps = [
      { name: 'Preparing inputs', complete: progress > 10 },
      { name: 'Computing witness', complete: progress > 30 },
      { name: 'Generating proof', complete: progress > 60 },
      { name: 'Verifying proof', complete: progress > 90 },
    ];

    return steps;
  };

  if (status === 'idle') return null;

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div style={styles.title}>🔐 Generating ZK Proof</div>
        <div style={styles.percentage}>{Math.round(progress)}%</div>
      </div>

      <div style={styles.progressBar}>
        <div style={{ ...styles.progressFill, width: `${progress}%` }} />
      </div>

      {status === 'generating' && (
        <div style={styles.steps}>
          {getSteps().map((step, index) => (
            <div key={index} style={styles.step}>
              <span>{step.complete ? '✅' : '⏳'}</span>
              <span>{step.name}</span>
            </div>
          ))}
        </div>
      )}

      {status === 'success' && (
        <div style={{ ...styles.steps, color: '#50fa7b' }}>
          ✅ Proof generated successfully
        </div>
      )}

      {status === 'error' && (
        <div style={{ ...styles.steps, color: '#ff5555' }}>
          ❌ Failed to generate proof
        </div>
      )}
    </div>
  );
};
