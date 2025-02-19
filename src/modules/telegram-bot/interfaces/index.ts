export interface TokenInfoState {
  mode: "swap" | "limit" | "dca";
  solAmount: string;
  slippage: string;
  tokenAddress: string;
  updatedAt: number;
  customAmount: string;
}


export interface SellTokenState {
  mode: "swap" | "limit" | "dca";
  percentage: string;
  slippage: string;
  tokenAddress: string;
  updatedAt: number;
  customPercentage?: string;
}
