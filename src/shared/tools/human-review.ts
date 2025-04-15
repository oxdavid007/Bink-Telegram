import { formatSmartNumber } from '@/telegram-bot/utils/format-text';
import { IHumanReviewCallback, HumanReviewData } from '@binkai/core';
import { TelegramBot } from '@/telegram-bot/telegram-bot';
import { ToolName, StakingOperationType } from './tool-execution';

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
- <b>Amount:</b> ${formatSmartNumber(data.data.amount || 0)} ${data.data.token?.symbol || ''} 
- <b>To Address:</b> ${data.data.toAddress || 'Unknown'}
- <b>Network:</b> ${data.data.network ? data.data.network.charAt(0).toUpperCase() + data.data.network.slice(1) : 'Unknown'}

<i>Please confirm your transaction within <b>60 seconds</b></i>
<i>Transactions metrics can be modified before the execution. You can edit the metrics by typing in the chatbox (i.e.: change amount 0.01 BNB)</i>
      `;
    }

    const keyboard = {
      inline_keyboard: [
        [
          { text: '✅ Yes', callback_data: 'human_review_yes' },
          { text: '❌ No', callback_data: 'human_review_no' },
        ],
      ],
    };

    if (message) {
      this.bot
        .sendMessage(this.chatId, message, {
          parse_mode: 'HTML',
          reply_markup: keyboard,
        })
        .then(messageId => {
          this.setMessageId(messageId.message_id);
        })
        .catch(error => {
          console.error('🚀 ~ ExampleHumanReviewCallback ~ onHumanReview ~ error', error);
        });
    }
  }
}

export default ExampleHumanReviewCallback;
