import { DataSource, Repository } from "typeorm";
import { InjectDataSource } from "@nestjs/typeorm";
import { UserReferralEntity } from "../entities/user-referral.entity";

export class UserReferralRepository extends Repository<UserReferralEntity> {
  constructor(@InjectDataSource() private dataSource: DataSource) {
    super(UserReferralEntity, dataSource.createEntityManager());
  }

  async findByReferrerId(referrerId: string): Promise<UserReferralEntity[]> {
    return this.createQueryBuilder("user_referral")
      .where("user_referral.referrer_user_id = :referrerId", { referrerId })
      .leftJoinAndSelect("user_referral.referee_user", "referee_user")
      .orderBy("user_referral.created_at", "DESC")
      .getMany();
  }

  async findByRefereeId(refereeId: string): Promise<UserReferralEntity> {
    return this.createQueryBuilder("user_referral")
      .where("user_referral.referee_user_id = :refereeId", { refereeId })
      .leftJoinAndSelect("user_referral.referrer_user", "referrer_user")
      .getOne();
  }

  async statsReferral(referrerId: string) {
    const db = this.createQueryBuilder("user_referral");
    db.select("COUNT(user_referral.id) as total_referrals")
      .addSelect("SUM(user_referral.total_vol) as total_volume")
      .where("user_referral.referrer_user_id = :referrerId", { referrerId });

    const result = await db.getRawOne();
    return result;
  }
}
