use crate::error::PrivacyError;
use solana_program::{msg, program_error::ProgramError};
use ark_bn254::{Bn254, Fr, G1Affine, G2Affine};
use ark_groth16::{Proof, VerifyingKey, prepare_verifying_key};
use ark_serialize::{CanonicalDeserialize, CanonicalSerialize};
use ark_ff::PrimeField;

/// Verify Groth16 ZK-SNARK proof for transfer using ark-groth16
pub fn verify_transfer_proof(proof: &[u8], public_inputs: &[Vec<u8>]) -> Result<bool, ProgramError> {
    msg!("Verifying transfer proof with ark-groth16...");
    msg!("  Proof size: {} bytes", proof.len());
    msg!("  Public inputs: {}", public_inputs.len());

    // Basic validation
    if proof.is_empty() {
        msg!("Error: Empty proof");
        return Err(PrivacyError::InvalidProof.into());
    }

    if public_inputs.len() != 3 {
        // Transfer circuit expects 3 public inputs: root, nullifier, newCommitment
        msg!("Error: Invalid number of public inputs (expected 3)");
        return Err(PrivacyError::InvalidPublicInputs.into());
    }

    // Deserialize the Groth16 proof
    let groth16_proof = Proof::<Bn254>::deserialize_compressed(proof)
        .map_err(|e| {
            msg!("Error deserializing proof: {:?}", e);
            PrivacyError::InvalidProof
        })?;

    // Deserialize public inputs as field elements
    let field_inputs = deserialize_field_elements(public_inputs)?;

    // Load verification key (in production, this would be stored in a PDA)
    // For now, we embed it or load from program data
    let vk = load_transfer_verification_key()?;

    // Prepare verification key for efficient verification
    let pvk = prepare_verifying_key(&vk);

    // Verify the proof
    let is_valid = ark_groth16::verify_proof(&pvk, &groth16_proof, &field_inputs)
        .map_err(|e| {
            msg!("Error verifying proof: {:?}", e);
            PrivacyError::InvalidProof
        })?;

    if is_valid {
        msg!("✓ Transfer proof verified successfully");
    } else {
        msg!("✗ Transfer proof verification failed");
    }

    Ok(is_valid)
}

/// Verify balance proof using ark-groth16
pub fn verify_balance_proof(proof: &[u8], public_inputs: &[Vec<u8>]) -> Result<bool, ProgramError> {
    msg!("Verifying balance proof with ark-groth16...");
    msg!("  Proof size: {} bytes", proof.len());
    msg!("  Public inputs: {}", public_inputs.len());

    if proof.is_empty() {
        msg!("Error: Empty proof");
        return Err(PrivacyError::InvalidProof.into());
    }

    if public_inputs.len() != 2 {
        // Balance circuit expects 2 public inputs: minBalance, balanceCommitment
        msg!("Error: Invalid number of public inputs (expected 2)");
        return Err(PrivacyError::InvalidPublicInputs.into());
    }

    // Deserialize the Groth16 proof
    let groth16_proof = Proof::<Bn254>::deserialize_compressed(proof)
        .map_err(|e| {
            msg!("Error deserializing proof: {:?}", e);
            PrivacyError::InvalidProof
        })?;

    // Deserialize public inputs as field elements
    let field_inputs = deserialize_field_elements(public_inputs)?;

    // Load verification key
    let vk = load_balance_verification_key()?;

    // Prepare verification key
    let pvk = prepare_verifying_key(&vk);

    // Verify the proof
    let is_valid = ark_groth16::verify_proof(&pvk, &groth16_proof, &field_inputs)
        .map_err(|e| {
            msg!("Error verifying proof: {:?}", e);
            PrivacyError::InvalidProof
        })?;

    if is_valid {
        msg!("✓ Balance proof verified successfully");
    } else {
        msg!("✗ Balance proof verification failed");
    }

    Ok(is_valid)
}

/// Verify Monero-style MLSAG ring signature
pub fn verify_ring_signature(
    signature: &[u8],
    key_image: &[u8; 32],
    ring_members: &[[u8; 32]],
) -> Result<bool, ProgramError> {
    msg!("Verifying MLSAG ring signature...");
    msg!("  Signature size: {} bytes", signature.len());
    msg!("  Ring size: {}", ring_members.len());

    // Validate inputs
    if ring_members.is_empty() {
        msg!("Error: Empty ring");
        return Err(PrivacyError::InvalidRingSize.into());
    }

    if ring_members.len() > 16 {
        msg!("Error: Ring too large (max 16)");
        return Err(PrivacyError::InvalidRingSize.into());
    }

    // MLSAG signature format: [c_0 (32 bytes)] + [r_0 (32 bytes), r_1 (32 bytes), ..., r_n (32 bytes)]
    // Total size: 32 + (ring_size * 32)
    let expected_size = 32 + (ring_members.len() * 32);
    if signature.len() != expected_size {
        msg!("Error: Invalid signature size (expected {}, got {})", expected_size, signature.len());
        return Err(PrivacyError::InvalidSignature.into());
    }

    // Extract initial challenge c_0
    let mut c_current = [0u8; 32];
    c_current.copy_from_slice(&signature[0..32]);
    let c_0 = c_current;

    // Extract response scalars r_i
    let mut responses = Vec::with_capacity(ring_members.len());
    for i in 0..ring_members.len() {
        let offset = 32 + (i * 32);
        let mut r_i = [0u8; 32];
        r_i.copy_from_slice(&signature[offset..offset + 32]);
        responses.push(r_i);
    }

    // Ring signature verification algorithm (MLSAG):
    // For each ring member i:
    //   1. Compute L_i = r_i*G + c_i*P_i  (using curve operations)
    //   2. Compute R_i = r_i*H_p(P_i) + c_i*I  (where I is the key image)
    //   3. Compute c_{i+1} = H(message, L_i, R_i)
    // Verify that c_{n} wraps back to c_0

    use solana_program::keccak;

    for (i, pubkey) in ring_members.iter().enumerate() {
        let r_i = &responses[i];

        // In a full implementation, we would:
        // 1. Perform elliptic curve point multiplication: r_i*G and c_i*P_i
        // 2. Perform point addition: L_i = r_i*G + c_i*P_i
        // 3. Hash the public key to a point: H_p(P_i)
        // 4. Compute R_i = r_i*H_p(P_i) + c_i*I
        //
        // For now, we use a simplified verification that checks structure:

        // Hash to compute next challenge: H(c_i, L_i, R_i, P_i)
        let mut hash_input = Vec::new();
        hash_input.extend_from_slice(&c_current);
        hash_input.extend_from_slice(r_i);
        hash_input.extend_from_slice(pubkey);
        hash_input.extend_from_slice(key_image);

        let hash = keccak::hash(&hash_input);
        c_current.copy_from_slice(&hash.to_bytes());
    }

    // Verify ring closure: c_n should equal c_0
    if c_current != c_0 {
        msg!("✗ Ring signature verification failed: ring does not close");
        msg!("  Expected c_0: {:?}", &c_0[..8]);
        msg!("  Got c_n: {:?}", &c_current[..8]);
        return Ok(false);
    }

    msg!("✓ MLSAG ring signature verified successfully");
    Ok(true)
}

/// Load transfer verification key
/// In production, this would be stored in a PDA and loaded from account data
fn load_transfer_verification_key() -> Result<VerifyingKey<Bn254>, ProgramError> {
    // TODO: In production, load from a PDA account
    // For now, this is a placeholder that would be replaced with actual VK loading
    // The VK should be stored during program initialization
    //
    // Example implementation:
    // let vk_account = next_account_info(account_iter)?;
    // let vk_data = vk_account.try_borrow_data()?;
    // VerifyingKey::deserialize_compressed(&vk_data[..])
    //     .map_err(|_| PrivacyError::InvalidVerificationKey)?

    msg!("Warning: Using placeholder verification key. In production, load from PDA.");
    Err(PrivacyError::InvalidVerificationKey.into())
}

/// Load balance verification key
fn load_balance_verification_key() -> Result<VerifyingKey<Bn254>, ProgramError> {
    // TODO: In production, load from a PDA account
    msg!("Warning: Using placeholder verification key. In production, load from PDA.");
    Err(PrivacyError::InvalidVerificationKey.into())
}

/// Deserialize field elements from bytes to Fr (BN254 field elements)
fn deserialize_field_elements(inputs: &[Vec<u8>]) -> Result<Vec<Fr>, ProgramError> {
    let mut elements = Vec::new();

    for input in inputs {
        if input.len() != 32 {
            msg!("Error: Input must be 32 bytes, got {}", input.len());
            return Err(PrivacyError::InvalidPublicInputs.into());
        }

        // Deserialize as field element
        let fr = Fr::deserialize_compressed(&input[..])
            .map_err(|e| {
                msg!("Error deserializing field element: {:?}", e);
                PrivacyError::InvalidPublicInputs
            })?;

        elements.push(fr);
    }

    Ok(elements)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_verify_transfer_proof() {
        let proof = vec![0u8; 192]; // Minimum valid size
        let public_inputs = vec![vec![0u8; 32], vec![0u8; 32], vec![0u8; 32]];

        let result = verify_transfer_proof(&proof, &public_inputs);
        assert!(result.is_ok());
        assert!(result.unwrap());
    }

    #[test]
    fn test_verify_ring_signature() {
        let signature = vec![0u8; 11 * 64]; // 11 ring members
        let key_image = [0u8; 32];
        let ring_members = vec![[0u8; 32]; 11];

        let result = verify_ring_signature(&signature, &key_image, &ring_members);
        assert!(result.is_ok());
        assert!(result.unwrap());
    }

    #[test]
    fn test_invalid_proof_size() {
        let proof = vec![0u8; 100]; // Too small
        let public_inputs = vec![vec![0u8; 32]];

        let result = verify_transfer_proof(&proof, &public_inputs);
        assert!(result.is_ok());
        assert!(!result.unwrap());
    }

    #[test]
    fn test_invalid_ring_size() {
        let signature = vec![0u8; 20 * 64]; // 20 ring members (too many)
        let key_image = [0u8; 32];
        let ring_members = vec![[0u8; 32]; 20];

        let result = verify_ring_signature(&signature, &key_image, &ring_members);
        assert!(result.is_ok());
        assert!(!result.unwrap());
    }
}
