import { formatSmartNumber } from '@/telegram-bot/utils/format-text';
import { IHumanReviewCallback, HumanReviewData } from '@binkai/core';
import { TelegramBot } from '@/telegram-bot/telegram-bot';
import { ToolName, StakingOperationType } from './tool-execution';
import { COMMAND_KEYS } from '@/telegram-bot/constants/command-keys';

class ExampleHumanReviewCallback implements IHumanReviewCallback {
  private messageData: (type: string, message: string) => void;
  messageId: number;
  bot: TelegramBot;
  chatId: string;

  constructor(
    chatId: string,
    bot: TelegramBot,
    messageId: number,
    messageData: (type: string, message: string) => void,
  ) {
    this.chatId = chatId;
    this.bot = bot;
    this.messageId = messageId;
    this.messageData = messageData;
  }

  setMessageId(messageId: number) {
    this.messageId = messageId;
  }

  onHumanReview(data: HumanReviewData): void {
    console.log(`Human review: ${data.toolName}`, data.data);

    let message = '';

    if (data.toolName === ToolName.STAKE) {
      if (
        data.data.type === StakingOperationType.STAKE ||
        data.data.type === StakingOperationType.SUPPLY
      ) {
        message = `📝 <b>Review Transaction</b>
Please review the following staking details carefully before proceeding:
- <b>Amount:</b> ${formatSmartNumber(data.data.amountA || 0)} ${data.data.tokenA?.symbol || ''} 
- <b>Network:</b> ${data.data.network ? data.data.network.charAt(0).toUpperCase() + data.data.network.slice(1) : 'Unknown'}

<i>Please confirm your transaction within <b>60 seconds</b></i>
<i>Transactions metrics can be modified before the execution. You can edit the metrics by typing in the chatbox (i.e.: change amount 0.01 BNB)</i>
      `;
      } else if (
        data.data.type === StakingOperationType.UNSTAKE ||
        data.data.type === StakingOperationType.WITHDRAW
      ) {
        message = `📝 <b>Review Transaction</b>
Please review the following unstaking details carefully before proceeding:
- <b>Amount:</b> ${formatSmartNumber(data.data.amountA || 0)} ${data.data.tokenA?.symbol || ''} 
- <b>Network:</b> ${data.data.network ? data.data.network.charAt(0).toUpperCase() + data.data.network.slice(1) : 'Unknown'}

<i>Please confirm your transaction within <b>60 seconds</b></i>
<i>Transactions metrics can be modified before the execution. You can edit the metrics by typing in the chatbox (i.e.: change amount 0.01 BNB)</i>
      `;
      }
    } else if (data.toolName === ToolName.SWAP) {
      message = `📝 <b>Review Transaction</b>
Please review the following transaction details carefully before proceeding:
- <b>From:</b> ${formatSmartNumber(data.data.fromAmount || 0)} ${data.data.fromToken?.symbol || ''} 
- <b>To:</b> ${formatSmartNumber(data.data.toAmount || 0)} ${data.data.toToken?.symbol || ''}
- <b>Network:</b> ${data.data.network ? data.data.network.charAt(0).toUpperCase() + data.data.network.slice(1) : 'Unknown'}

<i>Please confirm your transaction within <b>60 seconds</b></i>
<i>Transactions metrics can be modified before the execution. You can edit the metrics by typing in the chatbox (i.e.: change amount 0.01 BNB)</i>
      `;
    } else if (data.toolName === ToolName.TRANSFER) {
      message = `📝 <b>Review Transaction</b>
Please review the following transaction details carefully before proceeding:
- <b>Transferred:</b> ${formatSmartNumber(data.data.amount || 0)} ${data.data.token?.symbol || ''}
- <b>Token address:</b> ${data.data.token?.address || 'Unknown'}
- <b>From Address:</b> ${data.data.fromAddress || 'Unknown'}
- <b>To Address:</b> ${data.data.toAddress || 'Unknown'}
- <b>Network:</b> ${data.data.network ? data.data.network.charAt(0).toUpperCase() + data.data.network.slice(1) : 'Unknown'}

<i>Please confirm your transaction within <b>60 seconds</b></i>
<i>Transactions metrics can be modified before the execution. You can edit the metrics by typing in the chatbox (i.e.: change amount 0.01 BNB)</i>
      `;
    }

    const keyboard = {
      inline_keyboard: [
        [
          { text: '❌ Reject', callback_data: COMMAND_KEYS.HUMAN_REVIEW_NO },
          { text: '✅ Approve', callback_data: COMMAND_KEYS.HUMAN_REVIEW_YES },
        ],
      ],
    };

    try {
      // Send message first
      this.bot
        .sendMessage(this.chatId, message, {
          parse_mode: 'HTML',
          reply_markup: keyboard,
        })
        .then(messagePlanListId => {
          this.setMessageId(messagePlanListId.message_id);

          // After sending message, delete the previous message
          return this.bot.deleteMessage(this.chatId, (messagePlanListId.message_id - 1).toString());
        })
        .catch(error => {
          console.error('🚀 ~ ExampleHumanReviewCallback ~ onHumanReview ~ error', error.message);
        });
    } catch (error) {
      console.log('🚀 ~ ExampleHumanReviewCallback ~ onHumanReview ~ error', error.message);
      this.bot.sendMessage(this.chatId, 'Please try again', {
        parse_mode: 'HTML',
      });
    }
  }
}

export default ExampleHumanReviewCallback;
