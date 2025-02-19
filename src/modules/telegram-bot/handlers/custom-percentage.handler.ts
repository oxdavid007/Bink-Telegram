import { Inject, Injectable } from "@nestjs/common";
import { ChatId } from "node-telegram-bot-api";
import { TelegramBot } from "../telegram-bot";
import { Handler } from "./handler";
import { SellTokenDetailHandler } from "./sell-token-detail.handler";
import Redis from "ioredis";
import { BOT_STATES } from "../constants";

@Injectable()
export class CustomPercentageHandler implements Handler {
  constructor(
    @Inject(TelegramBot)
    private readonly bot: TelegramBot,
    private readonly sellTokenDetailHandler: SellTokenDetailHandler,
    @Inject("TELEGRAM_BOT_STATE")
    private readonly botStateStore: Redis
  ) {}

  handler = async (data: {
    chatId: ChatId;
    telegramId: string;
    messageId: number;
  }) => {
    try {
      // Send message asking for custom percentage
      const message = "Please enter a percentage between 1 and 100:";

      const replyMessage = await this.bot.sendMessage(data.chatId, message);
      await this.botStateStore.set(
        `user:${data.telegramId}:state`,
        JSON.stringify({
          state: BOT_STATES.WAITING_CUSTOM_PERCENTAGE,
          updated_at: Date.now(),
          messageId: data.messageId,
          replyMessageId: replyMessage.message_id,
        })
      );
    } catch (error) {
      console.error("Error in CustomPercentageHandler:", error);
      await this.bot.sendMessage(
        data.chatId,
        "Error setting custom percentage. Please try again."
      );
    }
  };

  handleInput = async (data: {
    chatId: ChatId;
    telegramId: string;
    text: string;
    messageId: number;
    state: any;
  }) => {
    try {
      const percentage = parseFloat(data.text);

      if (isNaN(percentage) || percentage < 1 || percentage > 100) {
        await this.bot.sendMessage(
          data.chatId,
          "Please enter a valid percentage between 1 and 100."
        );
        return;
      }

      // Update the sell token state with new percentage
      await this.sellTokenDetailHandler.handler({
        chatId: data.chatId,
        telegramId: data.telegramId,
        messageId: data.messageId,
        customPercentage: percentage.toString(),
      });
    } catch (error) {
      console.error("Error handling custom percentage input:", error);
      await this.bot.sendMessage(
        data.chatId,
        "Error processing custom percentage. Please try again."
      );
    }
  };
}
