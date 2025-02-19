import { Inject, Injectable } from "@nestjs/common";
import { TelegramBot } from "../telegram-bot";
import { Handler, DefaultHandlerParams } from "./handler";
import Redis from "ioredis";
import { UserService } from "@/business/services/user.service";
import {
  getSolscanLink,
  parseTransactionWithTokens,
} from "../utils/solana.utils";
import { OnchainService } from "@/business/services/onchain.service";
import { Connection } from "@solana/web3.js";
import { TransactionService } from "@/business/services/transaction.service";
import { TransactionType } from "@/database/entities";
import { SolPriceService } from "@/business/services/sol-price.service";

@Injectable()
export class ConfirmBuyHandler implements Handler {
  constructor(
    @Inject(TelegramBot)
    private readonly bot: TelegramBot,
    @Inject("TELEGRAM_BOT_STATE")
    private readonly botStateStore: Redis,
    @Inject(OnchainService)
    private readonly onchainService: OnchainService,
    @Inject(UserService)
    private readonly userService: UserService,
    @Inject("SOLANA_CONNECTION")
    private readonly solanaConnection: Connection,
    @Inject(TransactionService)
    private readonly transactionService: TransactionService,
    @Inject(SolPriceService)
    private readonly solPriceService: SolPriceService
  ) {}

  handler = async (data: DefaultHandlerParams) => {
    try {
      const [currentState, user, solPrice] = await Promise.all([
        await this.bot.getTokenInfoState(data.telegramId),
        await this.userService.getOrCreateUser({
          telegram_id: data.telegramId,
        }),
        await this.solPriceService.getSolPrice(),
      ]);
      // Send processing message
      const message = await this.bot.sendMessage(
        data.chatId,
        "🔄 Processing your buy transaction..."
      );

      // const tx = await this.onchainService.buy(
      //   await this.userService.getPrivateKeyByTelegramId(data.telegramId),
      //   currentState.tokenAddress,
      //   Number(currentState.solAmount),
      //   Number(currentState.slippage)
      // );
      const tx = "123";

      const txReceipt = {
        confirmed: true,
      };

      if (txReceipt.confirmed) {
        // Send success message with transaction details
        const successMessage =
          `✅ Buy Success!\n\n` +
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
        const solIn = Math.abs(parseTx[userAddress].solChange);
        const tokenOut =
          parseTx[userAddress].tokenChanges[currentState.tokenAddress];
        const usd = solIn * solPrice;

        await Promise.all([
          this.transactionService.createTransaction({
            type: TransactionType.BUY,
            sol_amount: solIn,
            sol_amount_by_usd: usd,
            token_amount: tokenOut,
            token_amount_by_usd: usd,
            tx_hash: tx,
            user_id: user.id,
            token_address: currentState.tokenAddress,
          }),
          this.botStateStore.del(`token_info:${data.telegramId}`),
        ]);
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
      console.error("Error confirming buy:", error);

      const errorMessage =
        `❌ Transaction Failed\n\n` +
        `Error: ${error.message}\n\n` +
        `Please try again or contact support if the issue persists.`;

      await this.bot.sendMessage(data.chatId, errorMessage);
    }
  };
}
