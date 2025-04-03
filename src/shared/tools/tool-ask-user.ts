import { IAskUserCallback, AskUserData } from "@binkai/core";

export class ExampleAskUserCallback implements IAskUserCallback {
  constructor(
    private currentMessageId: number,
    private askUserMessage: ({ message, timestamp, currentMessageId }: { message: string, timestamp: number, currentMessageId: number }) => void,
  ) { }

  setCurrentMessageId(currentMessageId: number): void {
    this.currentMessageId = currentMessageId;
  }

  setOnAskUserMessage(onAskUserMessage: ({ message, timestamp }: { message: string, timestamp: number }) => void): void {
    this.askUserMessage = onAskUserMessage;
  }

  onAskUser(data: AskUserData): void {
    console.log(`🚀 ~ ExampleAskUserCallback ~ onAskUser ~ data:`, data)
    console.log(`Ask user: ${data.question}`);
    this.askUserMessage({ message: data.question, timestamp: data.timestamp, currentMessageId: this.currentMessageId });
  }
}