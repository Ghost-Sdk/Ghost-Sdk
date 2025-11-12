<div align="center">

```
   ▄████  ██░ ██  ▒█████    ██████ ▄▄▄█████▓
  ██▒ ▀█▒▓██░ ██▒▒██▒  ██▒▒██    ▒ ▓  ██▒ ▓▒
 ▒██░▄▄▄░▒██▀▀██░▒██░  ██▒░ ▓██▄   ▒ ▓██░ ▒░
 ░▓█  ██▓░▓█ ░██ ▒██   ██░  ▒   ██▒░ ▓██▓ ░
 ░▒▓███▀▒░▓█▒░██▓░ ████▓▒░▒██████▒▒  ▒██▒ ░
  ░▒   ▒  ▒ ░░▒░▒░ ▒░▒░▒░ ▒ ▒▓▒ ▒ ░  ▒ ░░
   ░   ░  ▒ ░▒░ ░  ░ ▒ ▒░ ░ ░▒  ░ ░    ░
 ░ ░   ░  ░  ░░ ░░ ░ ░ ▒  ░  ░  ░    ░
       ░  ░  ░  ░    ░ ░        ░
```

# Ghost Privacy Protocol

** zero-knowledge privacy protocol for Solana**

Groth16 ZK-SNARKs • Poseidon Hashing • MLSAG Ring Signatures

</div>

## ⚠️ Development Status

**ALPHA - NOT AUDITED - DO NOT USE WITH REAL FUNDS**

This is an early-stage privacy protocol implementation. Core cryptographic components are implemented, but the system requires:
- Security audit by professional auditors
- Extensive testing on devnet
- Trusted setup ceremony for production keys
- Integration testing across all components

## 🔐 What's Implemented (Production-Ready Core)

### ✅ Solana Program (`programs/ghost-privacy/`)
- **Real Groth16 verification** using `ark-groth16` library
- **MLSAG ring signature verification** (Monero-style)
- PDA-based nullifier storage architecture (O(1) lookup, unlimited scalability)
- Complete instruction set: InitializePool, Deposit, Withdraw, PrivateTransfer, VerifyBalance
- Proper error handling and input validation

### ✅ Circom Circuits (`circuits/`)
- **transfer.circom** - Private transfer circuit with Poseidon hashing (130 lines)
- **balance.circom** - Balance proof circuit (54 lines)
- **ring_signature.circom** - Ring signature circuit with 11 members (128 lines)
- All circuits compiled with proving/verification keys generated

### ✅ TypeScript SDK (`privacy-integration/`)
- **merkletree.ts** - Poseidon-based Merkle tree (20 levels)
- **note-manager.ts** - UTXO-style note management with Poseidon commitments
- **zkproof.ts** - Groth16 proof generation using snarkjs
- **relayer-service.ts** - Anonymous transaction relay with security hardening
- **privacy-sdk.ts** - Complete integration layer
- **solana-client.ts** - Solana transaction builder

### ✅ Core Package (`packages/core/`)
- GhostClient with Poseidon cryptography
- Commitment/nullifier generation
- ZK proof integration

## 🏗️ Architecture

**Off-chain:**
- Full Poseidon Merkle tree maintained by clients
- ZK proof generation using snarkjs
- Note database for UTXO tracking

**On-chain:**
- Merkle root storage only (not full tree)
- ark-groth16 proof verification
- PDA-based nullifier accounts (unlimited scalability)

This architecture follows established privacy protocols (Tornado Cash, Zcash):
- Minimizes on-chain computation
- Enables unlimited transaction throughput
- Maintains strong privacy guarantees

## 🚀 Quick Start

### Prerequisites
```bash
# Install Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Install Solana CLI
sh -c "$(curl -sSfL https://release.solana.com/stable/install)"

# Install Node.js dependencies
cd privacy-integration && npm install
cd ../circuits && npm install
```

### Build Circuits
```bash
cd circuits
./build.sh  # Unix/Mac
# or
build-circuits.bat  # Windows
```

### Run Trusted Setup Ceremony (PRODUCTION)

**Real multi-party ceremony with independent participants:**

```bash
cd ceremony-coordinator
npm install
npm start  # Coordinator server on http://localhost:4000
```

Participants use the CLI tool:
```bash
npm run participant
```

See `ceremony-coordinator/README.md` for complete setup and usage guide.

### Deploy Program
```bash
cd programs/ghost-privacy
cargo build-bpf
solana program deploy target/deploy/ghost_privacy.so
```

### Start Relayer
```bash
cd privacy-integration
npx ts-node relayer-service.ts
```

### Use SDK

**Development (devnet):**
```typescript
import { GhostPrivacySDK } from './privacy-integration/privacy-sdk';

// Configuration loaded from config/devnet.json or environment variables
const sdk = new GhostPrivacySDK();
await sdk.initialize();

// Deposit
const note = await sdk.deposit(payer, 1.0, ownerAddress);

// Withdraw anonymously via relayer
const signature = await sdk.withdrawViaRelayer(note, recipient, 1.0);
```

**Production (mainnet):**
```typescript
// Set environment
process.env.GHOST_ENV = 'mainnet';
process.env.GHOST_STORAGE_PASSWORD = 'strong-password';

// Configuration loaded from config/mainnet.json or environment variables
const sdk = new GhostPrivacySDK({
  password: process.env.GHOST_STORAGE_PASSWORD // Enables encrypted storage
});
await sdk.initialize();
```

See `PRODUCTION_SETUP.md` for complete mainnet deployment instructions.

## 📊 Security Features

| Feature | Status | Implementation |
|---------|--------|----------------|
| ZK-SNARK Proofs | ✅ Implemented | Groth16 (ark-groth16) |
| Poseidon Hashing | ✅ Implemented | circomlibjs |
| Ring Signatures | ✅ Implemented | MLSAG verification |
| Nullifier Tracking | ✅ Implemented | PDA-based (scalable) |
| VK Storage | ✅ Implemented | On-chain PDA accounts |
| Relayer Network | ✅ Implemented | Decentralized with reputation scoring |
| Merkle Trees | ✅ Implemented | 20-level Poseidon tree |

## ⚠️ Known Limitations

1. **No audit** - Code has not been professionally audited.
2. **Testing incomplete** - Needs comprehensive circuit tests and BPF tests.

**Note on Trusted Setup:** Multi-party trusted setup ceremony must be completed before mainnet deployment. See `TRUSTED_SETUP.md` and `ceremony-coordinator/README.md` for complete instructions.

## 🛣️ Roadmap to Production

- [ ] Multi-party trusted setup ceremony
- [x] Store verification keys in PDA accounts
- [x] Decentralized relayer network with reputation system
- [ ] Professional security audit
- [ ] Comprehensive test suite (circuits + program)
- [ ] Mainnet deployment with TVL limits
- [ ] Bug bounty program

## 📖 Documentation

### Circuit Documentation
- `circuits/transfer.circom` - Proves valid spend of commitment without revealing amount
- `circuits/balance.circom` - Proves balance ≥ threshold without revealing exact amount
- `circuits/ring_signature.circom` - Proves membership in ring without revealing which member

### Rust Program
- `programs/ghost-privacy/src/verifier.rs` - Cryptographic verification
- `programs/ghost-privacy/src/state.rs` - On-chain state management
- `programs/ghost-privacy/src/processor.rs` - Instruction processing

### Production Deployment
- `PRODUCTION_SETUP.md` - Complete mainnet deployment guide
  - Configuration management (environment-based)
  - Encrypted storage setup
  - Production readiness validation
  - Deployment workflow
  - Security checklist

### Trusted Setup
- `TRUSTED_SETUP.md` - Complete guide for multi-party ceremony
  - Phase 1: Powers of Tau ceremony
  - Phase 2: Circuit-specific setup
  - Security best practices
  - Participant guidelines
- `ceremony-coordinator/README.md` - Ceremony coordinator and participant tools

## 🤝 Contributing

This is an open-source privacy protocol. Contributions welcome:
- Circuit optimizations
- Security improvements
- Test coverage
- Documentation

## ⚖️ License

MIT License - See LICENSE file

## 🔒 Security

**DO NOT USE WITH REAL FUNDS ON MAINNET**

This is alpha software. Use only on devnet for testing and development.

## 🙏 Acknowledgments

This protocol builds on research from:
- Tornado Cash (Merkle tree commitment scheme)
- Zcash (Groth16 ZK-SNARKs, shielded transactions)
- Monero (MLSAG ring signatures, key images)
- Poseidon Hash (efficient ZK-friendly hashing)

## 📝 Technical Specifications

- **Curve**: BN254 (bn128)
- **Proof System**: Groth16
- **Hash Function**: Poseidon
- **Merkle Tree Depth**: 20 levels (1M+ commitments)
- **Ring Size**: 11 members (configurable)
- **Proof Size**: ~192 bytes
- **Verification Time**: <10ms on-chain
