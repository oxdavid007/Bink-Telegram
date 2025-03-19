import { Inject, Injectable } from '@nestjs/common';
import { ChatId } from 'node-telegram-bot-api';
import { TelegramBot } from '../telegram-bot';
import { Handler } from './handler';
import Redis from 'ioredis';
import { UserService } from '@/business/services/user.service';
import { TokenInfoHandler } from './token-info.handler';
import { TELEGRAM_BOT_STATE, BOT_STATES } from '../constants/constants';
import { isSolanaAddress } from '../utils/solana.utils';
import { CustomPercentageHandler } from './custom-percentage.handler';
import { COMMAND_KEYS } from '../constants';
import { AiService } from '@/business/services/ai.service';
import { FourMemeService } from '@/business/services/fourmeme.service';
import { Network, NetworksConfig, NetworkType, Wallet } from '@binkai/core';

@Injectable()
export class UserInputHandler implements Handler {
  private networks: NetworksConfig['networks'];

  @Inject(TelegramBot)
  private readonly bot: TelegramBot;

  constructor(
    @Inject('TELEGRAM_BOT_STATE')
    private readonly botStateStore: Redis,
    private readonly userService: UserService,
    private readonly aiService: AiService,
    private readonly tokenInfoHandler: TokenInfoHandler,
    private readonly customPercentageHandler: CustomPercentageHandler,
    private readonly fourMemeService: FourMemeService,
  ) {
    // using with fourmeme, support only bnb
    this.networks = {
      bnb: {
        type: 'evm' as NetworkType,
        config: {
          chainId: 56,
          rpcUrl: process.env.BSC_RPC_URL,
          name: 'BNB Chain',
          nativeCurrency: {
            name: 'BNB',
            symbol: 'BNB',
            decimals: 18,
          },
        },
      },
    };
  }

  handler = async (data: {
    chatId: ChatId;
    telegramId: string;
    messageId?: number;
    text: string;
    caption?: string;
    reply_to_message_id?: number;
    photo?: string;
  }) => {
    console.log('🚀 ~ UserInputHandler ~ data:', data);
    const defaultImg =
      'https://api.telegram.org/file/bot6651136367:AAEk90fO1lpOmz2W5j8SPIovGMOQaUdij9s/photos/file_2.jpg';
    try {
      if (data.photo) {
        const photo = data.photo[data.photo.length - 1] as any; // Get highest resolution photo
        const fileId = photo?.file_id || '';
        const filePath = (await this.bot.bot.getFileLink(fileId)) || defaultImg;
        console.log('🚀 ~ UserInputHandler ~ fileId:', filePath);
        // Get caption if exists
        const captionText = data.caption || '';
        console.log('🚀 ~ UserInputHandler ~ captionText:', captionText);

        const keys = await this.userService.getMnemonicByTelegramId(data.telegramId);

        const user = await this.userService.getOrCreateUser({
          telegram_id: data.telegramId,
        });

        const network = new Network({ networks: this.networks });
        const wallet = new Wallet(
          {
            seedPhrase: keys,
            index: 0,
          },
          network,
        );

        const signatureMessage = await this.fourMemeService.buildSignatureMessage(
          user.wallet_evm_address,
          'bnb',
        );

        const firstMessage = 'Uploading on FourMeme...';

        const messageId = await this.bot.sendMessage(data.chatId, firstMessage, {
          parse_mode: 'HTML',
        });

        // Uncomment when ready to use FourMeme

        const signature = await wallet.signMessage({
          network: 'bnb' as any,
          message: signatureMessage,
        });

        const response = await this.fourMemeService.uploadFile(
          filePath,
          user.wallet_evm_address,
          signature,
        );

        if (response) {
          const message = 'Uploaded on FourMeme';

          await this.bot.editMessageText(message, {
            chat_id: data.chatId,
            message_id: messageId.message_id,
            parse_mode: 'HTML',
          });

          // save to redis with image URL and caption
          await this.botStateStore.set(`${data.telegramId}:img`, JSON.stringify({
            imageUrl: response.url || filePath,
            messageId: messageId.message_id,
            captionText: captionText // Store caption with the image data
          }));
        } else {
          const message = 'Failed to upload on FourMeme';

          await this.bot.editMessageText(message, {
            chat_id: data.chatId,
            message_id: messageId.message_id,
            parse_mode: 'HTML',
          });
        }

      } else {
        //remove /
        const text = data?.text?.replace('/', '');
        //skip if COMMAND_KEYS includes data.text
        if (Object.keys(COMMAND_KEYS).includes(text.toUpperCase() as any)) {
          return;
        }
        const firstMessage = 'Thinking...';
        const messageId = await this.bot.sendMessage(data.chatId, firstMessage, {
          parse_mode: 'HTML',
        });

        // Get image from cache if exists
        const cachedImageData = await this.botStateStore.get(`${data.telegramId}:img`);
        let imageUrl = null;
        let cachedCaption = null;

        if (cachedImageData) {
          try {
            const parsedData = JSON.parse(cachedImageData);
            imageUrl = parsedData.imageUrl;
            cachedCaption = parsedData.captionText;
            // Clear the cache after using it
            await this.botStateStore.del(`${data.telegramId}:img`);
          } catch (e) {
            console.error('Error parsing cached image data:', e);
          }
        }

        //implement
        const message = await this.aiService.handleSwap(
          data.telegramId,
          imageUrl ?
            `${text}${cachedCaption ? ` ${cachedCaption}` : ''} [Image: ${imageUrl}]`
            : data.text,
          messageId.message_id,
        );

        await this.bot.editMessageText(message, {
          chat_id: data.chatId,
          message_id: messageId.message_id,
          parse_mode: 'HTML',
        });

        if (message.includes('bscscan') && process.env.TELEGRAM_GROUP_ID) {
          const user = await this.userService.getOrCreateUser({
            telegram_id: data.telegramId,
          });
          this.bot
            .sendMessage(
              process.env.TELEGRAM_GROUP_ID,
              `🚀 New transaction -${user.telegram_username}- on BSC:\n\n${message}`,
              {
                message_thread_id: Number(process.env.TELEGRAM_THREAD_ID),
              },
            )
            .then(() => { })
            .catch(() => { });
        }
      }
    } catch (error) {
      console.error('Error in UserInputHandler:', error);
    }
  };

  async clearMessage(data: { chatId: ChatId; messageId?: number; replyMessageId?: number }) {
    if (data.messageId) {
      await this.bot.deleteMessage(data.chatId, data.messageId.toString());
    }

    if (data.replyMessageId) {
      await this.bot.deleteMessage(data.chatId, data.replyMessageId.toString());
    }
  }
}
function IsSolanaAddressConstraint() {
  throw new Error('Function not implemented.');
}
