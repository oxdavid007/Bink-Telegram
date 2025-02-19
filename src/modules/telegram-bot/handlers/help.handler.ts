import { Injectable } from "@nestjs/common";
import { TelegramBot } from "../telegram-bot";
import { Handler, DefaultHandlerParams } from "./handler";
import { buildPhotoOptions } from "../utils";
import { InlineKeyboardButton } from "node-telegram-bot-api";
import { COMMAND_KEYS } from "../constants/command-keys";

@Injectable()
export class HelpHandler implements Handler {
  constructor(private readonly bot: TelegramBot) {}

  handler = async (data: DefaultHandlerParams) => {
    try {
      const messageText =
        `📚 <b>How to use?</b>\n\n` +
        `💬 <b><a href="https://twitter.com/BinkAI_">Bink AI Agent on X</a>: Ask Market Questions</b>\n` +
        `💠 Mention <code>@bink_ai</code>, and it replies instantly. E.g: <i>"Hey @bink_ai, what's the sentiment on $SOL?"</i>\n\n` +
        `🤖 <b><a href="https://t.me/BinkAI_bot">Bink AI Telegram Bot</a>: Chat & Execute On-Chain Transactions</b>\n` +
        `💠 <b>Market Insights:</b> "What's trending today?"\n` +
        `💠 <b>Swap:</b> "Swap 1 BNB for USDT on OKX."\n` +
        `💠 <b>Bridge:</b> "Bridge 2 SOL to BNB."\n` +
        `💠 <b>Send:</b> "Send 0.5 ETH to 0x123..."\n` +
        `🔻 <b>Current supports:</b> OKX DEX, KyberSwap, deBridge (Solana↔BNB) <i>(to be updated)</i>.\n\n` +
        `📱 <b><a href="https://binkos.dev">BinkOS</a>: The DeFAI Framework</b>\n` +
        `💠 Fork BinkOS on GitHub & automate DeFi.`;

      const menu: InlineKeyboardButton[][] = [
        [
          {
            text: "← Back",
            callback_data: COMMAND_KEYS.START,
          },
        ],
      ];

      await this.bot.sendMessage(data.chatId, messageText, {
        reply_markup: {
          inline_keyboard: menu,
        },
        parse_mode: "HTML",
        disable_web_page_preview: true,
      });
    } catch (error) {
      console.error("Error in HelpHandler:", error);
      await this.bot.sendMessage(
        data.chatId,
        "Error displaying help information. Please try again."
      );
    }
  };
}
