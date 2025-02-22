import { Inject, Injectable } from "@nestjs/common";
import { TelegramBot } from "../telegram-bot";
import { Handler, DefaultHandlerParams } from "./handler";
import { UserService } from "@/business/services/user.service";

@Injectable()
export class ClearHandler implements Handler {
  constructor(
    @Inject(TelegramBot)
    private readonly bot: TelegramBot,
    private readonly userService: UserService
  ) {}

  handler = async (data: DefaultHandlerParams) => {
    try {
      // Update current_thread_id
      await this.userService.updateCurrentThreadId(data.telegramId);

      // Send confirmation message
      await this.bot.sendMessage(
        data.chatId,
        "✨ Conversation history cleared! You can start a new chat.",
        {
          parse_mode: "HTML",
        }
      );
    } catch (error) {
      console.error("Error in ClearHandler:", error);
      await this.bot.sendMessage(
        data.chatId,
        "Error clearing conversation history. Please try again."
      );
    }
  };
}
