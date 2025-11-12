// Zcash ZSA Types

export interface ZcashKeyPair {
  spendingKey: Uint8Array;
  viewingKey: Uint8Array;
  incomingViewingKey: Uint8Array;
  outgoingViewingKey: Uint8Array;
  address: Uint8Array;
}

export interface ShieldedAsset {
  assetId: Uint8Array;
  metadata?: {
    name: string;
    symbol: string;
    decimals: number;
    description?: string;
  };
}

export interface ShieldedNote {
  assetId: Uint8Array;
  value: bigint;
  recipient: Uint8Array;
  memo?: Uint8Array;
  noteCommitment: Uint8Array;
  nullifier?: Uint8Array;
}

export interface IssueAssetParams {
  name: string;
  symbol: string;
  decimals: number;
  totalSupply: bigint;
  description?: string;
}

export interface IssuerKeys {
  issuerKey: Uint8Array;
  assetId: Uint8Array;
}

export interface ShieldedTransaction {
  inputs: ShieldedNote[];
  outputs: ShieldedNote[];
  bindingSignature: Uint8Array;
  anchor: Uint8Array;
}

export interface NoteEncryption {
  ephemeralKey: Uint8Array;
  ciphertext: Uint8Array;
  tag: Uint8Array;
}
