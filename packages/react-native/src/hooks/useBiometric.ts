import { useState, useEffect } from 'react';
import ReactNativeBiometrics from 'react-native-biometrics';

const rnBiometrics = new ReactNativeBiometrics();

export function useBiometric() {
  const [isAvailable, setIsAvailable] = useState(false);
  const [biometricType, setBiometricType] = useState<string | null>(null);

  useEffect(() => {
    checkAvailability();
  }, []);

  const checkAvailability = async () => {
    try {
      const { available, biometryType } = await rnBiometrics.isSensorAvailable();
      setIsAvailable(available);
      setBiometricType(biometryType || null);
    } catch (error) {
      console.error('Biometric check failed:', error);
      setIsAvailable(false);
    }
  };

  const authenticate = async (promptMessage: string = 'Authenticate'): Promise<boolean> => {
    if (!isAvailable) {
      return false;
    }

    try {
      const { success } = await rnBiometrics.simplePrompt({
        promptMessage,
        cancelButtonText: 'Cancel',
      });
      return success;
    } catch (error) {
      console.error('Authentication failed:', error);
      return false;
    }
  };

  return {
    isAvailable,
    biometricType,
    authenticate,
  };
}
