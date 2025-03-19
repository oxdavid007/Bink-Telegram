import { Inject, Injectable, OnApplicationBootstrap } from '@nestjs/common';
import OpenAI from 'openai';
import { ConfigService } from '@nestjs/config';
import { EventEmitter } from 'events';
import { ethers, JsonRpcProvider } from 'ethers';
import { Agent, Wallet, Network, settings, NetworkType, NetworksConfig, UUID } from '@binkai/core';
import { SwapPlugin } from '@binkai/swap-plugin';
import { PancakeSwapProvider } from '@binkai/pancakeswap-provider';
import { ChainId } from '@pancakeswap/sdk';
import { UserService } from './user.service';
import { BirdeyeProvider } from '@binkai/birdeye-provider';
import { TokenPlugin } from '@binkai/token-plugin';
import { PostgresDatabaseAdapter } from '@binkai/postgres-adapter';
import { KnowledgePlugin } from '@binkai/knowledge-plugin';
import { BinkProvider } from '@binkai/bink-provider';
import { FourMemeProvider } from '@binkai/four-meme-provider';
import { OkxProvider } from '@binkai/okx-provider';
import { deBridgeProvider } from '@binkai/debridge-provider';
import { BridgePlugin } from '@binkai/bridge-plugin';
import { WalletPlugin } from '@binkai/wallet-plugin';
import { BnbProvider } from '@binkai/rpc-provider';
import { ExampleToolExecutionCallback } from '@/shared/tools/tool-execution';
import { TelegramBot } from '@/telegram-bot/telegram-bot';
import { StakingPlugin } from '@binkai/staking-plugin';
import { VenusProvider } from '@binkai/venus-provider';
import { ThenaProvider } from '@binkai/thena-provider';
import { JupiterProvider } from '@binkai/jupiter-provider';
import { Connection } from '@solana/web3.js';

@Injectable()
export class AiService implements OnApplicationBootstrap {
  private openai: OpenAI;
  private networks: NetworksConfig['networks'];
  private birdeyeApi: BirdeyeProvider;
  private postgresAdapter: PostgresDatabaseAdapter;
  private binkProvider: BinkProvider;
  private bnbProvider: BnbProvider;

  @Inject(TelegramBot)
  private bot: TelegramBot;
  mapAgent: Record<string, Agent> = {};
  mapToolExecutionCallback: Record<string, ExampleToolExecutionCallback> = {};
  @Inject('BSC_CONNECTION') private bscProvider: JsonRpcProvider;
  @Inject('ETHEREUM_CONNECTION') private ethProvider: JsonRpcProvider;

  constructor(
    private configService: ConfigService,
    private readonly userService: UserService,
  ) {
    this.openai = new OpenAI({
      apiKey: this.configService.get<string>('openai.apiKey'),
    });
    this.networks = {
      bnb: {
        type: 'evm' as NetworkType,
        config: {
          chainId: 56,
          rpcUrl: process.env.BSC_RPC_URL,
          name: 'BNB Chain',
          nativeCurrency: {
            name: 'BNB',
            symbol: 'BNB',
            decimals: 18,
          },
        },
      },
      ethereum: {
        type: 'evm' as NetworkType,
        config: {
          chainId: 1,
          rpcUrl: process.env.ETHEREUM_RPC_URL,
          name: 'Ethereum',
          nativeCurrency: {
            name: 'Ether',
            symbol: 'ETH',
            decimals: 18,
          },
        },
      },
      solana: {
        type: 'solana' as NetworkType,
        config: {
          rpcUrl: process.env.RPC_URL,
          name: 'Solana',
          nativeCurrency: {
            name: 'Solana',
            symbol: 'SOL',
            decimals: 9,
          },
        },
      },
    };
    this.birdeyeApi = new BirdeyeProvider({
      apiKey: this.configService.get<string>('birdeye.birdeyeApiKey'),
    });
    this.postgresAdapter = new PostgresDatabaseAdapter({
      connectionString: this.configService.get<string>('postgres_ai.postgresUrl'),
    });

    this.binkProvider = new BinkProvider({
      apiKey: this.configService.get<string>('bink.apiKey'),
      baseUrl: this.configService.get<string>('bink.baseUrl'),
    });

    this.bnbProvider = new BnbProvider({
      rpcUrl: process.env.BSC_RPC_URL,
    });
  }

  async onApplicationBootstrap() {}

  async handleSwap(telegramId: string, input: string, messageId: number) {
    try {
      const keys = await this.userService.getMnemonicByTelegramId(telegramId);
      if (!keys) {
        return 'Please /start first';
      }
      const user = await this.userService.getOrCreateUser({
        telegram_id: telegramId,
      });

      const network = new Network({ networks: this.networks });
      const wallet = new Wallet(
        {
          seedPhrase: keys,
          index: 0,
        },
        network,
      );

      let agent = this.mapAgent[telegramId];

      //init agent
      if (!agent) {
        const bscChainId = 56;
        const pancakeswap = new PancakeSwapProvider(this.bscProvider, bscChainId);

        const okx = new OkxProvider(this.bscProvider, bscChainId);

        const fourMeme = new FourMemeProvider(this.bscProvider, bscChainId);
        const venus = new VenusProvider(this.bscProvider, bscChainId);
        const jupiter = new JupiterProvider(new Connection(process.env.RPC_URL));

        const swapPlugin = new SwapPlugin();
        const tokenPlugin = new TokenPlugin();
        const knowledgePlugin = new KnowledgePlugin();
        const bridgePlugin = new BridgePlugin();
        const debridge = new deBridgeProvider(this.bscProvider);
        const walletPlugin = new WalletPlugin();
        const stakingPlugin = new StakingPlugin();

        const thena = new ThenaProvider(this.bscProvider, bscChainId);

        // Initialize the swap plugin with supported chains and providers
        await Promise.all([
          swapPlugin.initialize({
            defaultSlippage: 0.5,
            defaultChain: 'bnb',
            providers: [pancakeswap, fourMeme, okx, thena, jupiter],
            supportedChains: ['bnb', 'ethereum', 'solana'], // These will be intersected with agent's networks
          }),
          tokenPlugin.initialize({
            defaultChain: 'bnb',
            providers: [this.birdeyeApi, fourMeme as any],
            supportedChains: ['solana', 'bnb'],
          }),
          await knowledgePlugin.initialize({
            providers: [this.binkProvider],
          }),
          await bridgePlugin.initialize({
            defaultChain: 'bnb',
            providers: [debridge],
            supportedChains: ['bnb', 'solana'],
          }),
          await walletPlugin.initialize({
            defaultChain: 'bnb',
            providers: [this.bnbProvider, this.birdeyeApi],
            supportedChains: ['bnb'],
          }),
          await stakingPlugin.initialize({
            defaultSlippage: 0.5,
            defaultChain: 'bnb',
            providers: [venus],
            supportedChains: ['bnb', 'ethereum'], // These will be intersected with agent's networks
          }),
        ]);

        agent = new Agent(
          {
            model: 'gpt-4o',
            temperature: 0,
            systemPrompt: `You are a BINK AI assistant. You can help user to query blockchain data .You are able to perform swaps and get token information on multiple chains. If you do not have the token address, you can use the symbol to get the token information before performing a swap.
        Your respone format:
         BINK’s tone is informative, bold, and subtly mocking, blending wit with a cool edge for the crypto crowd. Think chain-vaping degen energy, but refined—less "honey, sit down" and more "I’ve got this, you don’t."
Fiercely Casual – Slang, laid-back flow, and effortless LFG vibes.
Witty with a Jab – Dry humor, sharp one-liners—more smirk, less roast.
Confident & Cool – Market takes with swagger—just facts, no fluff.
Crew Leader – Speaks degen, leads with "pay attention" energy.
Subtle Shade – Calls out flops with a "nice try" tone, not full-on slander.
BINK isn’t here to babysit. It’s sharp, fast, and always ahead of the curve—dropping crypto insights with a mocking wink, perfect for X’s chaos.    
CRITICAL: 
1. Format your responses in Telegram HTML style. 
2. DO NOT use markdown. 
3. Using HTML tags like <b>bold</b>, <i>italic</i>, <code>code</code>, <pre>preformatted</pre>, and <a href="URL">links</a>. \n\nWhen displaying token information or swap details:\n- Use <b>bold</b> for important values and token names\n- Use <code>code</code> for addresses and technical details\n- Use <i>italic</i> for additional information
            `,
          },
          wallet,
          this.networks,
        );
        await agent.initialize();
        await agent.registerPlugin(swapPlugin);
        await agent.registerPlugin(tokenPlugin);
        await agent.registerDatabase(this.postgresAdapter);
        await agent.registerPlugin(knowledgePlugin);
        await agent.registerPlugin(bridgePlugin);
        await agent.registerPlugin(walletPlugin);
        await agent.registerPlugin(stakingPlugin);
        const toolExecutionCallback = new ExampleToolExecutionCallback(
          telegramId,
          this.bot,
          messageId,
        );
        this.mapToolExecutionCallback[telegramId] = toolExecutionCallback;
        agent.registerToolExecutionCallback(toolExecutionCallback as any);
        this.mapAgent[telegramId] = agent;
      }

      this.mapToolExecutionCallback[telegramId].setMessageId(messageId);

      const inputResult = await agent.execute({
        input: `
        ${input}
      `,
        threadId: user.current_thread_id as UUID,
      });

      return inputResult.replace(/\*\*(.*?)\*\*/g, '<b>$1</b>') || 'test';
    } catch (error) {
      console.error('Error in handleSwap:', error);
      return 'test';
    }
  }

  async createChatCompletion(
    messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>,
    options: {
      model?: string;
      temperature?: number;
      maxTokens?: number;
    } = {},
  ) {
    try {
      const completion = await this.openai.chat.completions.create({
        messages,
        model: options.model || 'gpt-3.5-turbo',
        temperature: options.temperature || 0.7,
        max_tokens: options.maxTokens || 1000,
      });

      return {
        success: true,
        content: completion.choices[0]?.message?.content || '',
        usage: completion.usage,
      };
    } catch (error) {
      console.error('Error in chat completion:', error);
      return {
        success: false,
        error: error.message || 'Failed to generate chat completion',
      };
    }
  }

  async streamChatCompletion(
    messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>,
    options: {
      model?: string;
      temperature?: number;
      maxTokens?: number;
    } = {},
  ): Promise<EventEmitter> {
    const eventEmitter = new EventEmitter();
    let fullText = '';

    try {
      const stream = await this.openai.chat.completions.create({
        messages,
        model: options.model || 'gpt-3.5-turbo',
        temperature: options.temperature || 0.7,
        max_tokens: options.maxTokens || 1000,
        stream: true,
      });

      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content || '';
        if (content) {
          fullText += content;
          eventEmitter.emit('data', content);
        }
      }

      eventEmitter.emit('end', fullText);
      return eventEmitter;
    } catch (error) {
      console.error('Error in stream chat completion:', error);
      eventEmitter.emit('error', error);
      throw error;
    }
  }

  // Helper method to consume stream with async iterator
  async *generateStreamResponse(
    messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>,
    options: {
      model?: string;
      temperature?: number;
      maxTokens?: number;
    } = {},
  ) {
    try {
      const stream = await this.openai.chat.completions.create({
        messages,
        model: options.model || 'gpt-3.5-turbo',
        temperature: options.temperature || 0.7,
        max_tokens: options.maxTokens || 1000,
        stream: true,
      });

      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content || '';
        if (content) {
          yield content;
        }
      }
    } catch (error) {
      console.error('Error in generate stream response:', error);
      throw error;
    }
  }
}
