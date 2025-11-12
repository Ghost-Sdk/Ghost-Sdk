use borsh::{BorshDeserialize, BorshSerialize};
use solana_program::pubkey::Pubkey;

/// Privacy pool state
#[derive(BorshSerialize, BorshDeserialize, Debug, Clone)]
pub struct PoolState {
    /// Pool authority
    pub authority: Pubkey,

    /// Current merkle root
    pub merkle_root: [u8; 32],

    /// Tree depth
    pub tree_depth: u8,

    /// Number of commitments in tree
    pub commitment_count: u64,

    /// Denomination for this pool
    pub denomination: u64,

    /// Total value locked in pool
    pub tvl: u64,

    /// Nullifier set (used nullifiers to prevent double-spending)
    /// OPTIMIZATION: In production, nullifiers should be stored in separate PDA accounts
    /// derived from the nullifier hash itself. This provides:
    /// 1. O(1) lookup by checking if PDA exists
    /// 2. Unlimited scalability (not bound by single account size)
    /// 3. No need to store in pool state
    ///
    /// Architecture:
    /// - Nullifier PDA: [b"nullifier", pool_address, nullifier_hash]
    /// - If account exists, nullifier is used
    /// - If account doesn't exist, nullifier is unused
    ///
    /// For backwards compatibility, we keep a small cache here:
    pub used_nullifiers: Vec<[u8; 32]>,

    /// Key images (for ring signatures)
    /// Same optimization applies - should use PDA accounts
    pub used_key_images: Vec<[u8; 32]>,

    /// Nullifier account counter (for migration to PDA storage)
    pub nullifier_count: u64,

    /// Key image account counter
    pub key_image_count: u64,

    /// Pool vault address
    pub vault: Pubkey,

    /// Is pool initialized
    pub is_initialized: bool,
}

impl PoolState {
    pub const LEN: usize = 32 + // authority
        32 + // merkle_root
        1 + // tree_depth
        8 + // commitment_count
        8 + // denomination
        8 + // tvl
        4 + (32 * 100) + // used_nullifiers (reduced to 100 for cache only)
        4 + (32 * 100) + // used_key_images (reduced to 100 for cache only)
        8 + // nullifier_count
        8 + // key_image_count
        32 + // vault
        1; // is_initialized

    /// Check if nullifier has been used (cache check only)
    /// For production, use check_nullifier_pda() for O(1) lookup
    pub fn is_nullifier_used(&self, nullifier: &[u8; 32]) -> bool {
        // Check cache (O(n) but small n=100)
        self.used_nullifiers.contains(nullifier)
    }

    /// Mark nullifier as used in cache
    /// For production, create nullifier PDA account instead
    pub fn add_nullifier(&mut self, nullifier: [u8; 32]) {
        // Only add if cache not full
        if self.used_nullifiers.len() < 100 {
            self.used_nullifiers.push(nullifier);
        }
        // Note: In production, always create PDA account regardless of cache
        self.nullifier_count += 1;
    }

    /// Check if key image has been used (cache check only)
    pub fn is_key_image_used(&self, key_image: &[u8; 32]) -> bool {
        // Check cache
        self.used_key_images.contains(key_image)
    }

    /// Mark key image as used in cache
    pub fn add_key_image(&mut self, key_image: [u8; 32]) {
        // Only add if cache not full
        if self.used_key_images.len() < 100 {
            self.used_key_images.push(key_image);
        }
        self.key_image_count += 1;
    }

    /// Derive nullifier PDA address
    pub fn derive_nullifier_pda(
        pool: &Pubkey,
        nullifier: &[u8; 32],
        program_id: &Pubkey,
    ) -> (Pubkey, u8) {
        Pubkey::find_program_address(
            &[b"nullifier", pool.as_ref(), nullifier],
            program_id,
        )
    }

    /// Derive key image PDA address
    pub fn derive_key_image_pda(
        pool: &Pubkey,
        key_image: &[u8; 32],
        program_id: &Pubkey,
    ) -> (Pubkey, u8) {
        Pubkey::find_program_address(
            &[b"key_image", pool.as_ref(), key_image],
            program_id,
        )
    }

    /// Add commitment to tree
    ///
    /// ARCHITECTURE NOTE: Full Merkle tree with Poseidon hashing is maintained OFF-CHAIN
    /// by the client (see privacy-integration/merkletree.ts). This is the standard architecture
    /// for ZK privacy protocols (Tornado Cash, Zcash) because:
    /// 1. Poseidon hashing on-chain is computationally expensive on Solana
    /// 2. Full tree storage would exceed account size limits
    /// 3. ZK-SNARK proofs already verify the Merkle path, so on-chain verification is sufficient
    ///
    /// On-chain, we only track:
    /// - Current commitment count (for indexing)
    /// - Current Merkle root (for proof verification)
    ///
    /// Clients must:
    /// 1. Maintain local Merkle tree with Poseidon hashing
    /// 2. Generate proofs using the local tree
    /// 3. Submit proofs that reference the on-chain root
    pub fn add_commitment(&mut self, commitment: [u8; 32]) {
        self.commitment_count += 1;

        // Note: The merkle_root is NOT updated here. Instead, it should be updated
        // by a privileged authority (relayer or DAO) after batching commitments off-chain.
        // This prevents MEV attacks and ensures atomic batch updates.
        //
        // For development/testing, you can update it here:
        // (In production, remove this and use a separate UpdateRoot instruction)
        use solana_program::keccak;
        let mut hasher_input = Vec::new();
        hasher_input.extend_from_slice(&self.merkle_root);
        hasher_input.extend_from_slice(&commitment);
        let new_hash = keccak::hash(&hasher_input);
        self.merkle_root.copy_from_slice(&new_hash.to_bytes());
    }

    /// Update Merkle root (called by relayer after off-chain tree update)
    pub fn update_root(&mut self, new_root: [u8; 32]) {
        self.merkle_root = new_root;
    }
}

/// Commitment data
#[derive(BorshSerialize, BorshDeserialize, Debug, Clone)]
pub struct Commitment {
    /// The commitment value
    pub value: [u8; 32],

    /// Owner (optional, for tracking)
    pub owner: Option<Pubkey>,

    /// Timestamp
    pub timestamp: i64,

    /// Is spent
    pub is_spent: bool,
}

impl Commitment {
    pub const LEN: usize = 32 + // value
        1 + 32 + // owner (option + pubkey)
        8 + // timestamp
        1; // is_spent
}

/// Shielded asset state
#[derive(BorshSerialize, BorshDeserialize, Debug, Clone)]
pub struct AssetState {
    /// Asset ID
    pub asset_id: [u8; 32],

    /// Issuer
    pub issuer: Pubkey,

    /// Asset metadata
    pub name: String,
    pub symbol: String,
    pub decimals: u8,

    /// Total supply (visible to issuer only)
    pub total_supply: u64,

    /// Circulating supply (sum of all notes)
    pub circulating_supply: u64,

    /// Note commitment tree root
    pub note_tree_root: [u8; 32],

    /// Number of notes
    pub note_count: u64,

    /// Used nullifiers for this asset
    pub used_nullifiers: Vec<[u8; 32]>,

    /// Is initialized
    pub is_initialized: bool,
}

impl AssetState {
    pub const LEN: usize = 32 + // asset_id
        32 + // issuer
        4 + 64 + // name (max 64 chars)
        4 + 16 + // symbol (max 16 chars)
        1 + // decimals
        8 + // total_supply
        8 + // circulating_supply
        32 + // note_tree_root
        8 + // note_count
        4 + (32 * 1000) + // used_nullifiers
        1; // is_initialized
}

/// Shielded note
#[derive(BorshSerialize, BorshDeserialize, Debug, Clone)]
pub struct ShieldedNote {
    /// Note commitment
    pub commitment: [u8; 32],

    /// Asset ID
    pub asset_id: [u8; 32],

    /// Encrypted value (only recipient can decrypt)
    pub encrypted_value: Vec<u8>,

    /// Encrypted memo (optional)
    pub encrypted_memo: Vec<u8>,

    /// Transaction public key (for stealth address)
    pub tx_public_key: [u8; 32],

    /// Is spent
    pub is_spent: bool,
}

impl ShieldedNote {
    pub const LEN: usize = 32 + // commitment
        32 + // asset_id
        4 + 256 + // encrypted_value (max 256 bytes)
        4 + 256 + // encrypted_memo (max 256 bytes)
        32 + // tx_public_key
        1; // is_spent
}

/// Nullifier account (for O(1) double-spend prevention)
/// Each nullifier gets its own PDA account. If account exists, nullifier is used.
/// This provides unlimited scalability compared to storing in Vec.
#[derive(BorshSerialize, BorshDeserialize, Debug, Clone)]
pub struct NullifierAccount {
    /// The nullifier value
    pub nullifier: [u8; 32],

    /// Pool this nullifier belongs to
    pub pool: Pubkey,

    /// Transaction signature that used this nullifier
    pub tx_signature: Option<[u8; 64]>,

    /// Timestamp when nullifier was used
    pub timestamp: i64,

    /// Bump seed for PDA derivation
    pub bump: u8,
}

impl NullifierAccount {
    pub const LEN: usize = 32 + // nullifier
        32 + // pool
        1 + 64 + // tx_signature (option)
        8 + // timestamp
        1; // bump
}

/// Key image account (for ring signature double-spend prevention)
#[derive(BorshSerialize, BorshDeserialize, Debug, Clone)]
pub struct KeyImageAccount {
    /// The key image value
    pub key_image: [u8; 32],

    /// Pool this key image belongs to
    pub pool: Pubkey,

    /// Transaction signature
    pub tx_signature: Option<[u8; 64]>,

    /// Timestamp
    pub timestamp: i64,

    /// Bump seed
    pub bump: u8,
}

impl KeyImageAccount {
    pub const LEN: usize = 32 + // key_image
        32 + // pool
        1 + 64 + // tx_signature
        8 + // timestamp
        1; // bump
}
