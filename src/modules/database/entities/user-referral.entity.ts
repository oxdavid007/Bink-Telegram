import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToOne,
  Unique,
} from "typeorm";
import { BaseEntity } from "./base.entity";
import { UserEntity } from "./user.entity";

@Entity("user_referrals")
@Unique("uni_user_referrals", ["referrer_user_id", "referee_user_id"])
export class UserReferralEntity extends BaseEntity {
  @Column()
  referrer_user_id: string;

  @ManyToOne(() => UserEntity, (entity) => entity.user_referrals)
  @JoinColumn({ name: "referrer_user_id" })
  @Index()
  referrer_user: UserEntity;

  @Column()
  referee_user_id: string;

  @OneToOne(() => UserEntity, (entity) => entity.user_referee)
  @JoinColumn({ name: "referee_user_id" })
  @Index()
  referee_user: UserEntity;

  @Column({ type: "float", default: 0 })
  total_vol: number;
}
