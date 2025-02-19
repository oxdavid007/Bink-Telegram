import { Inject, OnApplicationBootstrap } from "@nestjs/common";
import { Connection } from "@solana/web3.js";
import * as anchor from "@coral-xyz/anchor";
import bs58 from "bs58";

export class OnchainService implements OnApplicationBootstrap {
  rpc: string;

  constructor(
    @Inject("SOLANA_CONNECTION")
    private readonly connection: Connection
  ) {}
  async onApplicationBootstrap() {}

  /**
   * Calculate slippage range based on percentage
   * @param amount Token amount
   * @param slippagePercent Slippage percentage (1-100)
   * @returns [minAmount, maxAmount]
   */
  private calculateSlippageRange(
    amount: number,
    slippagePercent: number = 5
  ): [number, number] {
    const slippageMultiplier = slippagePercent / 100;
    const minAmount = Math.floor(amount * (1 - slippageMultiplier));
    const maxAmount = Math.ceil(amount * (1 + slippageMultiplier));
    return [minAmount, maxAmount];
  }

  async buy(
    privateKey: string,
    mint: string = "2KVHSq4fSbTYQr3wBuT67gyENeczJkX6ST9tmK5HaQc6",
    amount: number = 1e9,
    slippagePercent: number = 5
  ): Promise<string> {
    const connection = this.connection;
    const creator = anchor.web3.Keypair.fromSecretKey(bs58.decode(privateKey));
    const creatorPubkey = creator.publicKey;
    const pumpMint = new anchor.web3.PublicKey(mint);

    const [minAmount, maxAmount] = this.calculateSlippageRange(
      amount,
      slippagePercent
    );

    const { finalIxs } = {
      finalIxs: [],
    };

    return "txHash";
  }

  async fetchAndPersistBondingCurve(mint: string) {}

  calculateBuyPumpAmount(mint: string, amount: number) {
    return 0;
  }

  calculateSellPumpAmount(mint: string, amount: number) {
    return 0;
  }

  async sell(
    privateKey: string,
    mint: string = "2KVHSq4fSbTYQr3wBuT67gyENeczJkX6ST9tmK5HaQc6",
    amount: number = 1e6,
    slippagePercent: number = 5
  ): Promise<string> {
    const connection = this.connection;
    const creator = anchor.web3.Keypair.fromSecretKey(bs58.decode(privateKey));
    const creatorPubkey = creator.publicKey;
    const pumpMint = new anchor.web3.PublicKey(mint);

    const [minAmount, maxAmount] = this.calculateSlippageRange(
      amount,
      slippagePercent
    );

    const { finalIxs } = {
      finalIxs: [],
    };

    return "txHash";
  }
}
