import { TelegramBot } from "@/telegram-bot/telegram-bot";

/**
 * Enum representing the different states of a tool execution
 */
export enum ToolExecutionState {
  STARTED = "started",
  IN_PROCESS = "in_process",
  COMPLETED = "completed",
  FAILED = "failed",
}

/**
 * Interface for tool execution data
 */
export interface ToolExecutionData {
  state: ToolExecutionState;
  timestamp: number;
  message: string;
  data?: {
    progress?: number;
    [key: string]: any;
  };
  error?: Error | string;
}

/**
 * Interface for tool execution callback
 */
export interface IToolExecutionCallback {
  onToolExecution(data: ToolExecutionData): void;
}

/**
 * Example implementation of the IToolExecutionCallback interface
 * that logs tool execution data with emojis and formatting
 */
export class ExampleToolExecutionCallback implements IToolExecutionCallback {
  bot: TelegramBot;
  chatId: string;
  messageId: number;
  constructor(chatId: string, bot: TelegramBot, messageId: number) {
    this.chatId = chatId;
    this.bot = bot;
    this.messageId = messageId;
  }

  onToolExecution(data: ToolExecutionData): void {

    console.log("Aaaaaaaaaaaaaaaaaaaaaaaaaaaa",data)
    const stateEmoji = {
      [ToolExecutionState.STARTED]: "🚀",
      [ToolExecutionState.IN_PROCESS]: "⏳",
      [ToolExecutionState.COMPLETED]: "✅",
      [ToolExecutionState.FAILED]: "❌",
    };

    const emoji = stateEmoji[data.state] || "🔄";

    console.log(
      `${emoji} [${new Date(data.timestamp).toISOString()}] ${data.message}`
    );

    if (data.state === ToolExecutionState.IN_PROCESS && data.data) {
      this.bot.editMessageText(
        ` ${emoji}  Progress: ${data.data.progress || 0}%\n\n${data.message}`,
        {
          chat_id: this.chatId,
          message_id: this.messageId,
        }
      );
      console.log(`   Progress: ${data.data.progress || 0}%`);
    }

    if (data.state === ToolExecutionState.COMPLETED && data.data) {
      console.log(
        `   Result: ${JSON.stringify(data.data).substring(0, 100)}${JSON.stringify(data.data).length > 100 ? "..." : ""}`
      );
    }

    if (data.state === ToolExecutionState.FAILED && data.error) {
      this.bot.editMessageText(`   Error: ${data.error}`, {
        chat_id: this.chatId,
        message_id: this.messageId,
      });
    }
  }
}
