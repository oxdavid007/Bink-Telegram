import { Inject, Injectable } from "@nestjs/common";
import { TelegramBot } from "../telegram-bot";
import { Handler, CustomAmountHandlerParams } from "./handler";
import { BOT_STATES } from "../constants/constants";
import Redis from "ioredis";

@Injectable()
export class CustomAmountHandler implements Handler {
  constructor(
    @Inject(TelegramBot)
    private readonly bot: TelegramBot,
    @Inject("TELEGRAM_BOT_STATE")
    private readonly botStateStore: Redis
  ) {}

  handler = async (data: CustomAmountHandlerParams) => {
    const replyMessage = await this.bot.sendMessage(
      data.chatId,
      "Enter your custom amount in SOL:"
    );

    // Set state to waiting for token input
    await this.botStateStore.set(
      `user:${data.telegramId}:state`,
      JSON.stringify({
        state: BOT_STATES.WAITING_CUSTOM_AMOUNT,
        updated_at: Date.now(),
        messageId: data.messageId,
        replyMessageId: replyMessage.message_id,
      })
    );
  };
}
