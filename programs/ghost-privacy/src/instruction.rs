use borsh::{BorshDeserialize, BorshSerialize};
use solana_program::pubkey::Pubkey;

/// Instructions supported by the Ghost Privacy program
#[derive(BorshSerialize, BorshDeserialize, Debug, Clone)]
pub enum PrivacyInstruction {
    /// Initialize privacy pool
    ///
    /// Accounts:
    /// 0. `[writable]` Pool state account
    /// 1. `[signer, writable]` Pool authority (pays for vault creation)
    /// 2. `[writable]` Pool vault PDA (will be created)
    /// 3. `[]` System program
    InitializePool {
        /// Maximum tree depth for commitments
        tree_depth: u8,
        /// Denomination for pool (e.g., 0.1 SOL, 1 SOL, 10 SOL)
        denomination: u64,
    },

    /// Deposit into privacy pool
    ///
    /// Accounts:
    /// 0. `[writable]` Pool state
    /// 1. `[writable, signer]` Depositor
    /// 2. `[writable]` Pool vault
    /// 3. `[]` System program
    Deposit {
        /// Commitment to deposited amount
        commitment: [u8; 32],
        /// Amount to deposit (must match denomination)
        amount: u64,
    },

    /// Withdraw from privacy pool using ZK proof
    ///
    /// Accounts:
    /// 0. `[writable]` Pool state
    /// 1. `[writable]` Pool vault
    /// 2. `[writable]` Recipient
    /// 3. `[]` System program
    Withdraw {
        /// ZK proof of ownership
        proof: Vec<u8>,
        /// Merkle root
        root: [u8; 32],
        /// Nullifier (prevents double-spending)
        nullifier: [u8; 32],
        /// New commitment for change (if any)
        new_commitment: Option<[u8; 32]>,
        /// Recipient address (can be different from withdrawer)
        recipient: Pubkey,
        /// Amount to withdraw
        amount: u64,
    },

    /// Private transfer using ring signature
    ///
    /// Accounts:
    /// 0. `[writable]` Pool state
    /// 1. `[writable]` Sender's commitment
    /// 2. `[writable]` Recipient's commitment
    PrivateTransfer {
        /// Ring signature proof
        ring_signature: Vec<u8>,
        /// Key image (linkability tag)
        key_image: [u8; 32],
        /// Ring member public keys
        ring_members: Vec<[u8; 32]>,
        /// New commitment for recipient
        new_commitment: [u8; 32],
        /// Encrypted amount (for recipient only)
        encrypted_amount: Vec<u8>,
    },

    /// Verify balance proof
    ///
    /// Accounts:
    /// 0. `[]` Pool state
    /// 1. `[]` User account
    VerifyBalance {
        /// ZK proof of minimum balance
        proof: Vec<u8>,
        /// Minimum balance to prove
        min_balance: u64,
        /// Balance commitment
        balance_commitment: [u8; 32],
    },

    /// Issue private asset (Zcash ZSA style)
    ///
    /// Accounts:
    /// 0. `[writable, signer]` Asset issuer
    /// 1. `[writable]` Asset state
    /// 2. `[]` System program
    IssueAsset {
        /// Asset metadata
        name: String,
        symbol: String,
        decimals: u8,
        /// Initial supply (shielded)
        total_supply: u64,
        /// Asset ID
        asset_id: [u8; 32],
    },

    /// Transfer shielded asset
    ///
    /// Accounts:
    /// 0. `[writable]` Asset state
    /// 1. `[writable]` Sender shielded note
    /// 2. `[writable]` Recipient shielded note
    TransferAsset {
        /// ZK proof of asset transfer
        proof: Vec<u8>,
        /// Asset ID
        asset_id: [u8; 32],
        /// Nullifier for sender's note
        nullifier: [u8; 32],
        /// New note commitment for recipient
        new_commitment: [u8; 32],
        /// Encrypted amount and memo
        encrypted_data: Vec<u8>,
    },
}
