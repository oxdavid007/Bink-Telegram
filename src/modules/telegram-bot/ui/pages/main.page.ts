import { buildPhotoOptions, createMenuButton } from "../../utils";

import { COMMAND_KEYS } from "../../constants/command-keys";
import { PhotoResponse } from "../../types";
import { PhotoPage } from "./page";
import fs from "fs";
import path from "path";

export class MainPage implements PhotoPage {
  constructor() {}

  build(): PhotoResponse {
    const imageFilePath = path.join(__dirname, "../../../../images/start.jpg");

    const photo = fs.readFileSync(imageFilePath);

    const messageText =
      `<b>🚀 Welcome to Bink AI – The Future of DeFAI on BNB Chain.</b>\n\n` +
      `<b>What can Bink do?</b>\n\n` +
      `<b>📊 AI Insights:</b> Market trends & token analysis (X & Telegram)\n\n` +
      `<b>🛠 On-Chain Execution:</b> AI-powered trading & automation (Telegram Only)\n\n` +
      `<b>💠 <a href="https://binkos.dev">BinkOS</a>:</b> The Ultimate DeFAI Framework for Developers\n\n` +
      `<b>Automate. Trade smarter. Stay ahead.</b>\n\n` +
      `<b><a href="https://twitter.com/BinkAI_">X</a> </b>| <b><a href="https://t.me/BinkAI_Community">Community</a></b> | <b><a href="https://bink.ai">Website</a></b>`;

    const buttons = [
      [
        createMenuButton("💳 Wallets", COMMAND_KEYS.WALLETS),
        createMenuButton("📚 How to use", COMMAND_KEYS.HELP),

        // createMenuButton("Buy", COMMAND_KEYS.BUY),
        // createMenuButton("Sell", COMMAND_KEYS.SELL),
      ],
      // [
      //   createMenuButton("Positions (soon)", COMMAND_KEYS.COMING_SOON),
      //   createMenuButton("Limit Orders (soon)", COMMAND_KEYS.COMING_SOON),
      //   createMenuButton("DCA Orders (soon)", COMMAND_KEYS.COMING_SOON),
      // ],
      // [
      //   createMenuButton("Copy Trade (soon)", COMMAND_KEYS.COMING_SOON),
      //   createMenuButton("Sniper NEW (soon)", COMMAND_KEYS.COMING_SOON),
      // ],
      // [
      //   createMenuButton("Trenches (soon)", COMMAND_KEYS.COMING_SOON),
      //   createMenuButton("💰 Referrals (soon)", COMMAND_KEYS.COMING_SOON),
      //   createMenuButton("⭐ Watchlist (soon)", COMMAND_KEYS.COMING_SOON),
      // ],
      [
        createMenuButton("💌 Referral", COMMAND_KEYS.REFERRAL),
        createMenuButton("📱 BinkOS", undefined, "https://bink.ai"),
      ],
      // [
      //   createMenuButton("Help (soon)", COMMAND_KEYS.COMING_SOON),
      //   createMenuButton("🔄 Refresh (soon)", COMMAND_KEYS.COMING_SOON),
      // ],
    ];

    const menu = buildPhotoOptions(buttons, messageText);

    return {
      menu,
      photo,
    };
  }
}
