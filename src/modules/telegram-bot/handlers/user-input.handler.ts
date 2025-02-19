import { Inject, Injectable } from "@nestjs/common";
import { ChatId } from "node-telegram-bot-api";
import { TelegramBot } from "../telegram-bot";
import { Handler } from "./handler";
import Redis from "ioredis";
import { UserService } from "@/business/services/user.service";
import { TokenInfoHandler } from "./token-info.handler";
import { TELEGRAM_BOT_STATE, BOT_STATES } from "../constants/constants";
import { isSolanaAddress } from "../utils/solana.utils";
import { CustomPercentageHandler } from "./custom-percentage.handler";
import { COMMAND_KEYS } from "../constants";
import { AiService } from "@/business/services/ai.service";

@Injectable()
export class UserInputHandler implements Handler {
  @Inject(TelegramBot)
  private readonly bot: TelegramBot;

  constructor(
    @Inject("TELEGRAM_BOT_STATE")
    private readonly botStateStore: Redis,
    private readonly userService: UserService,
    private readonly aiService: AiService,
    private readonly tokenInfoHandler: TokenInfoHandler,
    private readonly customPercentageHandler: CustomPercentageHandler
  ) {}

  handler = async (data: {
    chatId: ChatId;
    telegramId: string;
    messageId?: number;
    text: string;
    reply_to_message_id?: number;
  }) => {
    try {
      //remove /
      const text = data.text.replace("/", "");
      //skip if COMMAND_KEYS includes data.text
      if (Object.keys(COMMAND_KEYS).includes(text.toUpperCase() as any)) {
        return;
      }
      const firstMessage = "Thinking...";
      const messageId = await this.bot.sendMessage(data.chatId, firstMessage);
      //implement
      const message = await this.aiService.createChatCompletion(
        [{ role: "user", content: data.text }],
        {
          model: "gpt-4o-mini",
        }
      );
      await this.bot.editMessageText(message.content, {
        chat_id: data.chatId,
        message_id: messageId.message_id,
      });
    } catch (error) {
      console.error("Error in UserInputHandler:", error);
    }
  };

  async clearMessage(data: {
    chatId: ChatId;
    messageId?: number;
    replyMessageId?: number;
  }) {
    if (data.messageId) {
      await this.bot.deleteMessage(data.chatId, data.messageId.toString());
    }

    if (data.replyMessageId) {
      await this.bot.deleteMessage(data.chatId, data.replyMessageId.toString());
    }
  }
}
function IsSolanaAddressConstraint() {
  throw new Error("Function not implemented.");
}
