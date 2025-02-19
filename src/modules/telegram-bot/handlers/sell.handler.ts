import { Inject, Injectable } from "@nestjs/common";
import { TelegramBot } from "../telegram-bot";
import { Handler, SellHandlerParams } from "./handler";
import { UserService } from "@/business/services/user.service";
import Redis from "ioredis";
import { InlineKeyboardButton } from "node-telegram-bot-api";
import { COMMAND_KEYS } from "../constants/command-keys";
import { encodeBase64 } from "../utils/encoding.utils";
import { ApiService } from "@/business/services/api.service";
import { formatBigNumber } from "@/shared/number";
import { shortenAddress } from "../utils/solana.utils";

@Injectable()
export class SellHandler implements Handler {
  constructor(
    @Inject(TelegramBot)
    private readonly bot: TelegramBot,
    @Inject(UserService)
    private readonly userService: UserService,
    @Inject("TELEGRAM_BOT_STATE")
    private readonly botStateStore: Redis,
    @Inject(ApiService)
    private readonly apiService: ApiService
  ) {}

  handler = async (data: SellHandlerParams) => {
    // delete sellstate
    await this.bot.setSellTokenState(data.telegramId, {
      mode: null,
      percentage: null,
      slippage: null,
      tokenAddress: null,
      updatedAt: Date.now(),
      customPercentage: null,
    });

    const { chatId } = data;
    const user = await this.userService.getOrCreateUser({
      telegram_id: chatId.toString(),
    });
    const tokens = await this.apiService.getTokenBalance(
      user.wallet_sol_address
    );

    // Get user's token list from service
    const userTokens: {
      symbol: string;
      balance: number;
      price: number;
      address: string;
      id: string;
    }[] = tokens.map((token) => ({
      symbol: token.tokenInfo.data.symbol,
      balance: token.balance,
      price: token.tokenInfo.data.last_price,
      address: token.mint,
      id: shortenAddress(token.mint),
    }));

    if (!userTokens || userTokens.length === 0) {
      await this.bot.sendMessage(chatId, "You don't have any tokens to sell.");
      return;
    }

    // Create keyboard with token list
    const keyboard: InlineKeyboardButton[][] = userTokens.map((token) => {
      const { symbol, balance, price, address, id } = token;
      const usdValue = balance * price;
      const params = `&id=${id}`;
      const callback = `${COMMAND_KEYS.SELL_TOKEN}::${encodeBase64(params)}`;

      return [
        {
          text: `${symbol} — ${formatBigNumber(balance)} (${formatBigNumber(
            usdValue
          )}$)`,
          callback_data: callback,
        },
      ];
    });

    // Add Back button
    keyboard.push([
      {
        text: "← Back",
        callback_data: COMMAND_KEYS.START,
      },
    ]);

    await this.bot.sendMessage(
      chatId,
      "Select a token to sell\n" +
        `Balance: ${userTokens.reduce((acc, token) => acc + token.balance * token.price, 0).toFixed(2)}$`,
      {
        reply_markup: {
          inline_keyboard: keyboard,
        },
      }
    );

    // Save current user state
    await this.botStateStore.set(
      `user_state:${chatId}`,
      JSON.stringify({
        state: "SELLING",
        tokens: userTokens,
      })
    );
  };
}
