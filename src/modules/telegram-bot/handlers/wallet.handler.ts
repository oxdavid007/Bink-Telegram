import { Inject, Injectable } from "@nestjs/common";
import { TelegramBot } from "../telegram-bot";
import { Handler, DefaultHandlerParams } from "./handler";
import { UserService } from "@/business/services/user.service";
import Redis from "ioredis";
import { InlineKeyboardButton } from "node-telegram-bot-api";
import { COMMAND_KEYS } from "../constants/command-keys";
import { getSolBalance } from "../utils/solana.utils";
import { Connection, PublicKey } from "@solana/web3.js";
import { formatSmartNumber } from "../utils";
import { SolPriceService } from "@/business/services/sol-price.service";

@Injectable()
export class WalletHandler implements Handler {
  constructor(
    private readonly bot: TelegramBot,
    private readonly userService: UserService,
    @Inject("TELEGRAM_BOT_STATE")
    private readonly botStateStore: Redis,
    @Inject("SOLANA_CONNECTION")
    private readonly solanaConnection: Connection,
    private readonly solPriceService: SolPriceService
  ) {}

  handler = async (data: DefaultHandlerParams) => {
    try {
      // Get user's wallet info
      const user = await this.userService.getOrCreateUser({
        telegram_id: data.telegramId,
      });
      const [solBalance, ethBalance, bnbBalance] = await Promise.all([
        getSolBalance(
          this.solanaConnection,
          new PublicKey(user.wallet_sol_address)
        ),
        this.userService.getEthBalance(user.wallet_evm_address),
        this.userService.getBnbBalance(user.wallet_evm_address),
      ]);

      const walletInfo = [
        {
          address: user.wallet_sol_address,
          balance: solBalance, // This should come from actual wallet balance
          label: "W5", // This should come from user settings or wallet metadata
        },
        {
          address: user.wallet_evm_address,
          balance: ethBalance,
          label: "ETH",
        },
        {
          address: user.wallet_evm_address,
          balance: bnbBalance,
          label: "BNB",
        },
      ];

      // Create message
      let message = `<b>Here is your wallet address, please top up to use the bot:</b>\n\n`;

      message += `<b>💳 BNB Chain:</b> ${formatSmartNumber(walletInfo[2].balance)} BNB (Please top up👆)\n`;
      message += `<code>${walletInfo[2].address}</code> (Tap to copy)\n\n`;

      message += `<b>💳 Ethereum:</b> ${formatSmartNumber(walletInfo[1].balance)} ETH (Please top up👆)\n`;
      message += `<code>${walletInfo[1].address}</code> (Tap to copy)\n\n`;

      message += `<b>💳 Solana:</b> ${formatSmartNumber(walletInfo[0].balance)} SOL (Please top up👆)\n`;
      message += `<code>${walletInfo[0].address}</code> (Tap to copy)\n\n`;

      message += `<b>🔗 Reflink</b>\n`;
      message += `https://t.me/${this.bot.name}?start=${user.referral_code} (Tap to copy)`;

      // Create keyboard layout
      const keyboard: InlineKeyboardButton[][] = [
        [
          {
            text: "🔑 Export Private Keys",
            callback_data: COMMAND_KEYS.EXPORT_KEYS,
          },
        ],
        [
          {
            text: "← Back",
            callback_data: COMMAND_KEYS.START,
          },
        ],
      ];

      // Send message with keyboard
      await this.bot.sendMessage(data.chatId, message, {
        reply_markup: {
          inline_keyboard: keyboard,
        },
        parse_mode: "HTML",
        disable_web_page_preview: true,
      });
    } catch (error) {
      console.error("Error in WalletHandler:", error);
      await this.bot.sendMessage(
        data.chatId,
        "Error fetching wallet information. Please try again."
      );
    }
  };
}
