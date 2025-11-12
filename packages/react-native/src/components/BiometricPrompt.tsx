import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal } from 'react-native';
import { useBiometric } from '../hooks/useBiometric';

export interface BiometricPromptProps {
  onSuccess: () => void;
  onCancel: () => void;
  message?: string;
}

export const BiometricPrompt: React.FC<BiometricPromptProps> = ({
  onSuccess,
  onCancel,
  message = 'Authenticate to continue',
}) => {
  const { authenticate, biometricType } = useBiometric();

  useEffect(() => {
    handleAuthenticate();
  }, []);

  const handleAuthenticate = async () => {
    try {
      const success = await authenticate(message);
      if (success) {
        onSuccess();
      } else {
        onCancel();
      }
    } catch (error) {
      onCancel();
    }
  };

  const getBiometricIcon = () => {
    switch (biometricType) {
      case 'FaceID':
        return '👤';
      case 'TouchID':
      case 'Fingerprint':
        return '👆';
      default:
        return '🔐';
    }
  };

  return (
    <Modal transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <Text style={styles.icon}>{getBiometricIcon()}</Text>
          <Text style={styles.title}>
            {biometricType === 'FaceID' ? 'Face ID' :
             biometricType === 'TouchID' ? 'Touch ID' :
             'Biometric Authentication'}
          </Text>
          <Text style={styles.message}>{message}</Text>

          <TouchableOpacity style={styles.cancelButton} onPress={onCancel}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modal: {
    backgroundColor: '#1a1a2e',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    maxWidth: 320,
    width: '80%',
  },
  icon: {
    fontSize: 64,
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 8,
  },
  message: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
    marginBottom: 24,
  },
  cancelButton: {
    padding: 12,
  },
  cancelText: {
    color: '#667eea',
    fontSize: 16,
    fontWeight: '600',
  },
});
