use solana_program::program_error::ProgramError;
use thiserror::Error;

#[derive(Error, Debug, Copy, Clone)]
pub enum PrivacyError {
    #[error("Invalid instruction")]
    InvalidInstruction,

    #[error("Invalid proof")]
    InvalidProof,

    #[error("Nullifier already used")]
    NullifierAlreadyUsed,

    #[error("Invalid merkle root")]
    InvalidMerkleRoot,

    #[error("Invalid commitment")]
    InvalidCommitment,

    #[error("Invalid ring signature")]
    InvalidRingSignature,

    #[error("Invalid key image")]
    InvalidKeyImage,

    #[error("Key image already used")]
    KeyImageAlreadyUsed,

    #[error("Invalid amount")]
    InvalidAmount,

    #[error("Invalid public key")]
    InvalidPublicKey,

    #[error("Insufficient funds")]
    InsufficientFunds,

    #[error("Pool not initialized")]
    PoolNotInitialized,

    #[error("Invalid pool state")]
    InvalidPoolState,

    #[error("Unauthorized")]
    Unauthorized,

    #[error("Invalid account data")]
    InvalidAccountData,

    #[error("Invalid public inputs")]
    InvalidPublicInputs,

    #[error("Invalid verification key")]
    InvalidVerificationKey,

    #[error("Invalid signature")]
    InvalidSignature,

    #[error("Invalid ring size")]
    InvalidRingSize,
}

impl From<PrivacyError> for ProgramError {
    fn from(e: PrivacyError) -> Self {
        ProgramError::Custom(e as u32)
    }
}
