import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useGhost } from '../hooks/useGhost';
import { usePrivateBalance } from '../hooks/usePrivateBalance';
import { usePrivateTransfer } from '../hooks/usePrivateTransfer';
import { useBiometric } from '../hooks/useBiometric';
import { BiometricPrompt } from './BiometricPrompt';
import { BalanceCard } from './BalanceCard';

export interface PrivateWalletProps {
  theme?: 'dark' | 'light';
  enableBiometric?: boolean;
}

export const PrivateWallet: React.FC<PrivateWalletProps> = ({
  theme = 'dark',
  enableBiometric = true,
}) => {
  const { client, connected, connecting, initialize } = useGhost();
  const { balance, loading: balanceLoading, refresh } = usePrivateBalance(client);
  const { transfer, status, error } = usePrivateTransfer(client);
  const { authenticate, isAvailable: biometricAvailable } = useBiometric();

  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [memo, setMemo] = useState('');
  const [showBiometric, setShowBiometric] = useState(false);

  const isDark = theme === 'dark';

  const handleTransfer = async () => {
    if (!recipient || !amount) {
      alert('Please enter recipient and amount');
      return;
    }

    // Require biometric if enabled
    if (enableBiometric && biometricAvailable) {
      setShowBiometric(true);
      return;
    }

    await executeTransfer();
  };

  const executeTransfer = async () => {
    try {
      const amountLamports = BigInt(parseFloat(amount) * 1_000_000_000);
      await transfer({ recipient, amount: amountLamports, memo });

      // Reset form
      setRecipient('');
      setAmount('');
      setMemo('');
      setShowBiometric(false);

      // Refresh balance
      await refresh();
    } catch (error: any) {
      alert(`Transfer failed: ${error.message}`);
    }
  };

  const onBiometricSuccess = async () => {
    setShowBiometric(false);
    await executeTransfer();
  };

  if (!connected) {
    return (
      <View style={[styles.container, isDark && styles.containerDark]}>
        <View style={styles.centerContent}>
          <Text style={[styles.title, isDark && styles.textDark]}>
            👻 Connect Your Wallet
          </Text>
          <Text style={[styles.subtitle, isDark && styles.textMuted]}>
            Connect a Solana wallet to continue
          </Text>
          {connecting && <ActivityIndicator size="large" style={{ marginTop: 20 }} />}
        </View>
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.container, isDark && styles.containerDark]}
      contentContainerStyle={styles.scrollContent}
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.title, isDark && styles.textDark]}>
          👻 Ghost Wallet
        </Text>
        <Text style={[styles.subtitle, isDark && styles.textMuted]}>
          Private transactions on Solana
        </Text>
      </View>

      {/* Balance Card */}
      <BalanceCard balance={balance} loading={balanceLoading} onRefresh={refresh} theme={theme} />

      {/* Transfer Form */}
      <View style={[styles.card, isDark && styles.cardDark]}>
        <Text style={[styles.cardTitle, isDark && styles.textDark]}>Send Privately</Text>

        <View style={styles.inputGroup}>
          <Text style={[styles.label, isDark && styles.textMuted]}>Recipient</Text>
          <TextInput
            style={[styles.input, isDark && styles.inputDark]}
            value={recipient}
            onChangeText={setRecipient}
            placeholder="Address or Monero-style address"
            placeholderTextColor={isDark ? '#666' : '#999'}
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={[styles.label, isDark && styles.textMuted]}>Amount (SOL)</Text>
          <TextInput
            style={[styles.input, isDark && styles.inputDark]}
            value={amount}
            onChangeText={setAmount}
            placeholder="0.00"
            placeholderTextColor={isDark ? '#666' : '#999'}
            keyboardType="decimal-pad"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={[styles.label, isDark && styles.textMuted]}>Memo (Optional)</Text>
          <TextInput
            style={[styles.input, isDark && styles.inputDark]}
            value={memo}
            onChangeText={setMemo}
            placeholder="Private message (encrypted)"
            placeholderTextColor={isDark ? '#666' : '#999'}
            multiline
          />
        </View>

        <TouchableOpacity
          style={[
            styles.button,
            status === 'generating' && styles.buttonDisabled,
            !recipient || !amount ? styles.buttonDisabled : null,
          ]}
          onPress={handleTransfer}
          disabled={status === 'generating' || !recipient || !amount}
        >
          <Text style={styles.buttonText}>
            {status === 'generating' ? '🔐 Generating Proof...' : '🚀 Send Privately'}
          </Text>
        </TouchableOpacity>

        {status === 'generating' && (
          <ActivityIndicator size="small" style={{ marginTop: 16 }} />
        )}

        {error && (
          <Text style={styles.errorText}>Error: {error.message}</Text>
        )}

        {status === 'success' && (
          <Text style={styles.successText}>✅ Transfer successful!</Text>
        )}

        {/* Privacy Features */}
        <View style={styles.features}>
          <Text style={[styles.feature, isDark && styles.textMuted]}>✅ Hidden sender</Text>
          <Text style={[styles.feature, isDark && styles.textMuted]}>✅ Hidden amount</Text>
          <Text style={[styles.feature, isDark && styles.textMuted]}>✅ Hidden recipient</Text>
          <Text style={[styles.feature, isDark && styles.textMuted]}>✅ ZK proof</Text>
        </View>
      </View>

      {/* Biometric Prompt */}
      {showBiometric && (
        <BiometricPrompt
          onSuccess={onBiometricSuccess}
          onCancel={() => setShowBiometric(false)}
          message="Authenticate to send private transaction"
        />
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  containerDark: {
    backgroundColor: '#0f0f1e',
  },
  scrollContent: {
    padding: 20,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#000',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
  },
  textDark: {
    color: '#fff',
  },
  textMuted: {
    color: '#888',
  },
  card: {
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
  },
  cardDark: {
    backgroundColor: '#1a1a2e',
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
    color: '#000',
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8,
    color: '#666',
    textTransform: 'uppercase',
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#000',
  },
  inputDark: {
    backgroundColor: '#0a0a14',
    borderColor: '#2d3748',
    color: '#fff',
  },
  button: {
    backgroundColor: '#667eea',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: {
    backgroundColor: '#4a5568',
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  features: {
    marginTop: 16,
    gap: 8,
  },
  feature: {
    fontSize: 12,
    color: '#666',
  },
  errorText: {
    color: '#ff5555',
    fontSize: 14,
    marginTop: 12,
  },
  successText: {
    color: '#50fa7b',
    fontSize: 14,
    marginTop: 12,
  },
});
