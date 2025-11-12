# 👻 Ghost Privacy Protocol

**MAXIMUM ANONYMITY PRIVACY PROTOCOL FOR SOLANA**

Ghost Privacy is a zero-knowledge privacy protocol built on Solana, enabling completely anonymous transactions through advanced cryptographic techniques. It uses ZK-SNARKs (Groth16), Merkle tree commitments, and a relayer network to provide maximum anonymity (10/10 privacy level) for Solana transactions.

## About Ghost Privacy

Ghost Privacy is a privacy-preserving protocol that allows users to execute completely anonymous transactions on Solana. The protocol utilizes a combination of zero-knowledge proofs, shielded pools, and relayer services to hide both the transaction graph and sender identity from blockchain observers. One of the main features of Ghost Privacy is its **automatic relayer integration** that ensures every transaction is submitted through a relayer service, making it impossible for users to accidentally expose their wallet addresses.

The protocol implements a shielded pool architecture where funds are deposited into a privacy pool and can be withdrawn to any address without revealing the link between deposit and withdrawal. All withdrawals and transfers are automatically routed through the relayer service, which submits transactions on behalf of users, ensuring their wallet addresses never appear on-chain.

Ghost Privacy aims to provide developers and users a complete privacy solution through an easy-to-use CLI interface, abstracting the complexity of zero-knowledge proofs and cryptographic operations.

## Key Features

- ✅ **Automatic Relayer Integration** - All transactions automatically use relayer, impossible to expose wallet
- ✅ **Zero-Knowledge Proofs** - Groth16 ZK-SNARKs for transaction privacy
- ✅ **Merkle Tree Commitments** - SHA-256 based commitment scheme with 20-level trees
- ✅ **Ring Signatures** - Anonymity sets for sender privacy
- ✅ **Shielded Pool Architecture** - Privacy pool with commitment/nullifier system
- ✅ **Maximum Anonymity (10/10)** - Complete sender anonymity guaranteed
- ✅ **On-Chain Privacy** - Real Solana program deployment

## How It Works

### Without Ghost Privacy (Visible)
```
Your Wallet → Recipient
   ❌ Visible on Solscan/Explorer
   Privacy: 0/10
```

### With Ghost Privacy (Anonymous)
```
Your Wallet → Generates Proof (locally)
              ↓
           Privacy Pool (shielded)
              ↓
           Relayer → Submits Transaction → Recipient
              ✅ YOUR WALLET HIDDEN!
              Privacy: 10/10
```

On-chain, it appears as: **Relayer → Recipient** (your wallet never appears)

## Quick Start

### Installation

Requirements:
- Node.js
- Solana CLI (devnet)
- Funded wallet

### Usage

```bash
# Run Ghost Privacy CLI
ghost-cli.bat
```

The relayer service starts automatically in the background.

### CLI Options

```
1. Deposit             - Add SOL to privacy pool
2. Withdraw            - Withdraw via relayer (anonymous)
3. Send                - Send via relayer (anonymous)
4. Private Transfer    - Transfer between identities
5. View Notes          - Show shielded notes
6. Change Identity     - Switch identity
7. Request Airdrop     - Get devnet SOL
8. Exit
```


✅ **Anonymity verified!**

## Technical Architecture

### Core Components

**Privacy SDK** - Main integration layer
- Shielded pool operations
- Zero-knowledge proof generation
- Merkle tree management
- Note management system

**ZK Proof Generator** - Groth16 ZK-SNARKs
- Transfer proofs
- Nullifier generation
- Commitment verification

**Relayer Service** - HTTP service
- Receives transaction requests
- Submits transactions anonymously
- Hides user wallet addresses

**Merkle Tree** - SHA-256 based
- 20 levels deep
- Stores all commitments
- Generates proofs for withdrawals

## Libraries & Tools

- **@solana/web3.js** - Solana integration
- **snarkjs** - ZK proof generation
- **borsh** - Binary serialization
- **express** - Relayer HTTP service

## Network Information

- **Network**: Solana Devnet
- **Program ID**: `3wiFPaYTQZZD71rd4pohPRr8JaFaGN3XaNWLoGSk31Ck`
- **Privacy Pool**: `5PYt6P2r3hiRU661Kq4EAG5kSnmYVtKto7MtE4YhJVAN`
- **Relayer Fee**: 0.001 SOL per transaction

## Privacy Best Practices

### Maximum Anonymity

1. ✅ All transactions automatically use relayer
2. ✅ Wait between deposit/withdraw
3. ✅ Mix transaction amounts
4. ✅ Use different recipient addresses

### What's Hidden

- ✅ Deposit→Withdrawal link
- ✅ Your wallet address
- ✅ Transaction patterns
- ✅ Sender identity

## Privacy Guarantee

**When using Ghost Privacy:**

✅ Your wallet address will NEVER appear on-chain
✅ All transactions automatically routed through relayer
✅ Deposit→Withdrawal links are cryptographically hidden
✅ Privacy level: 10/10 (Maximum Anonymity)

**Verify every transaction on Solscan - your wallet won't be there!** 👻

---

Built with 🔒 for Solana Privacy
