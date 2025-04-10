import { formatSmartNumber } from "@/telegram-bot/utils/format-text";
import { IHumanReviewCallback, HumanReviewData } from "@binkai/core";
import { EMessageType } from "../constants/enums";
import { TelegramBot } from "@/telegram-bot/telegram-bot";

class ExampleHumanReviewCallback implements IHumanReviewCallback {
  private messageData: (type: string, message: string) => void;
  messageId: number;
  bot: TelegramBot;
  chatId: string;

  constructor(chatId: string, bot: TelegramBot, messageId: number, messageData: (type: string, message: string) => void) {
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
    const message = `📝 <b>Review Transaction</b>
Please review the following transaction details carefully before proceeding:
- <b>From:</b> ${formatSmartNumber(data.data.fromAmount)} ${data.data.fromToken?.symbol || ''} (<code>${data.data.fromToken?.address || ''}</code>)
- <b>To:</b> ${formatSmartNumber(data.data.toAmount)} ${data.data.toToken?.symbol || ''} (<code>${data.data.toToken?.address || ''}</code>)
- <b>Network:</b> ${data.data.network.charAt(0).toUpperCase() + data.data.network.slice(1)}
    `
    // this.messageData(EMessageType.HUMAN_REVIEW, message);
    // this.bot.deleteMessage(this.chatId, this.messageId.toString());
    console.log("🚀 ~ ExampleHumanReviewCallback ~ onHumanReview ~ this.messageId:", this.messageId)
    console.log("🚀 ~ ExampleHumanReviewCallback ~ onHumanReview ~ 1")
    // if (this.messageId) {
    //   this.bot.editMessageText(message, {
    //     chat_id: this.chatId,
    //     message_id: this.messageId,
    //     parse_mode: 'HTML',
    //   })
    // } else {
    this.bot.sendMessage(this.chatId, message, {
      parse_mode: 'HTML',
    }).then(messageId => {
      this.setMessageId(messageId.message_id);
    }).catch(error => {
      console.error("🚀 ~ ExampleHumanReviewCallback ~ onHumanReview ~ error", error)
    });
    // }
  }
}

export default ExampleHumanReviewCallback;