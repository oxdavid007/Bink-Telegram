import { Inject, Injectable } from "@nestjs/common";
import { Message, CallbackQuery } from "node-telegram-bot-api";
import { OpenMiniAppHandler } from "../handlers/open-mini-app.handler";
import { StartHandler } from "../handlers/start.handler";
import { Handler } from "../handlers/handler";
import { COMMAND_KEYS, USER_INPUT } from "../constants";
import { UserInputHandler } from "../handlers/user-input.handler";
import { BuyHandler } from "../handlers/buy.handler";
import { TokenInfoHandler } from "../handlers/token-info.handler";
import { CustomAmountHandler } from "../handlers/custom-amount.handler";
import { ConfirmBuyHandler } from "../handlers/confirm-buy.handler";
import { SellHandler } from "../handlers/sell.handler";
import { SellTokenDetailHandler } from "../handlers/sell-token-detail.handler";
import { ConfirmSellHandler } from "../handlers/confirm-sell.handler";
import { WalletHandler } from "../handlers/wallet.handler";
import { ExportKeysHandler } from "../handlers/export-keys.handler";
import { ComingSoonHandler } from "../handlers/coming-soon.handler";
import { WithdrawHandler } from "../handlers/withdraw.handler";
import { CustomPercentageHandler } from "../handlers/custom-percentage.handler";
import { HelpHandler } from "../handlers/help.handler";
import { ReferralHandler } from "../handlers/referral.handler";
import { ClearHandler } from "../handlers/clear.handler";

@Injectable()
export class HandlerService {
  constructor(
    private readonly startHandler: StartHandler,
    private readonly openMiniAppHandler: OpenMiniAppHandler,
    private readonly userInputHandler: UserInputHandler,
    private readonly buyHandler: BuyHandler,
    private readonly tokenInfoHandler: TokenInfoHandler,
    private readonly customAmountHandler: CustomAmountHandler,
    private readonly confirmBuyHandler: ConfirmBuyHandler,
    private readonly sellHandler: SellHandler,
    private readonly sellTokenDetailHandler: SellTokenDetailHandler,
    private readonly confirmSellHandler: ConfirmSellHandler,
    private readonly walletHandler: WalletHandler,
    private readonly exportKeysHandler: ExportKeysHandler,
    private readonly comingSoonHandler: ComingSoonHandler,
    private readonly withdrawHandler: WithdrawHandler,
    private readonly customPercentageHandler: CustomPercentageHandler,
    private readonly helpHandler: HelpHandler,
    private readonly referralHandler: ReferralHandler,
    private readonly clearHandler: ClearHandler,
  ) { }

  getHandlers(): Record<string, Handler> {
    return {
      [COMMAND_KEYS.START]: this.startHandler,
      [COMMAND_KEYS.OPEN_MINI_APP]: this.openMiniAppHandler,
      [USER_INPUT]: this.userInputHandler,
      [COMMAND_KEYS.BUY]: this.buyHandler,
      [COMMAND_KEYS.TOKEN_INFO_CALLBACK]: this.tokenInfoHandler,
      [COMMAND_KEYS.CUSTOM_AMOUNT]: this.customAmountHandler,
      [COMMAND_KEYS.CONFIRM_BUY]: this.confirmBuyHandler,
      [COMMAND_KEYS.SELL]: this.sellHandler,
      [COMMAND_KEYS.SELL_TOKEN]: this.sellTokenDetailHandler,
      [COMMAND_KEYS.CONFIRM_SELL]: this.confirmSellHandler,
      [COMMAND_KEYS.WALLETS]: this.walletHandler,
      [COMMAND_KEYS.EXPORT_KEYS]: this.exportKeysHandler,
      [COMMAND_KEYS.COMING_SOON]: this.comingSoonHandler,
      [COMMAND_KEYS.WITHDRAW]: this.withdrawHandler,
      [COMMAND_KEYS.CUSTOM_PERCENTAGE]: this.customPercentageHandler,
      [COMMAND_KEYS.HELP]: this.helpHandler,
      [COMMAND_KEYS.REFERRAL]: this.referralHandler,
      [COMMAND_KEYS.CLEAR]: this.clearHandler,
    };
  }

  async handleMessage(message: Message) {
    console.log('🚀 ~ HandlerService ~ handleMessage ~ message:', message);
    const { text, chat, from } = message;

    if (!text) return;

    const command = text.toLowerCase();
    const chatId = chat.id;
    const telegramId = from.id.toString();
    const firstName = from.first_name;
    const username = from.username;

    switch (command) {
      case COMMAND_KEYS.START:
        await this.startHandler.handler({
          chatId,
          telegramId,
          firstName,
          username,
          text,
        });
        break;
      case COMMAND_KEYS.OPEN_MINI_APP:
        await this.openMiniAppHandler.handler({ chatId });
        break;
      case COMMAND_KEYS.BUY:
        await this.buyHandler.handler({
          chatId,
          telegramId,
          firstName,
          text,
        });
        break;
      case COMMAND_KEYS.CLEAR:
        await this.clearHandler.handler({
          chatId,
          telegramId,
          firstName,
        });
        break;
      default:
        await this.userInputHandler.handler({
          chatId,
          telegramId,
          text,
        });
        break;
    }
  }
}
