import { EntityRepository, LockMode, QueryOrder } from "@mikro-orm/postgresql";
import { LoyaltyPointsEntity } from "../entitites/loyalty-points.entity.js";

export class LoyaltyPointsRepository extends EntityRepository<LoyaltyPointsEntity> {
  async findAvailablePointsByCustomerId(customerId: string, withLock = false): Promise<LoyaltyPointsEntity[]> {
    const currentDateTime = new Date();
    return await this.em.find(LoyaltyPointsEntity,
      {
        customerId,
        expiresAt: { $gte: currentDateTime },
        isCancelled: false
      },
      {
        orderBy: { expiresAt: QueryOrder.ASC, },
        lockMode: withLock ? LockMode.PESSIMISTIC_WRITE : undefined,
      }
    );
  }
}
