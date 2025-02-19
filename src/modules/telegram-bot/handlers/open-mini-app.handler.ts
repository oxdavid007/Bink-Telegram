import { Inject, Injectable } from "@nestjs/common";
import { TelegramBot } from "../telegram-bot";
import { Handler, OpenMiniAppHandlerParams } from "./handler";

@Injectable()
export class OpenMiniAppHandler implements Handler {
  @Inject(TelegramBot)
  private readonly bot: TelegramBot;

  handler = async (data: OpenMiniAppHandlerParams) => {
    await this.bot.sendMessage(data.chatId, "Opening mini app...");
  };
}
