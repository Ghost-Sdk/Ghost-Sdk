# 📱 @ghost-sdk/react-native

Ghost SDK for React Native - Privacy on iOS & Android!

## Features

- ✅ **iOS & Android Support** - Works on both platforms
- ✅ **Biometric Authentication** - Face ID / Touch ID / Fingerprint
- ✅ **Secure Storage** - Keychain integration
- ✅ **Complete Privacy** - All Ghost SDK features
- ✅ **Beautiful UI** - Pre-built components
- ✅ **TypeScript** - Full type safety

## Installation

```bash
npm install @ghost-sdk/react-native

# iOS
cd ios && pod install

# Android
# No additional steps needed
```

### iOS Setup

Add to `Info.plist`:
```xml
<key>NSFaceIDUsageDescription</key>
<string>Authenticate to send private transactions</string>
```

### Android Setup

Add to `AndroidManifest.xml`:
```xml
<uses-permission android:name="android.permission.USE_BIOMETRIC" />
```

## Quick Start

### Option 1: Drop-in Component (Easiest!)

```tsx
import { PrivateWallet } from '@ghost-sdk/react-native';

export default function App() {
  return <PrivateWallet enableBiometric />;
}
```

That's it! Full privacy wallet in 1 line!

### Option 2: Custom UI with Hooks

```tsx
import {
  useGhost,
  usePrivateBalance,
  usePrivateTransfer,
  useBiometric,
} from '@ghost-sdk/react-native';

export default function CustomWallet() {
  const { client, connected } = useGhost();
  const { balance, refresh } = usePrivateBalance(client);
  const { transfer, status } = usePrivateTransfer(client);
  const { authenticate } = useBiometric();

  const handleSend = async () => {
    const authenticated = await authenticate('Send private transaction');
    if (authenticated) {
      await transfer({
        recipient: 'ADDRESS',
        amount: 1_000_000_000n,
      });
    }
  };

  return (
    <View>
      <Text>Balance: {balance} SOL (Hidden)</Text>
      <Button title="Send" onPress={handleSend} />
    </View>
  );
}
```

## Components

### PrivateWallet
Complete wallet UI with all features:
```tsx
<PrivateWallet
  theme="dark"
  enableBiometric
/>
```

### BiometricPrompt
Biometric authentication modal:
```tsx
<BiometricPrompt
  onSuccess={() => console.log('Authenticated!')}
  onCancel={() => console.log('Cancelled')}
  message="Authenticate to send"
/>
```

### BalanceCard
Beautiful balance display:
```tsx
<BalanceCard
  balance={balance}
  loading={loading}
  onRefresh={refresh}
  theme="dark"
/>
```

## Hooks

### useGhost
Main hook for Ghost SDK:
```tsx
const { client, connected, connecting, initialize } = useGhost();
```

### usePrivateBalance
Get private balance:
```tsx
const { balance, loading, error, refresh } = usePrivateBalance(client);
```

### usePrivateTransfer
Send private transfers:
```tsx
const { transfer, status, error, reset } = usePrivateTransfer(client);

await transfer({
  recipient: 'ADDRESS',
  amount: 1_000_000_000n,
  memo: 'Coffee',
});
```

### useBiometric
Biometric authentication:
```tsx
const { isAvailable, biometricType, authenticate } = useBiometric();

const success = await authenticate('Authenticate');
if (success) {
  // Proceed
}
```

### useSecureStorage
Secure key storage:
```tsx
const { save, load, remove } = useSecureStorage();

await save('privateKey', key);
const key = await load('privateKey');
await remove('privateKey');
```

## Features

### Biometric Authentication
```tsx
import { useBiometric } from '@ghost-sdk/react-native';

const { authenticate, biometricType } = useBiometric();

// Shows Face ID / Touch ID / Fingerprint
const success = await authenticate('Send transaction');
```

Supports:
- **iOS**: Face ID, Touch ID
- **Android**: Fingerprint, Face unlock

### Secure Storage
```tsx
import { useSecureStorage } from '@ghost-sdk/react-native';

const { save, load } = useSecureStorage();

// Store private keys securely
await save('ghost_key', privateKey);

// Retrieve securely
const key = await load('ghost_key');
```

Uses:
- **iOS**: Keychain Services
- **Android**: Android Keystore

### QR Code Scanner
```tsx
import { QRScanner } from '@ghost-sdk/react-native';

<QRScanner
  onScan={(address) => setRecipient(address)}
  onClose={() => setShowScanner(false)}
/>
```

### Push Notifications
```tsx
import { usePushNotifications } from '@ghost-sdk/react-native';

const { subscribe, unsubscribe } = usePushNotifications();

await subscribe('transaction_received');
```

## Platform-Specific Features

### iOS
- ✅ Face ID / Touch ID
- ✅ Haptic feedback
- ✅ Native animations
- ✅ Widget support (coming soon)

### Android
- ✅ Fingerprint / Face unlock
- ✅ Material Design
- ✅ Back gesture support
- ✅ Widget support (coming soon)

## Examples

### Basic Transfer
```tsx
import { PrivateWallet } from '@ghost-sdk/react-native';

export default () => <PrivateWallet />;
```

### With Biometric
```tsx
const { transfer } = usePrivateTransfer(client);
const { authenticate } = useBiometric();

const handleSend = async () => {
  const auth = await authenticate('Confirm transaction');
  if (auth) {
    await transfer({ recipient, amount });
  }
};
```

### Custom Theme
```tsx
<PrivateWallet
  theme="light"
  enableBiometric
  customStyles={{
    primaryColor: '#667eea',
    backgroundColor: '#ffffff',
  }}
/>
```

## Performance

- ✅ Fast (60 FPS animations)
- ✅ Small bundle (<1MB)
- ✅ Optimized for mobile
- ✅ Works offline (local proofs)

## Security

- ✅ Biometric authentication
- ✅ Secure keychain storage
- ✅ No keys in memory
- ✅ Auto-lock after inactivity
- ✅ Jailbreak/root detection

## Troubleshooting

### iOS Build Issues
```bash
cd ios && pod install
npx react-native run-ios
```

### Android Build Issues
```bash
cd android && ./gradlew clean
npx react-native run-android
```

### Biometric Not Working
1. Check permissions in Info.plist/AndroidManifest.xml
2. Test on real device (not simulator)
3. Ensure biometric is set up on device

## Roadmap

- [ ] Widgets (iOS & Android)
- [ ] WatchOS support
- [ ] Android Wear support
- [ ] Siri shortcuts
- [ ] Share extensions
- [ ] Background tx monitoring

## License

MIT

---

**Built with ❤️ for mobile by Ghost SDK** 📱👻
