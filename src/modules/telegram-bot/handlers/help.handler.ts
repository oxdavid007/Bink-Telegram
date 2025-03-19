import { Injectable } from '@nestjs/common';
import { TelegramBot } from '../telegram-bot';
import { Handler, DefaultHandlerParams } from './handler';
import { buildPhotoOptions } from '../utils';
import { InlineKeyboardButton } from 'node-telegram-bot-api';
import { COMMAND_KEYS } from '../constants/command-keys';

@Injectable()
export class HelpHandler implements Handler {
  constructor(private readonly bot: TelegramBot) {}

  handler = async (data: DefaultHandlerParams) => {
    try {
      const messageText =
        `📚 <b>How to use?</b>\n\n` +
        `🤖 <b><a href="https://t.me/BinkAI_bot">Bink AI Telegram Bot</a>: Chat & Execute On-Chain Transactions</b>\n\n` +
        `💠 <b>Market Insights:</b> "What's trending today?"\n` +
        `💠 <b>Check Balance:</b> "Check my balance"\n` +
        `💠 <b>Get Wallet Address:</b> "Get my wallet address"\n` +
        `💠 <b>Get Token Info:</b> "Get token info 0x123..."\n` +
        `💠 <b>Swap:</b> "Swap 1 BNB for USDT on OKX"\n` +
        `💠 <b>Crosschain:</b> "Cross-chain 10% BNB to SOL"\n` +
        `💠 <b>Bridge:</b> "Bridge 2 SOL to BNB"\n` +
        `💠 <b>Send:</b> "Send 0.5 ETH to 0x123..."\n` +
        `💠 <b>Stake & Unstake:</b> "Stake 0.1 BNB"\n` +
        `💠 <b>Launch Token:</b> "Deploy a token"\n\n` +
        `🔻 <b>Currently supported protocols:</b> OKX DEX, KyberSwap, deBridge (Solana↔BNB), OKU, Pancakeswap, Thena, Venus (staking), Fourmeme, Jupiter <i>(to be updated)</i>.\n\n`;

      // `📱 <b><a href="https://binkos.dev">BinkOS</a>: The DeFAI Framework</b>\n` +
      // `💠 Fork BinkOS on GitHub & automate DeFi.`;

      const menu: InlineKeyboardButton[][] = [
        [
          {
            text: '← Back',
            callback_data: `${COMMAND_KEYS.START}::ops=${COMMAND_KEYS.START}`,
          },
        ],
      ];

      await this.bot.sendMessage(data.chatId, messageText, {
        reply_markup: {
          inline_keyboard: menu,
        },
        parse_mode: 'HTML',
        disable_web_page_preview: true,
      });
    } catch (error) {
      console.error('Error in HelpHandler:', error);
      await this.bot.sendMessage(
        data.chatId,
        'Error displaying help information. Please try again.',
      );
    }
  };
}
