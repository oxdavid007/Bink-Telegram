import { Injectable } from "@nestjs/common";
import { TelegramBot } from "../telegram-bot";
import { Handler, DefaultHandlerParams } from "./handler";
import { UserService } from "@/business/services/user.service";
import { UserReferralRepository } from "@/database/repositories";
import { formatBigNumber, formatSmartNumber } from "@/shared/number";
import { COMMAND_KEYS } from "../constants/command-keys";
import { createMenuButton } from "../utils";
import { InlineKeyboardButton } from "node-telegram-bot-api";
@Injectable()
export class ReferralHandler implements Handler {
  constructor(
    private readonly bot: TelegramBot,
    private readonly userService: UserService,
    private readonly userReferralRepository: UserReferralRepository
  ) {}

  handler = async (data: DefaultHandlerParams) => {
    try {
      // Get user info
      const user = await this.userService.getOrCreateUser({
        telegram_id: data.telegramId,
      });

      // Get referral stats
      const stats = await this.userReferralRepository.statsReferral(user.id);
      const totalReferrals = stats.total_referrals;
      const totalVolume = stats.total_volume;

      // Create message
      let message = `<b>💌 Referral</b>\n\n`;

      message += `🔗 Reflink\n`;
      message += `<code>https://t.me/${this.bot.name}?start=${user.referral_code}</code>\n\n`;

      message += `📊 Stats\n`;
      message += `<b>🔹 Total Referee</b>: ${totalReferrals} user\n`;
      message += `<b>🔹 Total Referee Transactions Vol:</b>: $${formatBigNumber(totalVolume)} \n\n`;

      // Create menu buttons
      const menu: InlineKeyboardButton[][] = [
        [
          createMenuButton("← Back", COMMAND_KEYS.START),
          //   createMenuButton("💳 Wallet", COMMAND_KEYS.WALLET),
        ],
      ];

      await this.bot.sendMessage(data.chatId, message, {
        reply_markup: {
          inline_keyboard: menu,
        },
        parse_mode: "HTML",
        disable_web_page_preview: true,
      });
    } catch (error) {
      console.error("Error in ReferralHandler:", error);
      await this.bot.sendMessage(
        data.chatId,
        "❌ Error displaying referral information. Please try again."
      );
    }
  };
}
