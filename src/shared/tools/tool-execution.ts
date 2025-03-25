import { TelegramBot } from "@/telegram-bot/telegram-bot";
import { formatSmartNumber } from "@/telegram-bot/utils/format-text";

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
  toolName?: string;
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
  onMessage: (message: string) => void;

  constructor(chatId: string, bot: TelegramBot, messageId: number, onMessage: (message: string) => void) {
    this.chatId = chatId;
    this.bot = bot;
    this.messageId = messageId;
    this.onMessage = onMessage;
  }

  setMessageId(messageId: number) {
    this.messageId = messageId;
  }

  setOnMessage(onMessage: (message: string) => void) {
    this.onMessage = onMessage;
  }


  onToolExecution(data: ToolExecutionData): void {
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
      if (data.data.progress < 100) {
        this.bot.editMessageText(`${emoji} ${data.message}`, {
          chat_id: this.chatId,
          message_id: this.messageId,
        });
      }

      console.log(`Progress: ${data.data.progress || 0}%`);
    }

    if (data.state === ToolExecutionState.COMPLETED && data.data) {
      if (data.data?.status === "success" && (data.toolName === 'swap' || data.toolName === 'bridge')) {
        const getScanUrl = (network, txHash) => {
          const scanUrls = {
            'bnb': `https://bscscan.com/tx/${txHash}`,
            'ethereum': `https://etherscan.io/tx/${txHash}`,
            'solana': `https://solscan.io/tx/${txHash}`,
          };
          return scanUrls[network] || `${txHash}`;
        };

        const scanUrl = getScanUrl(data.data.network, data.data.transactionHash);
        let message;

        if (data.toolName === 'swap') {
          message = `🎉 Congratulations, your transaction has been successful.
- <b>Swapped:</b> ${formatSmartNumber(data.data.fromAmount)} ${data.data.fromToken?.symbol || ''} 
- <b>Received:</b> ${formatSmartNumber(data.data.toAmount)} ${data.data.toToken?.symbol || ''}
- <b>Transaction Hash:</b> <a href="${scanUrl}">View on ${data.data.network.charAt(0).toUpperCase() + data.data.network.slice(1)} Explorer</a>
`;
        } else { // bridge
          message = `🎉 Congratulations, your transaction has been successful.
- <b>Swapped:</b> ${formatSmartNumber(data.data.fromAmount)} ${data.data.fromToken?.symbol || ''} (${data.data.fromNetwork})
- <b>Received:</b> ${formatSmartNumber(data.data.toAmount)} ${data.data.toToken?.symbol || ''} (${data.data.toNetwork})
- <b>Transaction Hash:</b> <a href="${scanUrl}">View on ${data.data.network.charAt(0).toUpperCase() + data.data.network.slice(1)} Explorer</a>
`;
        }
        this.onMessage(message);
      }

      console.log(
        `Result: ${JSON.stringify(data.data).substring(0, 100)}${JSON.stringify(data.data).length > 100 ? "..." : ""} `
      );
    }

    if (data.state === ToolExecutionState.FAILED && data.error) {
      this.bot.editMessageText(`Error: ${data.error} `, {
        chat_id: this.chatId,
        message_id: this.messageId,
      });
    }
  }
}
