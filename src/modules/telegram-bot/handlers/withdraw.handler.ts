import { Injectable } from "@nestjs/common";
import { Handler } from "./handler";
import { TelegramBot } from "../telegram-bot";

@Injectable()
export class WithdrawHandler implements Handler {
  constructor(private readonly telegramBot: TelegramBot) {}

  async handler({ chatId }: { chatId: number }) {
    await this.telegramBot.sendMessage(
      chatId,
      "💰 Withdraw Assets\n\n" +
        "This feature will be available in the future.\n\n" +
        "For now, you can go to Wallet Settings to export your private key.\n\n" +
        "Stay tuned for updates! \n\n" +
        "/wallet",
      {
        parse_mode: "HTML",
      }
    );
  }
}
