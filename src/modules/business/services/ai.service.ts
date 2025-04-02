import { Inject, Injectable, OnApplicationBootstrap } from '@nestjs/common';
import OpenAI from 'openai';
import { ConfigService } from '@nestjs/config';
import { EventEmitter } from 'events';
import { JsonRpcProvider } from 'ethers';
import { Agent, Wallet, Network, NetworkType, NetworksConfig, UUID, PlanningAgent } from '@binkai/core';
import { SwapPlugin } from '@binkai/swap-plugin';
import { PancakeSwapProvider } from '@binkai/pancakeswap-provider';
import { UserService } from './user.service';
import { BirdeyeProvider } from '@binkai/birdeye-provider';
import { AlchemyProvider } from '@binkai/alchemy-provider';
import { TokenPlugin } from '@binkai/token-plugin';
import { ImagePlugin } from '@binkai/image-plugin';
import { PostgresDatabaseAdapter } from '@binkai/postgres-adapter';
import { KnowledgePlugin } from '@binkai/knowledge-plugin';
import { BinkProvider } from '@binkai/bink-provider';
import { FourMemeProvider } from '@binkai/four-meme-provider';
import { OkxProvider } from '@binkai/okx-provider';
import { deBridgeProvider } from '@binkai/debridge-provider';
import { BridgePlugin } from '@binkai/bridge-plugin';
import { WalletPlugin } from '@binkai/wallet-plugin';
import { BnbProvider } from '@binkai/rpc-provider';
import { ExampleToolExecutionCallback, ToolName } from '@/shared/tools/tool-execution';
import { TelegramBot } from '@/telegram-bot/telegram-bot';
import { StakingPlugin } from '@binkai/staking-plugin';
import { VenusProvider } from '@binkai/venus-provider';
import { ThenaProvider } from '@binkai/thena-provider';
import { JupiterProvider } from '@binkai/jupiter-provider';
import { Connection } from '@solana/web3.js';

interface NetworkConfig {
  type: NetworkType;
  config: {
    chainId?: number;
    rpcUrl: string;
    name: string;
    nativeCurrency: {
      name: string;
      symbol: string;
      decimals: number;
    };
  };
}

@Injectable()
export class AiService implements OnApplicationBootstrap {
  private readonly openai: OpenAI;
  private readonly networks: NetworksConfig['networks'];
  private readonly birdeyeApi: BirdeyeProvider;
  private readonly alchemyApi: AlchemyProvider;
  private readonly postgresAdapter: PostgresDatabaseAdapter;
  private readonly binkProvider: BinkProvider;
  private readonly bnbProvider: BnbProvider;
  private readonly mapAgent: Record<string, Agent> = {};
  private readonly mapToolExecutionCallback: Record<string, ExampleToolExecutionCallback> = {};

  @Inject(TelegramBot)
  private readonly bot: TelegramBot;

  @Inject('BSC_CONNECTION')
  private readonly bscProvider: JsonRpcProvider;

  @Inject('ETHEREUM_CONNECTION')
  private readonly ethProvider: JsonRpcProvider;

  constructor(
    private readonly configService: ConfigService,
    private readonly userService: UserService,
  ) {
    this.openai = new OpenAI({
      apiKey: this.configService.get<string>('openai.apiKey'),
    });

    this.networks = this.initializeNetworks();
    this.birdeyeApi = this.initializeBirdeyeApi();
    this.alchemyApi = this.initializeAlchemyApi();
    this.postgresAdapter = this.initializePostgresAdapter();
    this.binkProvider = this.initializeBinkProvider();
    this.bnbProvider = this.initializeBnbProvider();
  }

  private initializeNetworks(): NetworksConfig['networks'] {
    return {
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
  }

  private initializeBirdeyeApi(): BirdeyeProvider {
    return new BirdeyeProvider({
      apiKey: this.configService.get<string>('birdeye.birdeyeApiKey'),
    });
  }

  private initializeAlchemyApi(): AlchemyProvider {
    return new AlchemyProvider({
      apiKey: this.configService.get<string>('alchemy.alchemyApiKey'),
    });
  }

  private initializePostgresAdapter(): PostgresDatabaseAdapter {
    return new PostgresDatabaseAdapter({
      connectionString: this.configService.get<string>('postgres_ai.postgresUrl'),
    });
  }

  private initializeBinkProvider(): BinkProvider {
    return new BinkProvider({
      apiKey: this.configService.get<string>('bink.apiKey'),
      baseUrl: this.configService.get<string>('bink.baseUrl'),
      imageApiUrl: this.configService.get<string>('bink.imageApiUrl'),
    });
  }

  private initializeBnbProvider(): BnbProvider {
    return new BnbProvider({
      rpcUrl: process.env.BSC_RPC_URL,
    });
  }

  async onApplicationBootstrap(): Promise<void> { }

  async handleSwap(telegramId: string, input: string): Promise<string> {
    try {
      const message = await this.bot.sendMessage(telegramId, 'Thinking...', {
        parse_mode: 'HTML',
      });

      const keys = await this.userService.getMnemonicByTelegramId(telegramId);
      if (!keys) {
        await this.bot.deleteMessage(telegramId, message.message_id.toString());
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
      if (!agent) {
        agent = await this.initializeAgent(wallet, message.message_id, telegramId);
      } else {
        // Update the message ID for existing agent
        this.mapToolExecutionCallback[telegramId]?.setMessageId(message.message_id);
      }
      const inputResult = await agent.execute({
        input: input,
        threadId: user.current_thread_id as UUID,
      });

      const result = inputResult?.replace(/\*\*(.*?)\*\*/g, '<b>$1</b>') || 'Something went wrong while cooking. Try again in a bit 🛠️✨';

      await this.bot.editMessageText(result, {
        chat_id: telegramId,
        message_id: message.message_id,
        parse_mode: 'HTML',
      });

    } catch (error) {
      console.error('Error in handleSwap:', error);
      return 'Something went wrong while cooking. Try again in a bit 🛠️✨';
    }
  }

  private async initializeAgent(wallet: Wallet, messageId: number, telegramId: string): Promise<Agent> {
    const bscChainId = 56;
    const plugins = await this.initializePlugins(bscChainId);
    const agent = new PlanningAgent(
      {
        model: 'gpt-4o',
        isHumanReview: true,
        temperature: 0,
        systemPrompt: this.getSystemPrompt(),
      },
      wallet,
      this.networks,
    );

    await agent.initialize();
    await this.registerPlugins(agent, plugins);
    await this.setupToolExecutionCallback(agent, telegramId, messageId);

    this.mapAgent[telegramId] = agent;
    return agent;
  }

  private async initializePlugins(bscChainId: number) {
    const pancakeswap = new PancakeSwapProvider(this.bscProvider, bscChainId);
    const okx = new OkxProvider(this.bscProvider, bscChainId);
    const fourMeme = new FourMemeProvider(this.bscProvider, bscChainId);
    const venus = new VenusProvider(this.bscProvider, bscChainId);
    const jupiter = new JupiterProvider(new Connection(process.env.RPC_URL));
    const thena = new ThenaProvider(this.bscProvider, bscChainId);
    const debridge = new deBridgeProvider(this.bscProvider);

    const plugins = {
      swap: new SwapPlugin(),
      token: new TokenPlugin(),
      image: new ImagePlugin(),
      knowledge: new KnowledgePlugin(),
      bridge: new BridgePlugin(),
      wallet: new WalletPlugin(),
      staking: new StakingPlugin(),
    };

    await Promise.all([
      plugins.swap.initialize({
        defaultSlippage: 0.5,
        defaultChain: 'bnb',
        providers: [pancakeswap, fourMeme, okx, thena, jupiter],
        supportedChains: ['bnb', 'ethereum', 'solana'],
      }),
      plugins.token.initialize({
        defaultChain: 'bnb',
        providers: [this.birdeyeApi, fourMeme as any],
        supportedChains: ['solana', 'bnb'],
      }),
      plugins.knowledge.initialize({
        providers: [this.binkProvider],
      }),
      plugins.image.initialize({
        defaultChain: 'bnb',
        providers: [this.binkProvider],
      }),
      plugins.bridge.initialize({
        defaultChain: 'bnb',
        providers: [debridge],
        supportedChains: ['bnb', 'solana'],
      }),
      plugins.wallet.initialize({
        defaultChain: 'bnb',
        providers: [this.bnbProvider, this.birdeyeApi, this.alchemyApi],
        supportedChains: ['bnb'],
      }),
      plugins.staking.initialize({
        defaultSlippage: 0.5,
        defaultChain: 'bnb',
        providers: [venus],
        supportedChains: ['bnb', 'ethereum'],
      }),
    ]);

    return plugins;
  }

  private async registerPlugins(agent: Agent, plugins: any): Promise<void> {
    await Promise.all([
      agent.registerPlugin(plugins.swap),
      agent.registerPlugin(plugins.token),
      agent.registerDatabase(this.postgresAdapter),
      agent.registerPlugin(plugins.knowledge),
      agent.registerPlugin(plugins.bridge),
      agent.registerPlugin(plugins.wallet),
      agent.registerPlugin(plugins.staking),
      agent.registerPlugin(plugins.image),
    ]);
  }

  private async setupToolExecutionCallback(agent: Agent, telegramId: string, messageId: number): Promise<void> {
    let onMessage: { message: string, toolName: string } = { message: '', toolName: '' };
    let onPlanningMessage: { message: string, toolName: string } = { message: '', toolName: '' };
    let planningMessageId: number;
    let currentMessageId = messageId;

    const toolExecutionCallback = new ExampleToolExecutionCallback(
      telegramId,
      this.bot,
      currentMessageId,
      async ({ message, toolName }) => {
        onMessage = { message, toolName };
        if (onMessage.message.length > 0) {
          await this.bot.editMessageText(onMessage.message, {
            chat_id: telegramId,
            message_id: currentMessageId,
            parse_mode: 'HTML',
          });
        }
      },
      async ({ message, toolName }) => {
        onPlanningMessage = { message, toolName };
        if (onPlanningMessage.message.length > 0) {
          if (onPlanningMessage.toolName === ToolName.CREATE_PLAN) {
            try {
              // Delete the thinking message
              await this.bot.deleteMessage(telegramId, currentMessageId.toString());

              // First, send the planning message
              const planningMessage = await this.bot.sendMessage(telegramId, onPlanningMessage.message, {
                parse_mode: 'HTML',
              });
              planningMessageId = planningMessage.message_id;

              // Then, send waiting message
              const waitingMessage = await this.bot.sendMessage(telegramId, "Waiting for execution ...", {
                parse_mode: 'HTML',
              });

              // Update currentMessageId to the waiting message
              currentMessageId = waitingMessage.message_id;

              // Update the callback's messageId
              this.mapToolExecutionCallback[telegramId].setMessageId(currentMessageId);
            } catch (error) {
              console.error('Error handling CREATE_PLAN:', error);
              // If anything fails, try to edit the original message
              await this.bot.editMessageText(onPlanningMessage.message, {
                chat_id: telegramId,
                message_id: currentMessageId,
                parse_mode: 'HTML',
              });
            }
            console.log("🚀 ~ AiService ~ currentMessageId:", currentMessageId)
          } else {
            await this.bot.editMessageText(onPlanningMessage.message, {
              chat_id: telegramId,
              message_id: planningMessageId,
              parse_mode: 'HTML',
            });
          }
        }
      }
    );

    this.mapToolExecutionCallback[telegramId] = toolExecutionCallback;
    agent.registerToolExecutionCallback(toolExecutionCallback as any);
  }

  private getSystemPrompt(): string {
    return `You are a BINK AI assistant. You can help user to query blockchain data .You are able to perform swaps and get token information on multiple chains. If you do not have the token address, you can use the symbol to get the token information before performing a swap.
Your respone format:
 BINK's tone is informative, bold, and subtly mocking, blending wit with a cool edge for the crypto crowd. Think chain-vaping degen energy, but refined—less "honey, sit down" and more "I've got this, you don't."
Fiercely Casual – Slang, laid-back flow, and effortless LFG vibes.
Witty with a Jab – Dry humor, sharp one-liners—more smirk, less roast.
Confident & Cool – Market takes with swagger—just facts, no fluff.
Crew Leader – Speaks degen, leads with "pay attention" energy.
Subtle Shade – Calls out flops with a "nice try" tone, not full-on slander.
BINK isn't here to babysit. It's sharp, fast, and always ahead of the curve—dropping crypto insights with a mocking wink, perfect for X's chaos.    
CRITICAL: 
1. Format your responses in Telegram HTML style. 
2. DO NOT use markdown. 
3. Using HTML tags like <b>bold</b>, <i>italic</i>, <code>code</code>, <pre>preformatted</pre>, and <a href="URL">links</a>. \n\nWhen displaying token information or swap details:\n- Use <b>bold</b> for important values and token names\n- Use <code>code</code> for addresses and technical details\n- Use <i>italic</i> for additional information`;
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
