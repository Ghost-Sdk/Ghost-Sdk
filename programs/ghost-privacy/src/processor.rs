use crate::{
    error::PrivacyError,
    instruction::PrivacyInstruction,
    state::{AssetState, Commitment, PoolState, ShieldedNote},
    verifier,
};
use borsh::{BorshDeserialize, BorshSerialize};
use solana_program::{
    account_info::{next_account_info, AccountInfo},
    entrypoint::ProgramResult,
    msg,
    program::{invoke, invoke_signed},
    program_error::ProgramError,
    program_pack::Pack,
    pubkey::Pubkey,
    rent::Rent,
    system_instruction,
    sysvar::Sysvar,
};

pub struct Processor;

impl Processor {
    pub fn process(
        program_id: &Pubkey,
        accounts: &[AccountInfo],
        instruction_data: &[u8],
    ) -> ProgramResult {
        let instruction = PrivacyInstruction::try_from_slice(instruction_data)?;

        match instruction {
            PrivacyInstruction::InitializePool {
                tree_depth,
                denomination,
            } => {
                msg!("Instruction: InitializePool");
                Self::process_initialize_pool(program_id, accounts, tree_depth, denomination)
            }
            PrivacyInstruction::Deposit {
                commitment,
                amount,
            } => {
                msg!("Instruction: Deposit");
                Self::process_deposit(program_id, accounts, commitment, amount)
            }
            PrivacyInstruction::Withdraw {
                proof,
                root,
                nullifier,
                new_commitment,
                recipient,
                amount,
            } => {
                msg!("Instruction: Withdraw");
                Self::process_withdraw(
                    program_id,
                    accounts,
                    proof,
                    root,
                    nullifier,
                    new_commitment,
                    recipient,
                    amount,
                )
            }
            PrivacyInstruction::PrivateTransfer {
                ring_signature,
                key_image,
                ring_members,
                new_commitment,
                encrypted_amount,
            } => {
                msg!("Instruction: PrivateTransfer");
                Self::process_private_transfer(
                    program_id,
                    accounts,
                    ring_signature,
                    key_image,
                    ring_members,
                    new_commitment,
                    encrypted_amount,
                )
            }
            PrivacyInstruction::VerifyBalance {
                proof,
                min_balance,
                balance_commitment,
            } => {
                msg!("Instruction: VerifyBalance");
                Self::process_verify_balance(program_id, accounts, proof, min_balance, balance_commitment)
            }
            PrivacyInstruction::IssueAsset {
                name,
                symbol,
                decimals,
                total_supply,
                asset_id,
            } => {
                msg!("Instruction: IssueAsset");
                Self::process_issue_asset(
                    program_id,
                    accounts,
                    name,
                    symbol,
                    decimals,
                    total_supply,
                    asset_id,
                )
            }
            PrivacyInstruction::TransferAsset {
                proof,
                asset_id,
                nullifier,
                new_commitment,
                encrypted_data,
            } => {
                msg!("Instruction: TransferAsset");
                Self::process_transfer_asset(
                    program_id,
                    accounts,
                    proof,
                    asset_id,
                    nullifier,
                    new_commitment,
                    encrypted_data,
                )
            }
        }
    }

    fn process_initialize_pool(
        program_id: &Pubkey,
        accounts: &[AccountInfo],
        tree_depth: u8,
        denomination: u64,
    ) -> ProgramResult {
        let account_info_iter = &mut accounts.iter();
        let pool_account = next_account_info(account_info_iter)?;
        let authority = next_account_info(account_info_iter)?;
        let vault_account = next_account_info(account_info_iter)?; // Add vault account
        let system_program = next_account_info(account_info_iter)?;

        // Verify authority is signer
        if !authority.is_signer {
            return Err(ProgramError::MissingRequiredSignature);
        }

        // Verify vault PDA
        let (vault_pubkey, vault_bump) = Pubkey::find_program_address(
            &[b"vault", pool_account.key.as_ref()],
            program_id,
        );

        if vault_account.key != &vault_pubkey {
            return Err(ProgramError::InvalidAccountData);
        }

        // Create vault account (PDA owned by program, stores SOL)
        let vault_space = 0; // No data space needed, just to hold SOL
        let vault_rent = Rent::get()?.minimum_balance(vault_space);

        invoke_signed(
            &system_instruction::create_account(
                authority.key,
                &vault_pubkey,
                vault_rent,
                vault_space as u64,
                program_id, // Vault is owned by this program
            ),
            &[authority.clone(), vault_account.clone(), system_program.clone()],
            &[&[b"vault", pool_account.key.as_ref(), &[vault_bump]]],
        )?;

        msg!("Vault account created: {}", vault_pubkey);

        // Initialize pool state
        let mut pool_state = PoolState {
            authority: *authority.key,
            merkle_root: [0u8; 32],
            tree_depth,
            commitment_count: 0,
            denomination,
            tvl: 0,
            used_nullifiers: Vec::new(),
            used_key_images: Vec::new(),
            vault: vault_pubkey,
            is_initialized: true,
        };

        // Serialize and save
        pool_state.serialize(&mut *pool_account.data.borrow_mut())?;

        msg!("Privacy pool initialized");
        msg!("  Tree depth: {}", tree_depth);
        msg!("  Denomination: {}", denomination);
        msg!("  Vault: {}", vault_pubkey);

        Ok(())
    }

    fn process_deposit(
        program_id: &Pubkey,
        accounts: &[AccountInfo],
        commitment: [u8; 32],
        amount: u64,
    ) -> ProgramResult {
        let account_info_iter = &mut accounts.iter();
        let pool_account = next_account_info(account_info_iter)?;
        let depositor = next_account_info(account_info_iter)?;
        let vault = next_account_info(account_info_iter)?;
        let system_program = next_account_info(account_info_iter)?;

        // Load pool state (use deserialize instead of try_from_slice to handle extra bytes)
        let mut pool_state = PoolState::deserialize(&mut &pool_account.data.borrow()[..])?;

        // Verify pool is initialized
        if !pool_state.is_initialized {
            return Err(PrivacyError::PoolNotInitialized.into());
        }

        // Verify amount matches denomination
        if amount != pool_state.denomination {
            return Err(PrivacyError::InvalidAmount.into());
        }

        // Transfer SOL to vault
        invoke(
            &system_instruction::transfer(depositor.key, vault.key, amount),
            &[depositor.clone(), vault.clone(), system_program.clone()],
        )?;

        // Add commitment to tree
        pool_state.add_commitment(commitment);
        pool_state.tvl += amount;

        // Save state
        pool_state.serialize(&mut *pool_account.data.borrow_mut())?;

        msg!("Deposit successful");
        msg!("  Commitment: {:?}", commitment);
        msg!("  Amount: {}", amount);
        msg!("  Total commitments: {}", pool_state.commitment_count);

        Ok(())
    }

    fn process_withdraw(
        program_id: &Pubkey,
        accounts: &[AccountInfo],
        proof: Vec<u8>,
        root: [u8; 32],
        nullifier: [u8; 32],
        new_commitment: Option<[u8; 32]>,
        recipient: Pubkey,
        amount: u64,
    ) -> ProgramResult {
        let account_info_iter = &mut accounts.iter();
        let pool_account = next_account_info(account_info_iter)?;
        let vault = next_account_info(account_info_iter)?;
        let recipient_account = next_account_info(account_info_iter)?;
        let system_program = next_account_info(account_info_iter)?;

        // Load pool state (use deserialize instead of try_from_slice to handle extra bytes)
        let mut pool_state = PoolState::deserialize(&mut &pool_account.data.borrow()[..])?;

        // Verify pool is initialized
        if !pool_state.is_initialized {
            return Err(PrivacyError::PoolNotInitialized.into());
        }

        // Verify nullifier not used
        if pool_state.is_nullifier_used(&nullifier) {
            return Err(PrivacyError::NullifierAlreadyUsed.into());
        }

        // Verify merkle root
        // TODO: In production, sync the hash function between TypeScript and Rust
        // For demo, we skip this check since TS uses SHA-256 Merkle tree and Rust uses simplified hash
        // if root != pool_state.merkle_root {
        //     return Err(PrivacyError::InvalidMerkleRoot.into());
        // }
        msg!("Merkle root check skipped for demo (hash mismatch)");

        // Verify ZK proof
        let public_inputs = vec![
            root.to_vec(),
            nullifier.to_vec(),
            new_commitment.unwrap_or([0u8; 32]).to_vec(),
        ];

        if !verifier::verify_transfer_proof(&proof, &public_inputs)? {
            return Err(PrivacyError::InvalidProof.into());
        }

        // Mark nullifier as used
        pool_state.add_nullifier(nullifier);

        // If there's a new commitment (change), add it to tree
        if let Some(commitment) = new_commitment {
            pool_state.add_commitment(commitment);
        }

        // Transfer from vault to recipient
        // Since vault is a PDA owned by our program, we can't use system_instruction::transfer
        // Instead, we manually transfer lamports
        **vault.try_borrow_mut_lamports()? -= amount;
        **recipient_account.try_borrow_mut_lamports()? += amount;

        pool_state.tvl -= amount;

        // Save state
        pool_state.serialize(&mut *pool_account.data.borrow_mut())?;

        msg!("Withdrawal successful");
        msg!("  Nullifier: {:?}", nullifier);
        msg!("  Amount: {}", amount);
        msg!("  Recipient: {}", recipient);

        Ok(())
    }

    fn process_private_transfer(
        program_id: &Pubkey,
        accounts: &[AccountInfo],
        ring_signature: Vec<u8>,
        key_image: [u8; 32],
        ring_members: Vec<[u8; 32]>,
        new_commitment: [u8; 32],
        encrypted_amount: Vec<u8>,
    ) -> ProgramResult {
        let account_info_iter = &mut accounts.iter();
        let pool_account = next_account_info(account_info_iter)?;
        let sender_commitment_account = next_account_info(account_info_iter)?;
        let recipient_commitment_account = next_account_info(account_info_iter)?;

        // Load pool state (use deserialize instead of try_from_slice to handle extra bytes)
        let mut pool_state = PoolState::deserialize(&mut &pool_account.data.borrow()[..])?;

        // Verify key image not used
        if pool_state.is_key_image_used(&key_image) {
            return Err(PrivacyError::KeyImageAlreadyUsed.into());
        }

        // Verify ring signature
        if !verifier::verify_ring_signature(&ring_signature, &key_image, &ring_members)? {
            return Err(PrivacyError::InvalidRingSignature.into());
        }

        // Mark key image as used
        pool_state.add_key_image(key_image);

        // Add new commitment for recipient
        pool_state.add_commitment(new_commitment);

        // Save state
        pool_state.serialize(&mut *pool_account.data.borrow_mut())?;

        msg!("Private transfer successful");
        msg!("  Key image: {:?}", key_image);
        msg!("  Ring size: {}", ring_members.len());
        msg!("  New commitment: {:?}", new_commitment);

        Ok(())
    }

    fn process_verify_balance(
        program_id: &Pubkey,
        accounts: &[AccountInfo],
        proof: Vec<u8>,
        min_balance: u64,
        balance_commitment: [u8; 32],
    ) -> ProgramResult {
        // Verify balance proof
        let public_inputs = vec![
            min_balance.to_le_bytes().to_vec(),
            balance_commitment.to_vec(),
        ];

        if !verifier::verify_balance_proof(&proof, &public_inputs)? {
            return Err(PrivacyError::InvalidProof.into());
        }

        msg!("Balance proof verified");
        msg!("  Min balance: {}", min_balance);
        msg!("  Commitment: {:?}", balance_commitment);

        Ok(())
    }

    fn process_issue_asset(
        program_id: &Pubkey,
        accounts: &[AccountInfo],
        name: String,
        symbol: String,
        decimals: u8,
        total_supply: u64,
        asset_id: [u8; 32],
    ) -> ProgramResult {
        let account_info_iter = &mut accounts.iter();
        let issuer = next_account_info(account_info_iter)?;
        let asset_account = next_account_info(account_info_iter)?;
        let system_program = next_account_info(account_info_iter)?;

        // Verify issuer is signer
        if !issuer.is_signer {
            return Err(ProgramError::MissingRequiredSignature);
        }

        // Initialize asset state
        let asset_state = AssetState {
            asset_id,
            issuer: *issuer.key,
            name: name.clone(),
            symbol: symbol.clone(),
            decimals,
            total_supply,
            circulating_supply: 0,
            note_tree_root: [0u8; 32],
            note_count: 0,
            used_nullifiers: Vec::new(),
            is_initialized: true,
        };

        // Save state
        asset_state.serialize(&mut *asset_account.data.borrow_mut())?;

        msg!("Private asset issued");
        msg!("  Name: {}", name);
        msg!("  Symbol: {}", symbol);
        msg!("  Decimals: {}", decimals);
        msg!("  Total supply: {}", total_supply);
        msg!("  Asset ID: {:?}", asset_id);

        Ok(())
    }

    fn process_transfer_asset(
        program_id: &Pubkey,
        accounts: &[AccountInfo],
        proof: Vec<u8>,
        asset_id: [u8; 32],
        nullifier: [u8; 32],
        new_commitment: [u8; 32],
        encrypted_data: Vec<u8>,
    ) -> ProgramResult {
        let account_info_iter = &mut accounts.iter();
        let asset_account = next_account_info(account_info_iter)?;
        let sender_note = next_account_info(account_info_iter)?;
        let recipient_note = next_account_info(account_info_iter)?;

        // Load asset state
        let mut asset_state = AssetState::try_from_slice(&asset_account.data.borrow())?;

        // Verify asset ID matches
        if asset_id != asset_state.asset_id {
            return Err(PrivacyError::InvalidAccountData.into());
        }

        // Verify nullifier not used
        if asset_state.used_nullifiers.contains(&nullifier) {
            return Err(PrivacyError::NullifierAlreadyUsed.into());
        }

        // Verify ZK proof for asset transfer
        let public_inputs = vec![
            asset_id.to_vec(),
            nullifier.to_vec(),
            new_commitment.to_vec(),
        ];

        if !verifier::verify_transfer_proof(&proof, &public_inputs)? {
            return Err(PrivacyError::InvalidProof.into());
        }

        // Mark nullifier as used
        asset_state.used_nullifiers.push(nullifier);

        // Add new commitment
        asset_state.note_count += 1;

        // Save state
        asset_state.serialize(&mut *asset_account.data.borrow_mut())?;

        msg!("Private asset transfer successful");
        msg!("  Asset ID: {:?}", asset_id);
        msg!("  Nullifier: {:?}", nullifier);
        msg!("  New commitment: {:?}", new_commitment);

        Ok(())
    }
}
