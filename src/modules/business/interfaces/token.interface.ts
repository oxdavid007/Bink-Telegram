import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ITokenPopularResponse {
  @ApiPropertyOptional()
  logoURI: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  address: string;

  @ApiProperty()
  symbol: string;

  @ApiProperty()
  supply: number;
}

export interface IResponse<T = any> {
  event_name: string;
  data: T;
}

export interface IToken {
  id: string;
  sol_amount: number;
  token_index: string;
  total_share_supply: number;
  last_traded_at: string;
  address: string;
  name: string;
  symbol: string;
  description: string | null;
  image_uri: string | null;
  metadata_uri: string | null;
  twitter: string | null;
  telegram: string | null;
  discord: string | null;
  website: string | null;
  last_price: number;
  target_price: number;
  usd_market_cap: number;
  market_cap: number;
  total_supply: string;
  status: string;
  raydium_pool: string | null;
  complete: boolean;
  created_at: string;
  is_socket_created: boolean;
  pair_address: string | null;
  full_filled: boolean;
  pair_info: any | null;
  winner_at: string | null;
  total_holders: number;
  total_volumes: number;
  pair_created_at: string | null;
  supported_dex: string | null;
  trading_fee: number;
  init_price: number;
  target_supply: number;
  total_burn: number;
  creator_address: string;
  creator_username: string | null;
  percent_target: number;
  reply_count: number;
  last_price_usd: number;
  token_index_private: string | null;
  creator_id: string | null;
  bonding_curve: string | null;
  deposit_mint: string | null;
  updated_at: string;
}

export interface ICreateToken {
  id: string;
  sol_amount: number;
  token_index: string;
  total_share_supply: string;
  last_traded_at: Date;
  address: string;
  name: string;
  symbol: string;
  description: string;
  image_uri: string;
  metadata_uri: string;
  twitter: string;
  telegram: string;
  discord: string;
  website: string;
  last_price: number;
  target_price: number;
  usd_market_cap: number;
  market_cap: number;
  total_supply: string;
  status: string;
  raydium_pool: string;
  complete: boolean;
  created_at: Date;
  current_supply: string;
  is_socket_created: boolean;
  pair_address: string;
  full_filled: boolean;
  pair_info: string;
  winner_at: Date;
  total_holders: number;
  total_volumes: number;
  pair_created_at: Date;
  supported_dex: string[];
  trading_fee: number;
  init_price: number;
  target_supply: string;
  total_burn: string;

  // Creator fields
  creator_address: string;
  creator_username: string;
}
