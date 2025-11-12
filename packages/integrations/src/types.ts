export interface UltimateTransferParams {
  assetId: Uint8Array;
  amount: bigint;
  recipient: string;
  ringSize?: number;
  memo?: string;
}

export interface PrivateTokenParams {
  name: string;
  symbol: string;
  decimals: number;
  totalSupply: bigint;
  description?: string;
}

export interface PrivateSwapParams {
  assetIn: Uint8Array;
  amountIn: bigint;
  assetOut: Uint8Array;
  minAmountOut: bigint;
  recipient: string;
}

export interface PrivateStakeParams {
  assetId: Uint8Array;
  amount: bigint;
  duration: number; // seconds
}
