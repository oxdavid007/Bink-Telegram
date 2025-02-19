import { Inject, Injectable } from "@nestjs/common";
import { TelegramBot } from "../telegram-bot";
import { Handler, DefaultHandlerParams } from "./handler";
import Redis from "ioredis";
import { UserService } from "@/business/services/user.service";
import {
  getSolscanLink,
  getTokenBalance,
  getTokenBalanceRaw,
  parseTransactionWithTokens,
} from "../utils/solana.utils";
import { OnchainService } from "@/business/services/onchain.service";
import { Connection, PublicKey } from "@solana/web3.js";
import { TransactionService } from "@/business/services/transaction.service";
import { TransactionType } from "@/database/entities";
import { SolPriceService } from "@/business/services/sol-price.service";
import { formatBigNumber } from "@/shared/number";
import { formatSmartNumber } from "../utils";
import { BN } from "@coral-xyz/anchor";

@Injectable()
export class ConfirmSellHandler implements Handler {
  constructor(
    private readonly bot: TelegramBot,
    @Inject("TELEGRAM_BOT_STATE")
    private readonly botStateStore: Redis,
    private readonly onchainService: OnchainService,
    private readonly userService: UserService,
    @Inject("SOLANA_CONNECTION")
    private readonly solanaConnection: Connection,
    private readonly transactionService: TransactionService,
    private readonly solPriceService: SolPriceService
  ) {}

  handler = async (data: DefaultHandlerParams) => {
    try {
      const [currentState, user, solPrice] = await Promise.all([
        await this.bot.getSellTokenState(data.telegramId),
        await this.userService.getOrCreateUser({
          telegram_id: data.telegramId,
        }),
        await this.solPriceService.getSolPrice(),
      ]);

      const { amount } = await getTokenBalanceRaw(
        this.solanaConnection,
        new PublicKey(user.wallet_sol_address),
        new PublicKey(currentState.tokenAddress)
      );

      // Send processing message
      const message = await this.bot.sendMessage(
        data.chatId,
        "🔄 Processing your sell transaction..."
      );

      // const tx = await this.onchainService.sell(
      //   await this.userService.getPrivateKeyByTelegramId(data.telegramId),
      //   currentState.tokenAddress,
      //   amount.mul(new BN(currentState.percentage)).div(new BN(100)).toNumber(),
      //   Number(currentState.slippage)
      // );
      const tx = "123";
      const txReceipt = {
        confirmed: true,
      };

      if (txReceipt.confirmed) {
        // Send success message with transaction details
        const successMessage =
          `✅ Sell Success!\n\n` +
          `<a href="${getSolscanLink({ txHash: tx })}">View on Solscan</a>`;

        await this.bot.editMessageText(successMessage, {
          message_id: message.message_id,
          parse_mode: "HTML",
          chat_id: data.chatId,
          disable_web_page_preview: true,
        });

        const parseTx = await parseTransactionWithTokens(
          this.solanaConnection,
          tx
        );
        const userAddress = user.wallet_sol_address;
        const solOut = Math.abs(parseTx[userAddress].solChange);
        const tokenIn = Math.abs(
          parseTx[userAddress].tokenChanges[currentState.tokenAddress]
        );
        const usd = solOut * solPrice;

        const [remainingBalance] = await Promise.all([
          // Check remaining balance after sell
          getTokenBalance(
            this.solanaConnection,
            new PublicKey(user.wallet_sol_address),
            new PublicKey(currentState.tokenAddress)
          ),
          this.transactionService.createTransaction({
            type: TransactionType.SELL,
            sol_amount: solOut,
            sol_amount_by_usd: usd,
            token_amount: tokenIn,
            token_amount_by_usd: usd,
            tx_hash: tx,
            user_id: user.id,
            token_address: currentState.tokenAddress,
          }),
          this.botStateStore.del(`sell_token:${data.telegramId}`),
        ]);

        // If balance is 0 (sold everything), calculate and show PnL
        if (remainingBalance === 0) {
          const pnlData = await this.userService.calculateTokenPNL(
            data.telegramId,
            currentState.tokenAddress
          );

          const pnlMessage = `
📊 Position Closed - PnL Summary

💵 Total Invested: <code>$${formatBigNumber(pnlData.totalBuyUsd)}</code>
💰 Total Received: <code>$${formatBigNumber(pnlData.totalSellUsd)}</code>
${pnlData.pnl >= 0 ? "📈" : "📉"} PnL: <code>$${formatSmartNumber(pnlData.pnl)}</code> (<code>${formatSmartNumber(pnlData.netValue)}%</code>)
`;

          await this.bot.sendMessage(data.chatId, pnlMessage);
        }
      } else {
        await this.bot.editMessageText(
          "❌ Transaction Not Confirmed\n\n" +
            "Please try again or contact support if the issue persists.",
          {
            message_id: message.message_id,
            chat_id: data.chatId,
          }
        );
      }
    } catch (error) {
      console.error("Error confirming sell:", error);

      const errorMessage =
        `❌ Transaction Failed\n\n` +
        `Error: ${error.message}\n\n` +
        `Please try again or contact support if the issue persists.`;

      await this.bot.sendMessage(data.chatId, errorMessage);
    }
  };
}
