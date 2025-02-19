import { Inject, Injectable } from "@nestjs/common";
import { ChatId, SendMessageOptions } from "node-telegram-bot-api";
import { TelegramBot } from "../telegram-bot";
import { Handler } from "./handler";
import Redis from "ioredis";
import { COMMAND_KEYS } from "../constants/command-keys";
import { TokenInfoState } from "../interfaces";
import { encodeBase64 } from "../utils/encoding.utils";
import { UserService } from "@/business/services/user.service";
import { ApiService } from "@/business/services/api.service";
import { formatSmartNumber } from "../utils";
import { formatBigNumber } from "@/shared/number";
import { OnchainService } from "@/business/services/onchain.service";
import { getTokenViewUrl } from "../utils/url";
import { formatPnLMessage } from "../utils/message.utils";

@Injectable()
export class TokenInfoHandler implements Handler {
  @Inject(TelegramBot)
  private readonly bot: TelegramBot;

  constructor(
    @Inject("TELEGRAM_BOT_STATE")
    private readonly botStateStore: Redis,
    @Inject(UserService)
    private readonly userService: UserService,
    @Inject(ApiService)
    private readonly apiService: ApiService,
    @Inject(OnchainService)
    private readonly onchainService: OnchainService
  ) {}

  private createCallbackData(
    action: string,
    value: string,
    state: TokenInfoState
  ): string {
    // Shorten keys and values to fit within the 64-byte limit
    const baseParams = {
      mode: state.mode,
      amount: state.solAmount,
      slippage: state.slippage,
    };

    if (action === "mode") baseParams.mode = value as "swap" | "limit" | "dca";
    else if (action === "value") baseParams.amount = value;
    else if (action === "slippage") baseParams.slippage = value;
    const params = `mode=${baseParams.mode}&amount=${baseParams.amount}&slippage=${baseParams.slippage}`;
    return `${COMMAND_KEYS.TOKEN_INFO}::${encodeBase64(params)}`;
  }

  handler = async (data: {
    chatId: ChatId;
    tokenAddress?: string;
    telegramId: string;
    mode?: string;
    amount?: string;
    slippage?: string;
    address?: string;
    messageId?: number;
    customAmount?: string;
  }) => {
    try {
      const {
        mode,
        amount,
        slippage,
        tokenAddress,
        address,
        messageId,
        customAmount,
      } = data;

      const redisState = await this.bot.getTokenInfoState(data.telegramId);
      // Retrieve the current state

      // Fetch token info based on address
      const state = {
        ...redisState,
        mode: (mode as "swap" | "limit" | "dca") || redisState?.mode || "swap",
        solAmount: customAmount
          ? customAmount
          : amount || redisState?.solAmount || "X",
        slippage: slippage || redisState?.slippage || "0.3",
        tokenAddress: tokenAddress || redisState?.tokenAddress || address,
        updatedAt: Date.now(),
        customAmount: customAmount || redisState?.customAmount || "X",
      };

      const mint = state.tokenAddress;

      const [solBalance, tokenBalance, tokenInfo, pnl] = await Promise.all([
        this.userService.getSolBalance(data.telegramId),
        this.userService.getTokenBalance(data.telegramId, mint),
        this.fetchTokenInfo(mint),
        this.userService.calculateTokenPNL(data.telegramId, mint),
        this.bot.setTokenInfoState(data.telegramId, state),
        this.onchainService.fetchAndPersistBondingCurve(mint),
      ]);

      const quoteAmount = this.onchainService.calculateBuyPumpAmount(
        mint,
        Number(state.solAmount)
      );

      const message = `Buy $${tokenInfo.symbol} — (${tokenInfo.name}) 🔄 • ⚙️

<a href="${getTokenViewUrl(mint)}">View on</a>

<code>${mint}</code>
Share token with your Reflink

Balance: <code>${formatSmartNumber(solBalance)}</code> SOL — <code>${formatBigNumber(
        Number(tokenBalance)
      )}</code> ${tokenInfo.symbol} ✏️
${formatPnLMessage(pnl)}

Price: $<code>${formatSmartNumber(tokenInfo.price)}</code> — LIQ: $<code>${formatBigNumber(
        tokenInfo.liquidity
      )}</code> — MC: $<code>${formatBigNumber(tokenInfo.marketCap)}</code>
${tokenInfo.isRenounced ? "Renounced ✅" : ""}

<code>${formatSmartNumber(state.solAmount)}</code> SOL ⇄ <code>${formatBigNumber(
        quoteAmount
      )}</code> ${tokenInfo.symbol}`;

      // Determine which buttons should be highlighted based on state
      const swapButtonText = state.mode === "swap" ? "✅ Swap" : "Swap";
      const limitButtonText = state.mode === "limit" ? "✅ Limit" : "Limit";
      const dcaButtonText = state.mode === "dca" ? "✅ DCA" : "DCA";

      const solAmounts = ["0.1", "0.2", "0.5", "1", "5", state.customAmount];

      const solButtonRows = solAmounts.map((amount, index) => ({
        text: amount === state.solAmount ? `✅ ${amount} SOL` : `${amount} SOL`,
        callback_data:
          index === solAmounts.length - 1
            ? COMMAND_KEYS.CUSTOM_AMOUNT
            : this.createCallbackData("value", amount, state),
      }));

      // const customButton = {
      //   text: state.customAmount ? `✅ ${state.customAmount} SOL` : "X SOL",
      //   callback_data: COMMAND_KEYS.CUSTOM_AMOUNT,
      // };

      // Send token info with buttons
      const messageOptions: SendMessageOptions = {
        reply_markup: {
          inline_keyboard: [
            [
              { text: "← Back", callback_data: COMMAND_KEYS.START },
              {
                text: "🔄 Refresh",
                callback_data: COMMAND_KEYS.TOKEN_INFO,
              },
            ],
            [
              {
                text: swapButtonText,
                callback_data: this.createCallbackData("mode", "swap", state),
              },
              {
                text: limitButtonText,
                callback_data: this.createCallbackData("mode", "limit", state),
              },
              {
                text: dcaButtonText,
                callback_data: this.createCallbackData("mode", "dca", state),
              },
            ],
            [solButtonRows[0], solButtonRows[1], solButtonRows[2]],
            [solButtonRows[3], solButtonRows[4], solButtonRows[5]],
            [
              {
                text:
                  state.slippage === "0.3"
                    ? "✅ 0.3% Slippage"
                    : "0.3% Slippage",
                callback_data: this.createCallbackData(
                  "slippage",
                  "0.3",
                  state
                ),
              },
              {
                text: "X Slippage ✏️",
                callback_data: this.createCallbackData(
                  "custom_slippage",
                  "",
                  state
                ),
              },
            ],
            [
              {
                text: "BUY",
                callback_data: COMMAND_KEYS.CONFIRM_BUY,
              },
            ],
          ],
        },
        parse_mode: "HTML",
      };

      if (messageId) {
        await this.bot.editMessageText(message, {
          ...messageOptions,
          chat_id: data.chatId,
          message_id: data.messageId,
          parse_mode: "HTML",
        });
      } else {
        await this.bot.sendMessage(data.chatId, message, messageOptions);
      }
    } catch (error) {
      console.error("Error in TokenInfoHandler:", error);
      await this.bot.sendMessage(
        data.chatId,
        "Error fetching token information. Please try again."
      );
    }
  };

  private async fetchTokenInfo(tokenAddress: string) {
    const tokenInfo = await this.apiService.getCoinDetail(tokenAddress);
    return {
      symbol: tokenInfo.data.symbol,
      name: tokenInfo.data.name,
      price: tokenInfo.data.last_price,
      liquidity: 0,
      marketCap: tokenInfo.data.usd_market_cap,
      isRenounced: true,
      solAmount: tokenInfo.data.sol_amount,
      usdAmount: tokenInfo.data.sol_amount * tokenInfo.data.last_price,
      tokenAmount: tokenInfo.data.total_share_supply,
      priceImpact: 0,
    };
  }
}
