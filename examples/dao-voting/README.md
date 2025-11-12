# 🗳️ DAO Voting Example

Private voting for DAOs - anonymous and verifiable.

## Features

- ✅ **Hidden Votes** - No one sees how you voted
- ✅ **Secret Ballot** - True democracy
- ✅ **Anonymous Voting Power** - Weight hidden
- ✅ **Verifiable Results** - Proven correct
- ✅ **No Vote Buying** - Can't prove how you voted

## Why Private Voting?

Traditional DAO voting exposes:
- ❌ How you voted
- ❌ Your voting power
- ❌ Voting patterns
- ❌ Enables vote buying

**Private DAO Voting provides:**
- ✅ Secret ballot
- ✅ Hidden power
- ✅ True democracy
- ✅ Coercion-resistant

## Quick Start

```bash
npm install
npm run dev
```

## Example

```typescript
// Create private proposal
await dao.createProposal({
  title: 'Increase treasury allocation',
  options: ['Yes', 'No'],
  endTime: '7d'
});

// Vote privately
await dao.vote({
  proposal: proposalId,
  option: 'Yes',
  weight: 1000 // Hidden!
});

// Results are verifiable but votes are private
```

## Comparison

| Feature | Snapshot | Realms | **Private DAO** |
|---------|----------|--------|-----------------|
| Secret ballot | ❌ | ❌ | ✅ |
| Hidden power | ❌ | ❌ | ✅ |
| Vote buying proof | ✅ Possible | ✅ Possible | ❌ Impossible |
| Privacy score | 2/10 | 3/10 | **10/10** |

## License

MIT
