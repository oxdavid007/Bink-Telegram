import { Inject, Injectable } from "@nestjs/common";
import axios from "axios";
import Redis from "ioredis";

@Injectable()
export class SolPriceService {
  private readonly COINGECKO_API = "https://api.coingecko.com/api/v3";
  private readonly SOL_PRICE_CACHE_KEY = "sol_price";
  private readonly CACHE_TTL = 360; // 360 seconds

  constructor(@Inject("CACHE_MANAGER") private readonly redisService: Redis) {}

  /**
   * Get current SOL price in USD
   * @returns SOL/USD price
   */
  async getCurrentPrice(): Promise<number> {
    // Check cache first
    const cachedPrice = await this.redisService.get(this.SOL_PRICE_CACHE_KEY);
    if (cachedPrice) {
      return Number(cachedPrice);
    }

    try {
      const response = await axios.get(
        `${this.COINGECKO_API}/simple/price?ids=solana&vs_currencies=usd`
      );
      const price = response.data.solana.usd;

      // Cache new price with TTL
      await this.redisService.set(
        this.SOL_PRICE_CACHE_KEY,
        price.toString(),
        "EX",
        this.CACHE_TTL
      );

      return price;
    } catch (error) {
      console.error("Error fetching SOL price:", error);
      throw new Error("Failed to fetch SOL price");
    }
  }

  /**
   * Convert SOL amount to USD
   * @param solAmount Amount of SOL
   * @returns Equivalent value in USD
   */
  async convertSolToUsd(solAmount: number): Promise<number> {
    const currentPrice = await this.getCurrentPrice();
    return solAmount * currentPrice;
  }

  /**
   * Convert USD amount to SOL
   * @param usdAmount Amount in USD
   * @returns Equivalent amount in SOL
   */
  async convertUsdToSol(usdAmount: number): Promise<number> {
    const currentPrice = await this.getCurrentPrice();
    return usdAmount / currentPrice;
  }

  async getSolPrice(): Promise<number> {
    try {
      const response = await axios.get(
        "https://public-api.birdeye.so/defi/price?address=So11111111111111111111111111111111111111112",
        {
          headers: {
            "X-API-KEY": process.env.BIRDEYE_API_KEY,
            accept: "application/json",
            "x-chain": "solana",
          },
        }
      );

      if (response.data.success && response.data.data.value) {
        return response.data.data.value;
      }

      throw new Error("Invalid response from Birdeye API");
    } catch (error) {
      console.error("Error fetching SOL price from Birdeye:", error);
      // throw new Error("Failed to fetch SOL price");
      return 200;
    }
  }
}
