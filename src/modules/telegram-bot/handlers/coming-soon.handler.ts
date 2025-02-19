import { Injectable } from "@nestjs/common";
import { Handler } from "./handler";
import { TelegramBot } from "../telegram-bot";

@Injectable()
export class ComingSoonHandler implements Handler {
  constructor(private readonly telegramBot: TelegramBot) {}

  async handler({ chatId }: { chatId: number }) {
    await this.telegramBot.sendMessage(
      chatId,
      "🚧 Coming soon! This feature is under development.",
      {
        parse_mode: "HTML",
      }
    );
  }
}
