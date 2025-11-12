# 🖼️ Private NFT Marketplace

Anonymous NFT trading with Ghost SDK.

## Features

- ✅ **Hidden Ownership** - No one sees who owns what
- ✅ **Private Sales** - Anonymous buying/selling
- ✅ **Encrypted Metadata** - NFT details private
- ✅ **Anonymous Bids** - Hidden bid amounts
- ✅ **Stealth Collections** - Private collections

## Why Privacy for NFTs?

Traditional NFT marketplaces expose:
- ❌ Who owns which NFTs
- ❌ Purchase prices
- ❌ Collection sizes
- ❌ Trading patterns

**Private NFT Marketplace hides:**
- ✅ Ownership history
- ✅ Sale prices
- ✅ Bid amounts
- ✅ Collection details

## Use Cases

### 1. High-Value Art
Buy expensive art without revealing wealth

### 2. Corporate NFTs
Company purchases without exposing strategy

### 3. Anonymous Identity
Identity NFTs without KYC exposure

### 4. Private Memberships
Membership NFTs without public lists

## Quick Start

```bash
npm install
npm run dev
```

## Example: List NFT

```typescript
await marketplace.listNFT({
  nft: nftAddress,
  price: 10, // SOL (hidden)
  seller: 'ANONYMOUS'
});

// Result: Listed privately
// Price and seller hidden!
```

## License

MIT
