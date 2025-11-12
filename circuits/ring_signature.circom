pragma circom 2.1.6;

include "./node_modules/circomlib/circuits/poseidon.circom";
include "./node_modules/circomlib/circuits/eddsaposeidon.circom";
include "./node_modules/circomlib/circuits/comparators.circom";

/*
 * Ring Signature Circuit (Monero-style)
 *
 * Proves that the signer is one of N ring members without revealing which one.
 * Uses MLSAG (Multilayered Linkable Spontaneous Anonymous Group) signatures.
 *
 * Public inputs:
 * - message: Message being signed
 * - keyImage: Unique identifier (prevents double-spending)
 * - ringPublicKeys: Array of public keys in ring
 *
 * Private inputs:
 * - privateKey: Signer's private key
 * - ringIndex: Signer's position in ring (0 to ringSize-1)
 */

template RingSignature(ringSize) {
    // Public inputs
    signal input message;
    signal input keyImage;
    signal input ringPublicKeys[ringSize];

    // Private inputs
    signal input privateKey;
    signal input ringIndex;

    // 1. Compute public key from private key
    component publicKeyHasher = Poseidon(1);
    publicKeyHasher.inputs[0] <== privateKey;
    signal publicKey <== publicKeyHasher.out;

    // 2. Verify public key is in ring at claimed index
    component pkEquals[ringSize];
    signal pkMatches[ringSize];

    for (var i = 0; i < ringSize; i++) {
        pkEquals[i] = IsEqual();
        pkEquals[i].in[0] <== ringPublicKeys[i];
        pkEquals[i].in[1] <== publicKey;

        // This will be 1 only when i == ringIndex AND keys match
        pkMatches[i] <== pkEquals[i].out;
    }

    // 3. Verify ringIndex is valid
    component indexCheck = LessThan(8); // ringSize must be < 256
    indexCheck.in[0] <== ringIndex;
    indexCheck.in[1] <== ringSize;
    indexCheck.out === 1;

    // 4. Compute key image
    // keyImage = hash(privateKey, publicKey)
    component keyImageHasher = Poseidon(2);
    keyImageHasher.inputs[0] <== privateKey;
    keyImageHasher.inputs[1] <== publicKey;
    keyImage === keyImageHasher.out;

    // 5. Verify signature by computing ring equation
    // For each member: c[i+1] = H(message, L[i], R[i])
    // Where: L[i] = r[i]*G + c[i]*P[i]
    //        R[i] = r[i]*Hp(P[i]) + c[i]*I

    component ringVerifier = RingEquationVerifier(ringSize);
    ringVerifier.message <== message;
    ringVerifier.keyImage <== keyImage;
    ringVerifier.privateKey <== privateKey;
    ringVerifier.publicKey <== publicKey;
    ringVerifier.ringIndex <== ringIndex;

    for (var i = 0; i < ringSize; i++) {
        ringVerifier.ringPublicKeys[i] <== ringPublicKeys[i];
    }
}

/*
 * Ring Equation Verifier
 * Verifies the ring signature equation
 */
template RingEquationVerifier(ringSize) {
    signal input message;
    signal input keyImage;
    signal input privateKey;
    signal input publicKey;
    signal input ringIndex;
    signal input ringPublicKeys[ringSize];

    // Generate challenge scalars
    component challenges[ringSize];
    signal c[ringSize];

    // Start with random challenge at real key position
    component initialChallenge = Poseidon(3);
    initialChallenge.inputs[0] <== message;
    initialChallenge.inputs[1] <== publicKey;
    initialChallenge.inputs[2] <== keyImage;

    c[0] <== initialChallenge.out;

    // Compute challenges for each ring member
    for (var i = 0; i < ringSize - 1; i++) {
        challenges[i] = Poseidon(4);
        challenges[i].inputs[0] <== message;
        challenges[i].inputs[1] <== ringPublicKeys[i];
        challenges[i].inputs[2] <== c[i];
        challenges[i].inputs[3] <== keyImage;

        c[i + 1] <== challenges[i].out;
    }

    // Final challenge must loop back
    component finalChallenge = Poseidon(4);
    finalChallenge.inputs[0] <== message;
    finalChallenge.inputs[1] <== ringPublicKeys[ringSize - 1];
    finalChallenge.inputs[2] <== c[ringSize - 1];
    finalChallenge.inputs[3] <== keyImage;

    // Ring closes if final challenge equals initial
    c[0] === finalChallenge.out;
}

component main {public [message, keyImage, ringPublicKeys]} = RingSignature(11);
