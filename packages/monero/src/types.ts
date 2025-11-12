export interface MoneroKeyPair {
  privateSpendKey: Uint8Array;
  privateViewKey: Uint8Array;
  publicSpendKey: Uint8Array;
  publicViewKey: Uint8Array;
}

export interface MoneroAddress {
  address: string;
  spendKey: Uint8Array;
  viewKey: Uint8Array;
}

export interface StealthAddressEnhanced {
  address: string;
  txPublicKey: Uint8Array;
  outputIndex: number;
  privateKey?: Uint8Array;
}

export interface RingSignature {
  keyImage: Uint8Array;
  c: Uint8Array[];
  r: Uint8Array[];
  ringMembers: Uint8Array[];
}

export interface RingCTOutput {
  commitment: Uint8Array;
  rangeBitmap: Uint8Array[];
  mask: Uint8Array;
}
