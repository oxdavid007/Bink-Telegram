import { TelegramBot } from "@/telegram-bot/telegram-bot";
import { formatSmartNumber } from "@/telegram-bot/utils/format-text";
import { EMessageType } from "../constants/enums";

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
  messagePlanListId: number;
  messageData: (type: string, message: string) => void;

  constructor(chatId: string, bot: TelegramBot, messageId: number, messageData: (type: string, message: string) => void) {
    this.chatId = chatId;
    this.bot = bot;
    this.messageId = messageId;
    this.messagePlanListId = 0;
    this.messageData = messageData;
  }

  setMessageId(messageId: number) {
    this.messageId = messageId;
  }

  setMessagePlanListId(messagePlanListId: number) {
    this.messagePlanListId = messagePlanListId;
  }

  setMessageData(messageData: (type: string, message: string) => void) {
    this.messageData = messageData;
  }


  onToolExecution(data: ToolExecutionData): void {
    const stateEmoji = {
      [ToolExecutionState.STARTED]: "🔸",
      [ToolExecutionState.IN_PROCESS]: "⏳",
      [ToolExecutionState.COMPLETED]: "✅",
      [ToolExecutionState.FAILED]: "❌",
      [ToolExecutionState.PENDING]: "⏳",
    };

    const emoji = stateEmoji[data.state] || "🔄";

    console.log(
      `${emoji} [${new Date(data.timestamp).toISOString()}] ${data.message}`
    );


    if (data.state === ToolExecutionState.STARTED && data.toolName === ToolName.CREATE_PLAN) {
      console.log("🚀 ~ ExampleToolExecutionCallback ~ onToolExecution ~ data:STARTED", data)
      let message = ``;

      // Format plans with title and tasks with radio buttons
      data.input.plans.forEach((plan: any, planIndex: number) => {
        if (plan.title) {
          message += `<b>Plan ${planIndex + 1}: ${plan.title}</b>\n\n`;

          if (plan.tasks && Array.isArray(plan.tasks)) {
            plan.tasks.forEach((task: string, taskIndex: number) => {
              message += `${emoji} ${task}\n`;
            });
          }

          message += '\n';
        }
      });
      try {
        // Delete the current message first
        this.bot.deleteMessage(this.chatId, this.messageId.toString())
          .then(() => {
            // After successful deletion, send the plan message
            return this.bot.sendMessage(this.chatId, message, {
              parse_mode: "HTML",
            });
          })
          .then(messagePlanListId => {
            this.setMessagePlanListId(messagePlanListId.message_id);
            // After sending plan message, send the executing message
            return this.bot.sendMessage(this.chatId, 'Executing plans...', {
              parse_mode: "HTML",
            });
          })
          .then(messageId => {
            this.setMessageId(messageId.message_id);
          })
          .catch(error => {
            console.error("🚀 ~ ExampleToolExecutionCallback ~ onToolExecution ~ error", error);
          });
      } catch (error) {
        console.error("🚀 ~ ExampleToolExecutionCallback ~ onToolExecution ~ error", error.message)
      }
    }

    if (data.state === ToolExecutionState.IN_PROCESS && data.data) {
      console.log("🚀 ~ ExampleToolExecutionCallback ~ onToolExecution ~ data:IN_PROCESS", data)
      if (data.data.progress < 100) {
        this.bot.editMessageText(`${emoji} ${data.message}`, {
          chat_id: this.chatId,
          message_id: this.messageId,
        });
      }

      console.log(`Progress: ${data.data.progress || 0}%`);
    }

    if (data.state === ToolExecutionState.COMPLETED && data.data) {
      console.log("🚀 ~ ExampleToolExecutionCallback ~ onToolExecution ~ data:COMPLETED", data)
      if (data.data?.status === "success" && (data.toolName === ToolName.SWAP || data.toolName === ToolName.BRIDGE)) {
        const getScanUrl = (network, txHash) => {
          const scanUrls = {
            'bnb': `https://bscscan.com/tx/${txHash}`,
            'ethereum': `https://etherscan.io/tx/${txHash}`,
            'solana': `https://solscan.io/tx/${txHash}`,
          };
          return scanUrls[network] || `${txHash}`;
        };

        let message;

        if (data.toolName === ToolName.SWAP) {
          const scanUrl = getScanUrl(data.data.network, data.data.transactionHash);
          message = `🎉 <b>Congratulations, your transaction has been successful.</b>
- <b>Swapped:</b> ${formatSmartNumber(data.data.fromAmount)} ${data.data.fromToken?.symbol || ''} 
- <b>Received:</b> ${formatSmartNumber(data.data.toAmount)} ${data.data.toToken?.symbol || ''}
- <b>Transaction Hash:</b> <a href="${scanUrl}">View on ${data.data.network.charAt(0).toUpperCase() + data.data.network.slice(1)} Explorer</a>
`;
        } else { // bridge
          const scanUrl = getScanUrl(data.data.fromNetwork, data.data.transactionHash);
          message = `🎉 <b>Congratulations, your transaction has been successful.</b>
- <b>Swapped:</b> ${formatSmartNumber(data.data.fromAmount)} ${data.data.fromToken?.symbol || ''} (${data.data.fromNetwork})
- <b>Received:</b> ${formatSmartNumber(data.data.toAmount)} ${data.data.toToken?.symbol || ''} (${data.data.toNetwork})
- <b>Transaction Hash:</b> <a href="${scanUrl}">View on ${data.data.fromNetwork.charAt(0).toUpperCase() + data.data.network.slice(1)} Explorer</a>
`;
        }
        this.messageData(EMessageType.TOOL_EXECUTION, message);
      }

      if (data.toolName === ToolName.UPDATE_PLAN) {
        let message = ``;

        console.log("🚀 ~ ExampleToolExecutionCallback ~ onToolExecution ~ data.data:COMPLETED", data?.data[0].tasks)

        // Format plans with title and tasks with radio buttons
        data.data.forEach((task: any, taskIndex: number) => {
          if (task.title) {
            message += `<b>Task ${taskIndex + 1}: ${task.title}</b>\n\n`;

            if (task.tasks && Array.isArray(task.tasks)) {
              task.tasks.forEach((task: any) => {
                const taskEmoji = stateEmoji[task.status] || "🔄";
                message += `${taskEmoji} ${task.title}\n`;
              });
            }

            message += '\n';
            if (task.status === ToolExecutionState.COMPLETED || task.status === ToolExecutionState.FAILED) {
              try {
                this.bot.deleteMessage(this.chatId, this.messagePlanListId?.toString());
              } catch (error) {
                console.error("🚀 ~ ExampleToolExecutionCallback ~ onToolExecution ~ error", error.message)
              }
            }
          }
        });

        try {
          this.bot.editMessageText(message, {
            chat_id: this.chatId,
            message_id: this.messagePlanListId,
            parse_mode: "HTML",
          })
        } catch (error) {
          console.error("🚀 ~ ExampleToolExecutionCallback ~ onToolExecution ~ error", error.message)
        }


      }
      console.log(
        `Result: ${JSON.stringify(data.data)} `
      );
    }

    if (data.state === ToolExecutionState.FAILED && data.error) {
      try {
        this.bot.editMessageText(`Error: ${data.error} `, {
          chat_id: this.chatId,
          message_id: this.messageId,
        });
      } catch (error) {
        console.error("🚀 ~ ExampleToolExecutionCallback ~ onToolExecution ~ error", error.message)
      }
    }
  }
}
