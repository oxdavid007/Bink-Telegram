import { IHumanReviewCallback, HumanReviewData } from "@binkai/core";
import { ToolName } from "./tool-execution";
import { formatSmartNumber } from "@/telegram-bot/utils/format-text";
export class ExampleHumanReviewCallback implements IHumanReviewCallback {
  constructor(
    private currentMessageId: number,
    private onHumanReviewMessage: ({ message, toolName, currentMessageId }: { message: string, toolName: string, currentMessageId: number }) => void,
  ) { }

  setCurrentMessageId(currentMessageId: number): void {
    this.currentMessageId = currentMessageId;
  }

  onHumanReview(data: HumanReviewData): void {
    console.log("🚀 ~ ExampleHumanReviewCallback ~ onHumanReview ~ data:", data)
    console.log(`Human review: ${data.toolName}`, data.data);
    if (data.toolName === ToolName.SWAP) {

      const message = `🎉 <b>Review the transaction details and confirm if you want to proceed.</b>
- <b>Swap:</b> ${formatSmartNumber(data.data.fromAmount)} ${data.data.fromToken?.symbol || ''} 
- <b>Received:</b> ${formatSmartNumber(data.data.toAmount)} ${data.data.toToken?.symbol || ''}  
- <b>Network:</b> ${data.data.network.charAt(0).toUpperCase() + data.data.network.slice(1)}
- <b>Slippage:</b> ${data.data.slippage}
`;
      this.onHumanReviewMessage({ message: message, toolName: data.toolName, currentMessageId: this.currentMessageId });
    }
  }
}