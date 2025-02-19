import { Column, Entity, ManyToOne, JoinColumn, Index } from "typeorm";
import { BaseEntity } from "./base.entity";
import { UserEntity } from "./user.entity";

export enum TransactionType {
  BUY = "buy",
  SELL = "sell",
}

@Entity("transactions")
export class TransactionEntity extends BaseEntity {
  @Column({
    type: "enum",
    enum: TransactionType,
  })
  @Index()
  type: TransactionType;

  @Column("decimal", { precision: 18, scale: 9 })
  sol_amount: number;

  @Column("decimal", { precision: 10, scale: 2 })
  sol_amount_by_usd: number;

  @Column("decimal", { precision: 18, scale: 9 })
  token_amount: number;

  @Column("decimal", { precision: 10, scale: 2 })
  token_amount_by_usd: number;

  @Column()
  tx_hash: string;

  @Column({ nullable: true })
  @Index()
  token_address: string;

  @Column()
  @Index()
  user_id: string;

  @ManyToOne(() => UserEntity)
  @JoinColumn({ name: "user_id" })
  user: UserEntity;
}
