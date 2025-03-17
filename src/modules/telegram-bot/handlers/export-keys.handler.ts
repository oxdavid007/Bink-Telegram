import { Inject, Injectable } from "@nestjs/common";
import { TelegramBot } from "../telegram-bot";
import { Handler, DefaultHandlerParams } from "./handler";
import { UserService } from "@/business/services/user.service";
import { decryptPrivateKey } from "../utils/crypto.utils";
import { COMMAND_KEYS } from "../constants/command-keys";

@Injectable()
export class ExportKeysHandler implements Handler {
  constructor(
    @Inject(TelegramBot)
    private readonly bot: TelegramBot,
    @Inject(UserService)
    private readonly userService: UserService
  ) {}

  handler = async (data: DefaultHandlerParams) => {
    try {
      // Get user's wallet info
      const keys = await this.userService.getPrivateKeyByTelegramId(
        data.telegramId
      );

      if (!keys) {
        throw new Error("Failed to retrieve private keys");
      }

      // Send private key with warning message
      const message =
        `<b>🔑 Export PKs</b>\n\n` +
        `<b>💠 BNB Chain & Ethereum:</b>\n` +
        `<code>${keys.evmPrivateKey}</code> (Tap to copy)\n\n` +
        `<b>💠 Solana:</b>\n` +
        `<code>${keys.solanaPrivateKey}</code> (Tap to copy)\n\n` +
        `=========\n` +
        `<i>⚠️ For your security, this message will be automatically deleted in 120 seconds.</i>`;

      const sentMessage = await this.bot.sendMessage(data.chatId, message, {
        parse_mode: "HTML",
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: "← Back to Wallet",
                callback_data: `${COMMAND_KEYS.WALLETS}::ops=${COMMAND_KEYS.EXPORT_KEYS}`,
              },
            ],
          ],
        },
      });

      // Delete the message after 120 seconds for security
      setTimeout(async () => {
        try {
          await this.bot.deleteMessage(
            data.chatId,
            String(sentMessage.message_id)
          );
        } catch (error) {
          console.error("Error deleting private key message:", error);
        }
      }, 120 * 1000); // 120 seconds
    } catch (error) {
      console.error("Error in ExportKeysHandler:", error);
      await this.bot.sendMessage(
        data.chatId,
        "Error exporting private keys. Please try again."
      );
    }
  };
}
