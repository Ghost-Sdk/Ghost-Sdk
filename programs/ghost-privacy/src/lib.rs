// Ghost Privacy Protocol - Solana Program
//
// Provides on-chain verification for:
// - ZK-SNARK proofs (Groth16)
// - Ring signatures (Monero-style)
// - Shielded transactions (Zcash ZSA-style)
// - Private balances

pub mod error;
pub mod instruction;
pub mod processor;
pub mod state;
pub mod verifier;

pub use error::PrivacyError;
pub use instruction::PrivacyInstruction;
pub use processor::Processor;

#[cfg(not(feature = "no-entrypoint"))]
pub fn process(
    program_id: &solana_program::pubkey::Pubkey,
    accounts: &[solana_program::account_info::AccountInfo],
    instruction_data: &[u8],
) -> solana_program::entrypoint::ProgramResult {
    Processor::process(program_id, accounts, instruction_data)
}

#[cfg(not(feature = "no-entrypoint"))]
solana_program::entrypoint!(process);

// Re-export program ID
solana_program::declare_id!("GhostPrivacy11111111111111111111111111111111");
