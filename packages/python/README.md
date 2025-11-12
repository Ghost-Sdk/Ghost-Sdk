# 🐍 Ghost SDK - Python

Privacy SDK for Solana in Python!

## Installation

```bash
pip install ghost-sdk
```

## Quick Start

```python
from ghost_sdk import GhostClient, create_ghost_client

# Create client
ghost = await create_ghost_client()

# Deposit
await ghost.deposit(amount=1_000_000_000)  # 1 SOL

# Private transfer
await ghost.private_transfer(
    recipient="TARGET_ADDRESS",
    amount=500_000_000,  # 0.5 SOL
    memo="Coffee"
)

# Get balance (hidden)
balance = await ghost.get_private_balance()
print(f"Balance: {balance} lamports (HIDDEN)")
```

## Features

- ✅ **Full Ghost SDK** - All privacy features
- ✅ **Async/await** - Modern Python async
- ✅ **Type hints** - Full type safety
- ✅ **Easy to use** - Pythonic API
- ✅ **Well documented** - Comprehensive docs

## Examples

### Basic Transfer

```python
import asyncio
from ghost_sdk import create_ghost_client

async def main():
    # Initialize
    ghost = await create_ghost_client(
        rpc_url="https://api.devnet.solana.com"
    )

    # Deposit
    tx1 = await ghost.deposit(1_000_000_000)
    print(f"Deposited: {tx1}")

    # Transfer privately
    tx2 = await ghost.private_transfer(
        recipient="RECIPIENT_ADDRESS",
        amount=500_000_000,
        memo="Private payment"
    )
    print(f"Transferred: {tx2}")

    # Check balance
    balance = await ghost.get_private_balance()
    print(f"Balance: {balance}")

if __name__ == "__main__":
    asyncio.run(main())
```

### With Monero Features

```python
from ghost_sdk import MoneroPrivacyClient

# Initialize
monero = MoneroPrivacyClient()
await monero.initialize()

# Get address
address = monero.get_primary_address()
print(f"Address: {address['address']}")

# Generate stealth address
stealth = monero.generate_stealth_address(recipient, 0)
print(f"Stealth: {stealth['address']}")

# Create ring signature
signature = await monero.create_ring_signature(
    message=b"transaction",
    real_key_index=0,
    private_key=my_key,
    ring_public_keys=[key1, key2, key3]
)
```

### Ultimate Privacy

```python
from ghost_sdk import UltimatePrivacyClient

# Combine all three privacy layers
ultimate = UltimatePrivacyClient(ghost, monero, zcash)

# Maximum privacy transfer
await ultimate.ultimate_private_transfer(
    asset_id=TOKEN_ID,
    amount=1000,
    recipient="ADDRESS",
    ring_size=16  # Hide among 16 people!
)
```

## API Reference

### GhostClient

```python
class GhostClient:
    async def initialize() -> None
    async def deposit(amount: int) -> str
    async def withdraw(amount: int, recipient: str) -> str
    async def private_transfer(recipient: str, amount: int, memo: str = None) -> str
    async def get_private_balance() -> int
    async def generate_balance_proof(min_balance: int) -> dict
    def get_ghost_identifier() -> str
```

### MoneroPrivacyClient

```python
class MoneroPrivacyClient:
    async def initialize() -> None
    def get_primary_address() -> dict
    def generate_stealth_address(recipient: dict, index: int) -> dict
    async def create_ring_signature(message: bytes, real_key_index: int,
                                    private_key: bytes, ring_public_keys: list) -> dict
    def create_ringct_output(amount: int, recipient: dict) -> dict
```

## Type Hints

Full type safety:

```python
from ghost_sdk import GhostClient
from solana.keypair import Keypair

client: GhostClient = GhostClient(connection, wallet)
balance: int = await client.get_private_balance()
signature: str = await client.deposit(1_000_000_000)
```

## Testing

```bash
# Install dev dependencies
pip install ghost-sdk[dev]

# Run tests
pytest

# With coverage
pytest --cov=ghost_sdk
```

## Requirements

- Python 3.8+
- solana-py
- PyNaCl
- cryptography

## Examples

See `examples/` directory for more:
- `basic_transfer.py` - Simple private transfer
- `ring_signatures.py` - Monero-style rings
- `stealth_addresses.py` - One-time addresses
- `ultimate_privacy.py` - All features combined

## Documentation

Full docs at [docs.ghost-sdk.com/python](https://docs.ghost-sdk.com/python)

## License

MIT

---

**Privacy for Everyone** 🐍👻🔐
