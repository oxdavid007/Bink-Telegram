import { Inject, Injectable } from "@nestjs/common";
import { TelegramBot } from "../telegram-bot";
import { Handler, BuyHandlerParams } from "./handler";
import { UserService } from "@/business/services/user.service";
import { TELEGRAM_BOT_STATE, BOT_STATES } from "../constants/constants";
import Redis from "ioredis";

@Injectable()
export class BuyHandler implements Handler {
  constructor(
    @Inject(TelegramBot)
    private readonly bot: TelegramBot,
    @Inject(UserService)
    private readonly userService: UserService,
    @Inject("TELEGRAM_BOT_STATE")
    private readonly botStateStore: Redis
  ) {}

  handler = async (data: BuyHandlerParams) => {
    // Get or create user with telegram info
    const user = await this.userService.getOrCreateUser({
      telegram_id: data.telegramId,
      telegram_username: data.firstName,
    });

    // Set state to waiting for token input
    await this.botStateStore.set(
      `user:${data.telegramId}:state`,
      JSON.stringify({
        state: BOT_STATES.WAITING_TOKEN_INPUT,
        updated_at: Date.now(),
      })
    );

    await this.bot.sendMessage(
      data.chatId,
      "Enter a token symbol or address to buy"
    );
  };
}
