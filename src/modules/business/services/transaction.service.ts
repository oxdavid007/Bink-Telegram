import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { TransactionRepository } from "@/database/repositories";
import { TransactionEntity, TransactionType } from "@/database/entities";

interface CreateTransactionDto {
  type: TransactionType;
  sol_amount: number;
  sol_amount_by_usd: number;
  token_amount: number;
  token_amount_by_usd: number;
  tx_hash: string;
  user_id: string;
  token_address: string;
}

@Injectable()
export class TransactionService {
  constructor(
    @InjectRepository(TransactionRepository)
    private readonly transactionRepository: TransactionRepository
  ) {}

  async createTransaction(
    createTransactionDto: CreateTransactionDto
  ): Promise<TransactionEntity> {
    const transaction = this.transactionRepository.create(createTransactionDto);
    return await this.transactionRepository.save(transaction);
  }

  async findByUserId(userId: string): Promise<TransactionEntity[]> {
    return await this.transactionRepository.findByUserId(userId);
  }

  async findByTxHash(txHash: string): Promise<TransactionEntity | null> {
    return await this.transactionRepository.findByTxHash(txHash);
  }
}
