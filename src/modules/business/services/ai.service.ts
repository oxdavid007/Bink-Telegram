import { Inject, Injectable, OnApplicationBootstrap } from "@nestjs/common";
import OpenAI from "openai";
import { ConfigService } from "@nestjs/config";
import { EventEmitter } from "events";
import { ethers, JsonRpcProvider } from "ethers";
import {
  Agent,
  Wallet,
  Network,
  settings,
  NetworkType,
  NetworksConfig,
} from "@binkai/core";
import { SwapPlugin } from "@binkai/swap-plugin";
import { PancakeSwapProvider } from "@binkai/pancakeswap-provider";
import { ChainId } from "@pancakeswap/sdk";
import { UserService } from "./user.service";
import { BirdeyeProvider } from "@binkai/birdeye-provider";
import { TokenPlugin } from "@binkai/token-plugin";
@Injectable()
export class AiService implements OnApplicationBootstrap {
  private openai: OpenAI;
  private networks: NetworksConfig["networks"];
  private birdeyeApi: BirdeyeProvider;
  mapAgent: Record<string, Agent> = {};

  @Inject("BSC_CONNECTION") private bscProvider: JsonRpcProvider;
  @Inject("ETHEREUM_CONNECTION") private ethProvider: JsonRpcProvider;

  constructor(
    private configService: ConfigService,
    private readonly userService: UserService
  ) {
    this.openai = new OpenAI({
      apiKey: this.configService.get<string>("openai.apiKey"),
    });
    this.networks = {
      bnb: {
        type: "evm" as NetworkType,
        config: {
          chainId: 56,
          rpcUrl: process.env.BSC_RPC_URL,
          name: "BNB Chain",
          nativeCurrency: {
            name: "BNB",
            symbol: "BNB",
            decimals: 18,
          },
        },
      },
      ethereum: {
        type: "evm" as NetworkType,
        config: {
          chainId: 1,
          rpcUrl: process.env.ETHEREUM_RPC_URL,
          name: "Ethereum",
          nativeCurrency: {
            name: "Ether",
            symbol: "ETH",
            decimals: 18,
          },
        },
      },
    };
    this.birdeyeApi = new BirdeyeProvider({
      apiKey: this.configService.get<string>("birdeye.birdeyeApiKey"),
    });
  }

  async onApplicationBootstrap() {
    // Create PancakeSwap provider with BSC chain ID
  }

  async handleSwap(telegramId: string, input: string) {
    try {
      const keys = await this.userService.getMnemonicByTelegramId(telegramId);
      const network = new Network({ networks: this.networks });
      const wallet = new Wallet(
        {
          seedPhrase: keys,
          index: 0,
        },
        network
      );

      let agent = this.mapAgent[telegramId];

      //init agent
      if (!agent) {
        const pancakeswap = new PancakeSwapProvider(
          this.bscProvider,
          ChainId.BSC
        );

        const swapPlugin = new SwapPlugin();
        const tokenPlugin = new TokenPlugin();

        // Initialize the swap plugin with supported chains and providers
        await Promise.all([
          swapPlugin.initialize({
            defaultSlippage: 0.5,
            defaultChain: "bnb",
            providers: [pancakeswap],
            supportedChains: ["bnb", "ethereum"], // These will be intersected with agent's networks
          }),
          tokenPlugin.initialize({
            defaultChain: "bnb",
            providers: [this.birdeyeApi],
            supportedChains: ["solana", "bnb"],
          }),
        ]);

        agent = new Agent(
          {
            model: "gpt-4o",
            temperature: 0,
            systemPrompt:
              "You are a BINK AI agent. You are able to perform swaps and get token information on multiple chains. If you do not have the token address, you can use the symbol to get the token information before performing a swap.",
          },
          wallet,
          this.networks
        );
        await agent.registerPlugin(swapPlugin);
        await agent.registerPlugin(tokenPlugin);
        this.mapAgent[telegramId] = agent;
      }

      const inputResult = await agent.execute({
        input: `
        ${input}
      `,
      });

      return inputResult || "test";
    } catch (error) {
      console.error("Error in handleSwap:", error);
      return "test";
    }
  }

  async createChatCompletion(
    messages: Array<{ role: "user" | "assistant" | "system"; content: string }>,
    options: {
      model?: string;
      temperature?: number;
      maxTokens?: number;
    } = {}
  ) {
    try {
      const completion = await this.openai.chat.completions.create({
        messages,
        model: options.model || "gpt-3.5-turbo",
        temperature: options.temperature || 0.7,
        max_tokens: options.maxTokens || 1000,
      });

      return {
        success: true,
        content: completion.choices[0]?.message?.content || "",
        usage: completion.usage,
      };
    } catch (error) {
      console.error("Error in chat completion:", error);
      return {
        success: false,
        error: error.message || "Failed to generate chat completion",
      };
    }
  }

  async streamChatCompletion(
    messages: Array<{ role: "user" | "assistant" | "system"; content: string }>,
    options: {
      model?: string;
      temperature?: number;
      maxTokens?: number;
    } = {}
  ): Promise<EventEmitter> {
    const eventEmitter = new EventEmitter();
    let fullText = "";

    try {
      const stream = await this.openai.chat.completions.create({
        messages,
        model: options.model || "gpt-3.5-turbo",
        temperature: options.temperature || 0.7,
        max_tokens: options.maxTokens || 1000,
        stream: true,
      });

      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content || "";
        if (content) {
          fullText += content;
          eventEmitter.emit("data", content);
        }
      }

      eventEmitter.emit("end", fullText);
      return eventEmitter;
    } catch (error) {
      console.error("Error in stream chat completion:", error);
      eventEmitter.emit("error", error);
      throw error;
    }
  }

  // Helper method to consume stream with async iterator
  async *generateStreamResponse(
    messages: Array<{ role: "user" | "assistant" | "system"; content: string }>,
    options: {
      model?: string;
      temperature?: number;
      maxTokens?: number;
    } = {}
  ) {
    try {
      const stream = await this.openai.chat.completions.create({
        messages,
        model: options.model || "gpt-3.5-turbo",
        temperature: options.temperature || 0.7,
        max_tokens: options.maxTokens || 1000,
        stream: true,
      });

      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content || "";
        if (content) {
          yield content;
        }
      }
    } catch (error) {
      console.error("Error in generate stream response:", error);
      throw error;
    }
  }
}
