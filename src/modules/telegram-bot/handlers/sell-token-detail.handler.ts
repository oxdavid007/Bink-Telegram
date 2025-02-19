import { Inject, Injectable } from "@nestjs/common";
import { ChatId } from "node-telegram-bot-api";
import { TelegramBot } from "../telegram-bot";
import { Handler } from "./handler";
import { COMMAND_KEYS } from "../constants/command-keys";
import { ApiService } from "@/business/services/api.service";
import { UserService } from "@/business/services/user.service";
import { SellTokenState } from "../interfaces";
import { OnchainService } from "@/business/services/onchain.service";
import { formatBigNumber } from "@/shared/number";
import { formatSmartNumber } from "../utils";
import { getTokenViewUrl } from "../utils/url";
import { formatPnLMessage } from "../utils/message.utils";

@Injectable()
export class SellTokenDetailHandler implements Handler {
  @Inject(TelegramBot)
  private readonly bot: TelegramBot;

  constructor(
    @Inject(ApiService)
    private readonly apiService: ApiService,
    @Inject(UserService)
    private readonly userService: UserService,
    @Inject(OnchainService)
    private readonly onchainService: OnchainService
  ) {}

  private createCallbackData(
    action: string,
    value: string,
    state: SellTokenState
  ): string {
    const baseParams = {
      mode: state.mode,
      percentage: state.percentage,
      slippage: state.slippage,
      address: state.tokenAddress,
    };

    if (action === "mode") baseParams.mode = value as "swap" | "limit" | "dca";
    else if (action === "percentage") baseParams.percentage = value;
    else if (action === "slippage") baseParams.slippage = value;

    const params = `m=${baseParams.mode}&p=${baseParams.percentage}&s=${baseParams.slippage}`;
    const base64Data = Buffer.from(params).toString("base64");
    return `${COMMAND_KEYS.SELL_TOKEN}::${base64Data}`;
  }

  handler = async (data: {
    chatId: ChatId;
    add?: string;
    telegramId: string;
    m?: string;
    p?: string;
    s?: string;
    messageId?: number;
    id?: string;
    customPercentage?: string;
  }) => {
    try {
      const {
        m: mode,
        p: percentage,
        s: slippage,
        messageId,
        id,
        customPercentage,
      } = data;
      const redisState = await this.bot.getSellTokenState(data.telegramId);

      const currentState = redisState || null;

      // Update state with new values or defaults, now including customPercentage
      const state: SellTokenState = {
        mode:
          (mode as "swap" | "limit" | "dca") || currentState?.mode || "swap",
        percentage: customPercentage
          ? customPercentage
          : percentage || currentState?.percentage || "50",
        slippage: slippage || currentState?.slippage || "30",
        tokenAddress: currentState?.tokenAddress,
        updatedAt: Date.now(),
        customPercentage: customPercentage || currentState?.customPercentage,
      };

      const user = await this.userService.getOrCreateUser({
        telegram_id: data.telegramId,
      });
      if (!state.tokenAddress) {
        const tokens = await this.apiService.getTokenBalance(
          user.wallet_sol_address
        );
        const token = tokens.find((token) => token.mint.startsWith(id));

        if (!token) {
          await this.bot.sendMessage(
            data.chatId,
            "Token not found. Please try again."
          );
          return;
        }
        state.tokenAddress = token.mint;
      }

      // Fetch token info and balances
      const mint = state.tokenAddress;
      const [tokenBalance, tokenInfo, pnl] = await Promise.all([
        this.userService.getTokenBalance(data.telegramId, mint),
        this.fetchTokenInfo(mint),
        this.userService.calculateTokenPNL(data.telegramId, mint),
        this.bot.setSellTokenState(data.telegramId, state),
        this.onchainService.fetchAndPersistBondingCurve(mint),
      ]);

      const sellAmount =
        Number(tokenBalance) * (Number(state.percentage) / 100);
      const quoteAmount = this.onchainService.calculateSellPumpAmount(
        mint,
        sellAmount
      );

      const pnlMessage = formatPnLMessage(pnl);

      // Format message with real data
      const message = `Sell $${tokenInfo.symbol} — (${tokenInfo.name}) ✍️ • ⚙️

<a href="${getTokenViewUrl(mint)}">View on</a>

<code>${mint}</code>
Share token with your Reflink

Balance: <code>${formatBigNumber(Number(tokenBalance))}</code> ${tokenInfo.symbol} ($${formatSmartNumber(tokenInfo.usdAmount)})
${pnlMessage}
Price: $<code>${formatSmartNumber(tokenInfo.price)}</code> — LIQ: $<code>${formatBigNumber(tokenInfo.liquidity)}</code> — MC: $<code>${formatBigNumber(tokenInfo.marketCap)}</code>
${tokenInfo.isRenounced ? "Renounced ✅" : ""}

You Sell:
<code>${formatBigNumber(sellAmount)}</code> ${tokenInfo.symbol} ⇄ <code>${formatSmartNumber(quoteAmount)}</code> SOL`;

      // Create keyboard layout
      const messageOptions = {
        reply_markup: {
          inline_keyboard: [
            [
              { text: "← Back", callback_data: COMMAND_KEYS.BACK_TO_MAIN },
              {
                text: "🔄 Refresh",
                callback_data: COMMAND_KEYS.SELL_TOKEN,
              },
            ],
            [
              {
                text: state.mode === "swap" ? "✅ Swap" : "Swap",
                callback_data: this.createCallbackData("mode", "swap", state),
              },
              {
                text: state.mode === "limit" ? "✅ Limit" : "Limit",
                callback_data: this.createCallbackData("mode", "limit", state),
              },
              {
                text: state.mode === "dca" ? "✅ DCA" : "DCA",
                callback_data: this.createCallbackData("mode", "dca", state),
              },
            ],
            [
              {
                text: state.percentage === "50" ? "✅ 50 %" : "50 %",
                callback_data: this.createCallbackData(
                  "percentage",
                  "50",
                  state
                ),
              },
              {
                text: state.percentage === "100" ? "✅ 100 %" : "100 %",
                callback_data: this.createCallbackData(
                  "percentage",
                  "100",
                  state
                ),
              },
              {
                text:
                  state.percentage === state.customPercentage
                    ? `✅ ${state.customPercentage}%`
                    : "X % ✏️",
                callback_data: COMMAND_KEYS.CUSTOM_PERCENTAGE,
              },
            ],
            [
              {
                text: "Sell Initials",
                callback_data: COMMAND_KEYS.SELL_INITIALS,
              },
            ],
            [
              {
                text:
                  state.slippage === "15" ? "✅ 15% Slippage" : "15% Slippage",
                callback_data: this.createCallbackData("slippage", "15", state),
              },
              {
                text:
                  state.slippage === "30"
                    ? "✅ 30% Slippage ✏️"
                    : "30% Slippage ✏️",
                callback_data: this.createCallbackData("slippage", "30", state),
              },
            ],
            [{ text: "SELL", callback_data: COMMAND_KEYS.CONFIRM_SELL }],
          ],
        },
      };

      if (messageId) {
        await this.bot.editMessageText(message, {
          ...messageOptions,
          chat_id: data.chatId,
          message_id: messageId,
          parse_mode: "HTML",
        });
      } else {
        await this.bot.sendMessage(data.chatId, message, messageOptions);
      }
    } catch (error) {
      console.error("Error in SellTokenDetailHandler:", error);
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
