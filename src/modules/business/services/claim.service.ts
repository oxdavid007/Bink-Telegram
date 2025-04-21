import { Inject, Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Cron } from '@nestjs/schedule';
import { TransactionRepository } from "@/database/repositories";
import { TransactionEntity, TransactionStatus, TransactionType } from "@/database/entities";
import { OnchainService } from "./onchain.service";
import { TransactionService } from "./transaction.service";
import { UserService } from "./user.service";
import { ListaProvider } from "@binkai/lista-provider";
import { EVM_NATIVE_TOKEN_ADDRESS, NetworkName, Network, Wallet } from "@binkai/core";
import { ethers, JsonRpcProvider, Contract } from "ethers";
import { ListaPoolABI } from "../abis/Lista";



const CONSTANTS = {
    DEFAULT_GAS_LIMIT: '350000',
    APPROVE_GAS_LIMIT: '50000',
    QUOTE_EXPIRY: 5 * 60 * 1000, // 5 minutes in milliseconds
    BNB_ADDRESS: EVM_NATIVE_TOKEN_ADDRESS,
    SLISBNB_ADDRESS: '0xB0b84D294e0C75A6abe60171b70edEb2EFd14A1B',
    LISTA_CONTRACT_ADDRESS: '0x1adB950d8bB3dA4bE104211D5AB038628e477fE6',
} as const;
@Injectable()
export class ClaimService {
    private readonly logger = new Logger(ClaimService.name);
    private readonly BATCH_SIZE = 10; // Process 10 users at a time
    private isRunning = false;
    private listaProvider = new ListaProvider(this.bscProvider);
    private factory: any;

    constructor(
        @InjectRepository(TransactionRepository)
        private readonly transactionRepository: TransactionRepository,

        @Inject(UserService)
        private readonly userService: UserService,

        private readonly onchainService: OnchainService,
        private readonly transactionService: TransactionService,
        @Inject('BSC_CONNECTION') private bscProvider: JsonRpcProvider,

    ) {
        this.factory = new Contract(CONSTANTS.LISTA_CONTRACT_ADDRESS, ListaPoolABI, this.bscProvider);
    }


    async getClaimsByUserId(userId: string): Promise<TransactionEntity[]> {
        const user = await this.userService.getOrCreateUser({
            telegram_id: userId,
        });
        return this.transactionRepository.find({
            where: { user_id: user.id, type: TransactionType.CLAIM },
            order: { created_at: 'DESC' },
        });
    }

    async getAllClaims(): Promise<TransactionEntity[]> {
        return this.transactionRepository.find({
            where: { type: TransactionType.CLAIM },
            order: { created_at: 'DESC' },
        });
    }

    async saveClaimTransaction(userId: string, amount: string, tokenSymbol: string, network: string, provider: string, txHash: string, claimTime: number): Promise<TransactionEntity> {
        const user = await this.userService.getOrCreateUser({
            telegram_id: userId,
        });
        console.log(user);
        return this.transactionRepository.saveClaimTransaction(user.id, amount, tokenSymbol, network, provider, txHash, claimTime);
    }


    async getAllStakingBalances(walletAddress: string) {
        const balances = await this.listaProvider.getAllStakingBalances(walletAddress);
        console.log(balances);
    }

    async getAllClaimableBalances(
        walletAddress: string,
    ) {
        try {
            const claimableBalances = await this.factory.getUserWithdrawalRequests(walletAddress);

            // Convert the result to an array of objects with natural numbers
            const formattedBalances = claimableBalances.map((item: any) => {
                //uuid
                const uuid = item[0]?.toString();

                const amount = ethers.formatEther(item[1]);

                // Convert timestamp to days (seconds since epoch to days since request)
                const currentTimeSeconds = Math.floor(Date.now() / 1000);

                // Convert currentTimeSeconds to normal date
                const currentDate = new Date(currentTimeSeconds * 1000);

                // Set estimated time to current date + 8 days
                const estimatedDate = new Date(currentDate);
                estimatedDate.setDate(currentDate.getDate() + 8);

                return {
                    uuid: uuid,
                    claimableAmount: amount,
                    estimatedTime: estimatedDate,
                };
            });

            return {
                address: walletAddress,
                tokens: formattedBalances,
            };
        } catch (error) {
            console.error('Error getting claimable balances:', error);
            throw new Error(
                `Failed to get claimable balances: ${error instanceof Error ? error.message : 'Unknown error'}`,
            );
        }
    }

    async buildClaimTransaction(uuid: string) {
        try {
          const uuidBigInt = BigInt(uuid);
          const txData = this.factory.interface.encodeFunctionData('claimWithdraw', [uuidBigInt]);
    
          return {
            to: CONSTANTS.LISTA_CONTRACT_ADDRESS,
            data: txData,
            value: '0',
            network: NetworkName.BNB,
            spender: CONSTANTS.LISTA_CONTRACT_ADDRESS,
          };
        } catch (error) {
          console.error('Error building claim transaction:', error);
          throw new Error(
            `Failed to build claim transaction: ${error instanceof Error ? error.message : 'Unknown error'}`,
          );
        }
      }
    @Cron('*/5 * * * *') // Run every 5 minutes
    async handleClaim() {
        try {
            // Check if another cronjob is running
            if (this.isRunning) {
                console.log('Another wallet creation cronjob is running, skipping...');
                return;
            }
            const claims = await this.getAllClaims()
            console.log(claims);
            const timestampNow = Math.floor(Date.now() / 1000);
            for (const claim of claims) {
                if (timestampNow - claim.claim_time > 7 * 24 * 60 * 60 && claim.status == TransactionStatus.INIT) { 

                    const user = await this.userService.getUserById(claim.user_id);
                    console.log(user);
                    const walletEvmAddress = user?.wallet_evm_address;
                    console.log(walletEvmAddress);
                    const keys = await this.userService.getMnemonicByTelegramId(user.telegram_id);  
                    if (!keys) continue;
                    const networks = {
                        bnb: {
                            type: 'evm' as const,
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
                    };
                    const network = new Network({ networks });
                    const wallet = new Wallet(
                        {
                            seedPhrase: keys,
                            index: 0,
                        },
                        network
                    );
                    if (walletEvmAddress) {
                        const claimableBalances = await this.getAllClaimableBalances(walletEvmAddress);
                        console.log(claimableBalances);

                        for (const token of claimableBalances.tokens) {
                            const tx = await this.buildClaimTransaction(token.uuid);
                            console.log(tx);

                            const result = await wallet.signAndSendTransaction(NetworkName.BNB, {
                                to: tx.to,
                                data: tx.data,
                                value: BigInt(tx.value),
                            });

                            const finalReceipt = await result.wait();
                            console.log(finalReceipt);

                            await this.transactionRepository.update(
                                { id: claim.id},
                                { status: TransactionStatus.COMPLETED }
                            );
                            
               
                        }
                    }

                }
            }
            this.isRunning = false;
        } catch (error) {
            console.error('Error in wallet creation cronjob:', error);
            this.isRunning = false;
        }
    }
} 