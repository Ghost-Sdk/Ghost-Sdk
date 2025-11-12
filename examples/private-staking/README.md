# 🏦 Private Staking Example

Stake tokens without revealing your stake size.

## Features

- ✅ **Hidden Stake Size** - Amount is private
- ✅ **Anonymous Staker** - Identity hidden
- ✅ **Private Rewards** - Earnings hidden
- ✅ **Proof of Stake** - Prove you staked without revealing amount

## Why Private Staking?

Traditional staking reveals:
- ❌ How much you staked
- ❌ Your total holdings
- ❌ Reward amounts
- ❌ Staking duration

**Private Staking hides everything:**
- ✅ Stake size unknown
- ✅ Rewards private
- ✅ Duration hidden
- ✅ Complete anonymity

## Quick Start

```bash
npm install
npm run dev
```

## Example

```typescript
// Stake privately
await staking.stake({
  amount: 1000, // Hidden
  duration: 30, // days
  token: 'SOL'
});

// Observer sees: "Someone staked something"
// That's all. Complete privacy!
```

## Benefits

### For Users
- Whale privacy
- Strategy protection
- Tax privacy
- Security (no targets)

### For Protocols
- Fair staking
- No gaming
- Equal treatment
- True decentralization

## License

MIT
