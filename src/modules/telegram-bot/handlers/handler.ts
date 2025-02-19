import { CallbackQuery, ChatId } from "node-telegram-bot-api";

// Add default interface containing common fields
export interface DefaultHandlerParams {
  chatId: ChatId;
  telegramId: string;
  firstName: string;
  messageId?: number;
}

// Update interfaces to inherit from DefaultHandlerParams
export interface StartHandlerParams extends DefaultHandlerParams {}

export interface OpenMiniAppHandlerParams {
  chatId: ChatId;
}

export interface UserInputHandlerParams extends DefaultHandlerParams {
  text: string;
}

export interface BuyHandlerParams extends DefaultHandlerParams {
  text: string;
}

export interface SellHandlerParams extends DefaultHandlerParams {
  text: string;
}

export interface CustomAmountHandlerParams extends DefaultHandlerParams {
  text: string;
}

export interface TokenInfoHandlerParams {
  chatId: ChatId;
  tokenAddress: string;
  telegramId: string;
}

export interface TokenInfoCallbackHandlerParams extends CallbackQuery {}

export interface Handler {
  handler: (params: any) => Promise<void>;
}
