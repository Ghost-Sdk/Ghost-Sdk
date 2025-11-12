pragma circom 2.1.6;

include "./node_modules/circomlib/circuits/poseidon.circom";
include "./node_modules/circomlib/circuits/comparators.circom";

/*
 * Private Balance Proof Circuit
 *
 * Proves that a user has at least a certain balance without revealing:
 * - The exact balance
 * - Which commitments they own
 *
 * Public inputs:
 * - minBalance: Minimum balance to prove
 * - balanceRoot: Root of balance commitment tree
 *
 * Private inputs:
 * - actualBalance: User's actual balance
 * - balanceNonce: Nonce for balance commitment
 * - privateKey: User's private key
 */

template PrivateBalance() {
    // Public inputs
    signal input minBalance;
    signal input balanceCommitment;

    // Private inputs
    signal input actualBalance;
    signal input balanceNonce;
    signal input privateKey;

    // 1. Verify actualBalance >= minBalance
    component balanceCheck = GreaterEqThan(64);
    balanceCheck.in[0] <== actualBalance;
    balanceCheck.in[1] <== minBalance;
    balanceCheck.out === 1;

    // 2. Compute public key from private key
    component publicKeyHasher = Poseidon(1);
    publicKeyHasher.inputs[0] <== privateKey;
    signal publicKey <== publicKeyHasher.out;

    // 3. Verify balance commitment
    // commitment = hash(publicKey, actualBalance, balanceNonce)
    component commitmentHasher = Poseidon(3);
    commitmentHasher.inputs[0] <== publicKey;
    commitmentHasher.inputs[1] <== actualBalance;
    commitmentHasher.inputs[2] <== balanceNonce;
    balanceCommitment === commitmentHasher.out;
}

component main {public [minBalance, balanceCommitment]} = PrivateBalance();
