import { type PartiallyRequired } from "../common/types.js";
import { setDefault } from "../common/utils.js";
import { randomUUID } from "node:crypto";
import { LoyaltyPointsRepository } from "../repos/loyalty-points.repo.js";
import { Entity, PrimaryKey, Property } from "@mikro-orm/postgresql";

@Entity({ tableName: 'loyalty_points', repository: () => LoyaltyPointsRepository })
export class LoyaltyPointsEntity {
  @PrimaryKey({ type: 'uuid', defaultRaw: 'gen_random_uuid()' })
  id: string;

  @Property({ type: 'timestamptz', length: 3, defaultRaw: 'now()' })
  createdAt: Date;

  @Property({
    type: 'timestamptz',
    length: 3,
  })
  expiresAt: Date;

  @Property({ type: 'uuid', index: true })
  customerId: string;

  @Property({ type: 'uuid' })
  orderId: string;

  @Property({ type: 'integer' })
  pointsFromOrder: number;

  @Property({ type: 'integer' })
  availablePoints: number;

  @Property({ type: 'boolean', default: false })
  isCancelled: boolean;

  constructor(data: PartiallyRequired<LoyaltyPointsEntity, 'customerId' | 'orderId' | 'expiresAt' | 'pointsFromOrder' | 'availablePoints'>) {
    this.id = setDefault(data.id, randomUUID());
    this.createdAt = setDefault(data.createdAt, new Date());
    this.expiresAt = data.expiresAt;
    this.customerId = data.customerId;
    this.orderId = data.orderId;
    this.pointsFromOrder = data.pointsFromOrder;
    this.availablePoints = data.availablePoints;
    this.isCancelled = setDefault(data.isCancelled, false);
  }
}
