import { TelegramBot } from "@/telegram-bot/telegram-bot";
import { formatSmartNumber } from "@/telegram-bot/utils/format-text";

/**
 * Enum representing the different states of a tool execution
 */
export enum ToolExecutionState {
  STARTED = "started",
  IN_PROCESS = "in_process",
  PENDING = "pending",
  COMPLETED = "completed",
  FAILED = "failed",
}

/**
 * Enum representing the different tool names
 */
export enum ToolName {
  CREATE_PLAN = "create_plan",
  UPDATE_PLAN = "update_plan",
  SWAP = "swap",
  BRIDGE = "bridge"
}

/**
 * Interface for tool execution data
 */
export interface ToolExecutionData {
  state: ToolExecutionState;
  timestamp: number;
  message: string;
  toolName?: string;
  input?: {
    plans?: {
      title?: string;
      tasks?: string[];
    }[];
  };
  data?: {
    progress?: number;
    network?: string;
    transactionHash?: string;
    fromAmount?: number;
    toAmount?: number;
    fromToken?: { symbol: string };
    toToken?: { symbol: string };
    fromNetwork?: string;
    toNetwork?: string;
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

class MessageFormatter {
  private static readonly stateEmoji = {
    [ToolExecutionState.STARTED]: "🔸",
    [ToolExecutionState.IN_PROCESS]: "⏳",
    [ToolExecutionState.COMPLETED]: "✅",
    [ToolExecutionState.FAILED]: "❌",
    [ToolExecutionState.PENDING]: "⏳",
  };

  static getStateEmoji(state: ToolExecutionState): string {
    return this.stateEmoji[state] || "🔄";
  }

  static formatPlanMessage(plans: any[], emoji: string): string {
    let message = '';
    plans.forEach((plan: any, planIndex: number) => {
      if (plan.title) {
        message += `<b>Plan ${planIndex + 1}: ${plan.title}</b>\n\n`;
        if (plan.tasks?.length) {
          plan.tasks.forEach((task: string) => {
            message += `${emoji} ${task}\n`;
          });
        }
        message += '\n';
      }
    });
    return message;
  }

  static formatTransactionMessage(data: any, toolName: ToolName): string {
    const getScanUrl = (network: string, txHash: string) => {
      const scanUrls = {
        'bnb': `https://bscscan.com/tx/${txHash}`,
        'ethereum': `https://etherscan.io/tx/${txHash}`,
        'solana': `https://solscan.io/tx/${txHash}`,
      };
      return scanUrls[network] || txHash;
    };

    const scanUrl = getScanUrl(data.network, data.transactionHash);
    const networkName = data.network.charAt(0).toUpperCase() + data.network.slice(1);

    if (toolName === ToolName.SWAP) {
      return `🎉 <b>Congratulations, your transaction has been successful.</b>
- <b>Swapped:</b> ${formatSmartNumber(data.fromAmount)} ${data.fromToken?.symbol || ''} 
- <b>Received:</b> ${formatSmartNumber(data.toAmount)} ${data.toToken?.symbol || ''}
- <b>Transaction Hash:</b> <a href="${scanUrl}">View on ${networkName} Explorer</a>`;
    }

    return `🎉 <b>Congratulations, your transaction has been successful.</b>
- <b>Swapped:</b> ${formatSmartNumber(data.fromAmount)} ${data.fromToken?.symbol || ''} (${data.fromNetwork})
- <b>Received:</b> ${formatSmartNumber(data.toAmount)} ${data.toToken?.symbol || ''} (${data.toNetwork})
- <b>Transaction Hash:</b> <a href="${scanUrl}">View on ${networkName} Explorer</a>`;
  }

  static formatUpdatePlanMessage(tasks: any[]): string {
    let message = '';
    tasks.forEach((task: any, taskIndex: number) => {
      if (task.title) {
        message += `<b>Task ${taskIndex + 1}: ${task.title}</b>\n\n`;
        if (task.tasks?.length) {
          task.tasks.forEach((subTask: any) => {
            const taskEmoji = this.getStateEmoji(subTask.status);
            message += `${taskEmoji} ${subTask.title}\n`;
          });
        }
        message += '\n';
      }
    });
    return message;
  }
}

/**
 * Example implementation of the IToolExecutionCallback interface
 * that logs tool execution data with emojis and formatting
 */
export class ExampleToolExecutionCallback implements IToolExecutionCallback {
  constructor(
    private readonly chatId: string,
    private readonly bot: TelegramBot,
    private messageId: number,
    private onMessage: ({ message, toolName }: { message: string, toolName: string }) => void,
    private onPlanningMessage: ({ message, toolName }: { message: string, toolName: string }) => void
  ) { }

  setMessageId(messageId: number): void {
    this.messageId = messageId;
  }

  setOnMessage(onMessage: ({ message, toolName }: { message: string, toolName: string }) => void): void {
    this.onMessage = onMessage;
  }

  setOnPlanningMessage(onPlanningMessage: ({ message, toolName }: { message: string, toolName: string }) => void): void {
    this.onPlanningMessage = onPlanningMessage;
  }

  onToolExecution(data: ToolExecutionData): void {
    const emoji = MessageFormatter.getStateEmoji(data.state);
    console.log(`${emoji} [${new Date(data.timestamp).toISOString()}] ${data.message}`);

    switch (data.state) {
      case ToolExecutionState.STARTED:
        this.handleStartedState(data, emoji);
        break;
      case ToolExecutionState.IN_PROCESS:
        this.handleInProcessState(data, emoji);
        break;
      case ToolExecutionState.COMPLETED:
        this.handleCompletedState(data, emoji);
        break;
      case ToolExecutionState.FAILED:
        this.handleFailedState(data);
        break;
    }
  }

  private handleStartedState(data: ToolExecutionData, emoji: string): void {
    if (data.toolName === ToolName.CREATE_PLAN && data.input?.plans) {
      const message = MessageFormatter.formatPlanMessage(data.input.plans, emoji);
      this.onPlanningMessage({ message, toolName: ToolName.CREATE_PLAN });
    }
  }

  private handleInProcessState(data: ToolExecutionData, emoji: string): void {
    if (data.data?.progress && data.data.progress < 100) {
      this.bot.editMessageText(`${emoji} ${data.message}`, {
        chat_id: this.chatId,
        message_id: this.messageId,
      });
    }
  }

  private handleCompletedState(data: ToolExecutionData, emoji: string): void {
    if (data.data?.status === "success" && (data.toolName === ToolName.SWAP || data.toolName === ToolName.BRIDGE)) {
      const message = MessageFormatter.formatTransactionMessage(data.data, data.toolName);
      this.onMessage({ message, toolName: data.toolName });
    }

    if (data.toolName === ToolName.UPDATE_PLAN && Array.isArray(data.data)) {
      const message = MessageFormatter.formatUpdatePlanMessage(data.data);
      this.onPlanningMessage({ message, toolName: ToolName.UPDATE_PLAN });
    }
  }

  private handleFailedState(data: ToolExecutionData): void {
    if (data.error) {
      this.bot.editMessageText(`Error: ${data.error}`, {
        chat_id: this.chatId,
        message_id: this.messageId,
      });
    }
  }
}
