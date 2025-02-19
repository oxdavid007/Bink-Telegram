import { getAllTokenBalances } from "@/telegram-bot/utils/solana.utils";
import { Inject, Injectable } from "@nestjs/common";
import { Connection, PublicKey } from "@solana/web3.js";
import axios from "axios";
import Redis from "ioredis";

interface CoinDetailResponse {
  messages: string;
  data: {
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
    current_supply: string;
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
  };
  status_code: number;
}

@Injectable()
export class ApiService {
  private readonly baseUrl = process.env.API_URL;

  constructor(
    @Inject("CACHE_MANAGER") private cacheManager: Redis,
    @Inject("SOLANA_CONNECTION") private connection: Connection
  ) {}

  async getCoinDetail(tokenIndex: string): Promise<CoinDetailResponse> {
    const cacheKey = `coin_detail_${tokenIndex}`;

    const cachedData = await this.cacheManager.get(cacheKey);
    if (cachedData) {
      return JSON.parse(cachedData);
    }

    try {
      const response = await axios.get<CoinDetailResponse>(
        `${this.baseUrl}/coins/${tokenIndex}`,
        {
          headers: {
            accept: "*/*",
          },
        }
      );

      await this.cacheManager.set(
        cacheKey,
        JSON.stringify(response.data),
        "EX",
        60 * 60 // 1 hour
      );

      return response.data;
    } catch (error) {
      throw error;
    }
  }

  async getTokenBalance(owner: string) {
    // get all token balances
    const tokenInfos = await getAllTokenBalances(
      this.connection,
      new PublicKey(owner)
    );
    // get token detail
    const tokens = await Promise.all(
      tokenInfos.map(async (token) => {
        const tokenInfo = await this.getCoinDetail(token.mint);
        return {
          ...token,
          tokenInfo,
        };
      })
    );
    // filter out tokens that don't have token detail
    return tokens.filter((token) => !!token.tokenInfo.data.created_at);
  }
}
