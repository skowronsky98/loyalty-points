import { EntityRepository } from "@mikro-orm/postgresql";
import { LoyaltyPointsDeptEntity } from "../entitites/loyalty-points-dept.entity.js";

export class LoyaltyPointsDeptRepository extends EntityRepository<LoyaltyPointsDeptEntity> {
  async getLoyaltyPointsDeptForCustomerId(customerId: string): Promise<number> {
    const loyaltyPointsDept = await this.em.findOne(LoyaltyPointsDeptEntity,
      {
        customerId,
      }
    );

    return loyaltyPointsDept?.points ?? 0;
  }
}
