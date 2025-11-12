"""Ghost SDK Client - Python Implementation"""

from typing import Optional, Dict, Any
from solana.rpc.async_api import AsyncClient
from solana.keypair import Keypair
from solana.publickey import PublicKey
from solders.transaction import Transaction
import nacl.signing
import nacl.encoding
import hashlib
import json


class GhostClient:
    """
    Ghost SDK Client for private transactions on Solana

    Example:
        ```python
        from ghost_sdk import GhostClient
        from solana.rpc.async_api import AsyncClient

        client = AsyncClient("https://api.devnet.solana.com")
        wallet = Keypair()

        ghost = GhostClient(client, wallet)
        await ghost.initialize()

        # Deposit
        await ghost.deposit(amount=1_000_000_000)

        # Private transfer
        await ghost.private_transfer(
            recipient="TARGET_ADDRESS",
            amount=500_000_000,
            memo="Coffee"
        )
        ```
    """

    def __init__(
        self,
        connection: AsyncClient,
        wallet: Keypair,
        program_id: Optional[PublicKey] = None,
    ):
        """
        Initialize Ghost Client

        Args:
            connection: Solana RPC client
            wallet: Keypair for signing transactions
            program_id: Ghost program ID (uses default if not provided)
        """
        self.connection = connection
        self.wallet = wallet
        self.program_id = program_id or PublicKey("GhostPrivacy11111111111111111111111111111111")

        self.private_key = nacl.signing.SigningKey.generate()
        self.public_key = self.private_key.verify_key

        self.commitments: Dict[str, Dict[str, Any]] = {}
        self.nullifiers: set = set()

    async def initialize(self) -> None:
        """Initialize the Ghost client"""
        print("🔧 Initializing Ghost SDK (Python)...")
        print(f"✅ Public key: {self.public_key.encode(encoder=nacl.encoding.HexEncoder)[:16].decode()}...")

    def get_ghost_identifier(self) -> str:
        """Get your Ghost privacy identifier"""
        return self.public_key.encode(encoder=nacl.encoding.HexEncoder).decode()

    async def generate_commitment(
        self,
        amount: int,
        recipient: str,
        nonce: Optional[bytes] = None,
    ) -> Dict[str, Any]:
        """
        Generate a commitment for an amount

        Args:
            amount: Amount in lamports
            recipient: Recipient's identifier
            nonce: Random nonce (generated if not provided)

        Returns:
            Dictionary with commitment details
        """
        if nonce is None:
            nonce = nacl.utils.random(32)

        # commitment = H(recipient || amount || nonce)
        data = recipient.encode() + amount.to_bytes(8, 'little') + nonce
        commitment = hashlib.sha256(data).digest()

        return {
            'value': commitment,
            'nonce': nonce,
            'amount': amount,
        }

    async def generate_nullifier(self, commitment: Dict[str, Any]) -> Dict[str, Any]:
        """
        Generate nullifier (prevents double-spending)

        Args:
            commitment: Commitment dictionary

        Returns:
            Dictionary with nullifier details
        """
        # nullifier = H(commitment || privateKey)
        data = commitment['value'] + bytes(self.private_key)
        nullifier = hashlib.sha256(data).digest()

        return {
            'value': nullifier,
            'commitment': commitment['value'],
        }

    async def deposit(self, amount: int) -> str:
        """
        Deposit into privacy pool

        Args:
            amount: Amount in lamports

        Returns:
            Transaction signature
        """
        print(f"💰 Depositing {amount} lamports...")

        # Generate commitment
        commitment = await self.generate_commitment(
            amount=amount,
            recipient=self.get_ghost_identifier(),
        )

        # Store commitment
        commitment_key = commitment['value'].hex()
        self.commitments[commitment_key] = commitment

        print(f"✅ Commitment: {commitment_key[:16]}...")

        # In production: Submit to Solana
        return "deposit_tx_signature"

    async def withdraw(self, amount: int, recipient: str) -> str:
        """
        Withdraw from privacy pool

        Args:
            amount: Amount in lamports
            recipient: Recipient address

        Returns:
            Transaction signature
        """
        print(f"💸 Withdrawing {amount} lamports to {recipient[:16]}...")

        # Find commitment with sufficient balance
        commitment = next(
            (c for c in self.commitments.values() if c['amount'] >= amount),
            None
        )

        if not commitment:
            raise ValueError("Insufficient balance")

        # Generate nullifier
        nullifier = await self.generate_nullifier(commitment)

        # Check if already spent
        nullifier_key = nullifier['value'].hex()
        if nullifier_key in self.nullifiers:
            raise ValueError("Commitment already spent")

        # Mark as spent
        self.nullifiers.add(nullifier_key)
        del self.commitments[commitment['value'].hex()]

        print(f"✅ Nullifier: {nullifier_key[:16]}...")

        # In production: Generate ZK proof and submit
        return "withdraw_tx_signature"

    async def private_transfer(
        self,
        recipient: str,
        amount: int,
        memo: Optional[str] = None,
    ) -> str:
        """
        Private transfer (combines deposit + withdraw)

        Args:
            recipient: Recipient address
            amount: Amount in lamports
            memo: Optional encrypted memo

        Returns:
            Transaction signature
        """
        print(f"🔒 Private transfer: {amount} lamports to {recipient[:16]}...")

        if memo:
            print(f"   Memo: {memo}")

        # In production: This would be optimized
        return await self.withdraw(amount, recipient)

    async def get_private_balance(self) -> int:
        """Get total private balance"""
        return sum(c['amount'] for c in self.commitments.values())

    async def generate_balance_proof(self, min_balance: int) -> Dict[str, Any]:
        """
        Generate proof of minimum balance

        Args:
            min_balance: Minimum balance to prove

        Returns:
            ZK proof dictionary
        """
        actual_balance = await self.get_private_balance()

        if actual_balance < min_balance:
            raise ValueError("Insufficient balance")

        print(f"🔐 Generating balance proof...")
        print(f"   Min balance: {min_balance}")
        print(f"   Actual: HIDDEN")

        # In production: Generate actual ZK proof
        return {
            'proof': b'proof_data',
            'public_signals': [min_balance],
        }


# Convenience functions

async def create_ghost_client(
    rpc_url: str = "https://api.devnet.solana.com",
    wallet: Optional[Keypair] = None,
) -> GhostClient:
    """
    Create and initialize a Ghost client

    Args:
        rpc_url: Solana RPC URL
        wallet: Keypair (generates new one if not provided)

    Returns:
        Initialized GhostClient
    """
    connection = AsyncClient(rpc_url)
    wallet = wallet or Keypair()

    client = GhostClient(connection, wallet)
    await client.initialize()

    return client
