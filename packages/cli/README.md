# 👻 Ghost SDK CLI

Command-line interface for Ghost SDK - Privacy for Solana.

## Installation

```bash
npm install -g @ghost-sdk/cli
```

## Quick Start

```bash
# Initialize
ghost init

# Check balance
ghost balance

# Private transfer
ghost transfer --to ADDRESS --amount 1.5 --private

# Issue private token
ghost issue-token --name "Private Gold" --symbol PGOLD --total-supply 1000000

# Private swap
ghost swap --from SOL --to USDC --amount 10

# Stake privately
ghost stake --amount 100 --duration 30
```

## Commands

### `ghost init`
Initialize Ghost SDK wallet

```bash
ghost init
ghost init --network mainnet
```

### `ghost transfer`
Send private transfer

```bash
# Basic transfer
ghost transfer --to ADDRESS --amount 1.5

# With memo
ghost transfer --to ADDRESS --amount 1.5 --memo "Coffee"

# Maximum privacy (Ghost + Monero + Zcash)
ghost transfer --to ADDRESS --amount 1.5 --private

# Custom ring size
ghost transfer --to ADDRESS --amount 1.5 --private --ring-size 16
```

Options:
- `-t, --to <address>` - Recipient address (required)
- `-a, --amount <amount>` - Amount in SOL (required)
- `-m, --memo <memo>` - Optional encrypted memo
- `-r, --ring-size <size>` - Ring signature size (default: 11)
- `--private` - Use maximum privacy

### `ghost balance`
Show private balance

```bash
# Show balance
ghost balance

# Hide amount
ghost balance --hidden

# Generate balance proof
ghost balance --proof
```

Options:
- `--hidden` - Show as hidden
- `--proof` - Generate ZK balance proof

### `ghost deposit`
Deposit into privacy pool

```bash
ghost deposit --amount 10
```

### `ghost withdraw`
Withdraw from privacy pool

```bash
ghost withdraw --amount 5 --to ADDRESS
```

### `ghost issue-token`
Issue private token (ZSA)

```bash
ghost issue-token \
  --name "Private Gold" \
  --symbol PGOLD \
  --decimals 9 \
  --total-supply 1000000
```

Options:
- `-n, --name <name>` - Token name (required)
- `-s, --symbol <symbol>` - Token symbol (required)
- `-d, --decimals <decimals>` - Decimals (default: 9)
- `-t, --total-supply <supply>` - Total supply (required)

### `ghost swap`
Private token swap

```bash
ghost swap --from SOL --to USDC --amount 10

# With slippage
ghost swap --from SOL --to USDC --amount 10 --slippage 1.0
```

Options:
- `-f, --from <token>` - From token (required)
- `-t, --to <token>` - To token (required)
- `-a, --amount <amount>` - Amount (required)
- `--slippage <percentage>` - Slippage tolerance (default: 0.5)

### `ghost stake`
Stake tokens privately

```bash
# Stake SOL
ghost stake --amount 100 --duration 30

# Stake custom token
ghost stake --amount 100 --duration 30 --token PGOLD
```

Options:
- `-a, --amount <amount>` - Amount to stake (required)
- `-d, --duration <days>` - Duration in days (default: 30)
- `-t, --token <token>` - Token to stake (default: SOL)

## Configuration

Config is stored in `~/.config/ghost-sdk/config.json`

View config:
```bash
ghost config
```

## Examples

### Complete Workflow

```bash
# 1. Initialize
ghost init

# 2. Check balance
ghost balance

# 3. Deposit to privacy pool
ghost deposit --amount 10

# 4. Send privately
ghost transfer --to RECIPIENT --amount 5 --private

# 5. Check remaining balance
ghost balance --hidden

# 6. Issue private token
ghost issue-token --name "My Token" --symbol MTKN --total-supply 1000000

# 7. Swap tokens
ghost swap --from SOL --to USDC --amount 2

# 8. Stake
ghost stake --amount 50 --duration 30
```

### Scripting

Use in shell scripts:

```bash
#!/bin/bash

# Send to multiple recipients
for addr in "${ADDRESSES[@]}"; do
  ghost transfer --to $addr --amount 1 --private
done

# Check balance periodically
watch -n 60 'ghost balance'
```

## Privacy Levels

### Standard (Default)
```bash
ghost transfer --to ADDRESS --amount 1
```
- ✅ ZK proofs
- ✅ Hidden amounts
- ✅ Private commitments

### Maximum (--private flag)
```bash
ghost transfer --to ADDRESS --amount 1 --private
```
- ✅ All standard features
- ✅ Ring signatures (Monero)
- ✅ Stealth addresses (Monero)
- ✅ Shielded assets (Zcash)
- ✅ Complete anonymity

## Troubleshooting

**"Configuration not found"**
```bash
ghost init
```

**"Insufficient balance"**
```bash
ghost balance
ghost deposit --amount 10
```

**"Connection failed"**
```bash
# Check network
ghost config

# Reinitialize with correct network
ghost init --network mainnet
```

## Advanced Usage

### Custom RPC
Edit `~/.config/ghost-sdk/config.json`:
```json
{
  "rpcUrl": "https://your-custom-rpc.com"
}
```

### Multiple Wallets
Use different config directories:
```bash
GHOST_CONFIG_DIR=~/.ghost-wallet-1 ghost balance
GHOST_CONFIG_DIR=~/.ghost-wallet-2 ghost balance
```

## License

MIT

---

**Privacy from the command line** 👻⌨️
