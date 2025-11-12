pragma circom 2.1.6;

include "./node_modules/circomlib/circuits/poseidon.circom";
include "./node_modules/circomlib/circuits/comparators.circom";
include "./node_modules/circomlib/circuits/bitify.circom";
include "./node_modules/circomlib/circuits/eddsaposeidon.circom";
include "./node_modules/circomlib/circuits/mux1.circom";

/*
 * Private Transfer Circuit
 *
 * Proves that a user can spend a commitment without revealing:
 * - Who is spending (sender)
 * - How much (amount)
 * - To whom (recipient)
 *
 * Public inputs:
 * - root: Merkle root of commitment tree
 * - nullifier: Unique identifier to prevent double-spending
 * - newCommitment: New commitment for recipient
 *
 * Private inputs:
 * - amount: Amount being transferred
 * - privateKey: Sender's private key
 * - pathElements: Merkle proof path
 * - pathIndices: Merkle proof indices
 * - recipientPublicKey: Recipient's public key
 * - nonce: Random nonce for commitment
 */

template PrivateTransfer(levels) {
    // Public inputs
    signal input root;
    signal input nullifier;
    signal input newCommitment;

    // Private inputs
    signal input amount;
    signal input privateKey;
    signal input pathElements[levels];
    signal input pathIndices[levels];
    signal input recipientPublicKey;
    signal input nonce;
    signal input oldNonce;

    // Derived values
    signal publicKey;
    signal oldCommitment;

    // 1. Verify sender owns the private key
    // publicKey = hash(privateKey)
    component privateKeyHasher = Poseidon(1);
    privateKeyHasher.inputs[0] <== privateKey;
    publicKey <== privateKeyHasher.out;

    // 2. Compute old commitment
    // commitment = hash(publicKey, amount, oldNonce)
    component oldCommitmentHasher = Poseidon(3);
    oldCommitmentHasher.inputs[0] <== publicKey;
    oldCommitmentHasher.inputs[1] <== amount;
    oldCommitmentHasher.inputs[2] <== oldNonce;
    oldCommitment <== oldCommitmentHasher.out;

    // 3. Verify commitment exists in tree (Merkle proof)
    component merkleProof = MerkleTreeInclusionProof(levels);
    merkleProof.leaf <== oldCommitment;
    for (var i = 0; i < levels; i++) {
        merkleProof.pathElements[i] <== pathElements[i];
        merkleProof.pathIndices[i] <== pathIndices[i];
    }
    merkleProof.root === root;

    // 4. Compute nullifier
    // nullifier = hash(oldCommitment, privateKey)
    component nullifierHasher = Poseidon(2);
    nullifierHasher.inputs[0] <== oldCommitment;
    nullifierHasher.inputs[1] <== privateKey;
    nullifier === nullifierHasher.out;

    // 5. Verify new commitment
    // newCommitment = hash(recipientPublicKey, amount, nonce)
    component newCommitmentHasher = Poseidon(3);
    newCommitmentHasher.inputs[0] <== recipientPublicKey;
    newCommitmentHasher.inputs[1] <== amount;
    newCommitmentHasher.inputs[2] <== nonce;
    newCommitment === newCommitmentHasher.out;

    // 6. Range check on amount (optional, ensures valid amount)
    component amountCheck = Num2Bits(64);
    amountCheck.in <== amount;
}

/*
 * Merkle Tree Inclusion Proof
 * Verifies that a leaf exists in a Merkle tree with given root
 */
template MerkleTreeInclusionProof(levels) {
    signal input leaf;
    signal input pathElements[levels];
    signal input pathIndices[levels];
    signal output root;

    component hashers[levels];
    component mux[levels];

    signal levelHashes[levels + 1];
    levelHashes[0] <== leaf;

    for (var i = 0; i < levels; i++) {
        // Select left and right based on path index
        mux[i] = MultiMux1(2);
        mux[i].c[0][0] <== levelHashes[i];
        mux[i].c[0][1] <== pathElements[i];
        mux[i].c[1][0] <== pathElements[i];
        mux[i].c[1][1] <== levelHashes[i];
        mux[i].s <== pathIndices[i];

        // Hash left and right
        hashers[i] = Poseidon(2);
        hashers[i].inputs[0] <== mux[i].out[0];
        hashers[i].inputs[1] <== mux[i].out[1];

        levelHashes[i + 1] <== hashers[i].out;
    }

    root <== levelHashes[levels];
}

// Main component
component main {public [root, nullifier, newCommitment]} = PrivateTransfer(20);
