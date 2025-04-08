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
    console.log("🚀 ~ ExampleAskUserCallback ~ onAskUser ~ data:", data)
    console.log(`Ask user: ${data.question}`);
    // this.messageData(EMessageType.ASK_USER, data.question);

    console.log("🚀 ~ ExampleAskUserCallback ~ onAskUser ~ this.messageId:", this.messageId)

    // this.bot.deleteMessage(this.chatId, this.messageId.toString());

    this.bot.sendMessage(this.chatId, data.question, {
      parse_mode: 'HTML',
    }).then(messageId => {
      this.setMessageId(messageId.message_id);
    }).catch(error => {
      console.error("🚀 ~ ExampleAskUserCallback ~ onAskUser ~ error", error)

    });
  }
}

export default ExampleAskUserCallback;