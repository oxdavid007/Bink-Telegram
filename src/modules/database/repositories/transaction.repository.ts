import { DataSource, Repository } from "typeorm";
import { InjectDataSource } from "@nestjs/typeorm";
import { TransactionEntity } from "../entities/transaction.entity";

export class TransactionRepository extends Repository<TransactionEntity> {
  constructor(@InjectDataSource() private dataSource: DataSource) {
    super(TransactionEntity, dataSource.createEntityManager());
  }

  async findByUserId(userId: string): Promise<TransactionEntity[]> {
    return this.createQueryBuilder("transaction")
      .where("transaction.user_id = :userId", { userId })
      .orderBy("transaction.created_at", "DESC")
      .getMany();
  }

  async findByTxHash(txHash: string): Promise<TransactionEntity> {
    return this.createQueryBuilder("transaction")
      .where("transaction.tx_hash = :txHash", { txHash })
      .getOne();
  }
}
