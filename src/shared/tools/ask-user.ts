import { IAskUserCallback, AskUserData } from "@binkai/core";
import { EMessageType } from "../constants/enums";
import { TelegramBot } from "@/telegram-bot/telegram-bot";

class ExampleAskUserCallback implements IAskUserCallback {
  messageId: number;
  bot: TelegramBot;
  chatId: string;
  messageData: (type: string, message: string) => void;

  constructor(chatId: string, bot: TelegramBot, messageId: number, messageData: (type: string, message: string) => void) {
    this.chatId = chatId;
    this.bot = bot;
    this.messageId = messageId;
    this.messageData = messageData;
  }

  setMessageId(messageId: number) {
    this.messageId = messageId;
  }

  onAskUser(data: AskUserData): void {
    console.log(`Ask user: ${data.question}`);
    this.bot.sendMessage(this.chatId, data.question, {
      parse_mode: 'HTML',
    })
      .then(messageDataId => {
        this.setMessageId(messageDataId.message_id);
        // After sending message, delete the previous message
        return this.bot.deleteMessage(this.chatId, (messageDataId.message_id - 1).toString());
      }).catch(error => {
        console.error("🚀 ~ ExampleAskUserCallback ~ onAskUser ~ error", error.message)

      });
  }
}

export default ExampleAskUserCallback;