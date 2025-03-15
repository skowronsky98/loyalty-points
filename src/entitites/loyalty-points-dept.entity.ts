import { Entity, PrimaryKey, Property } from "@mikro-orm/postgresql";
import { type PartiallyRequired } from "../common/types.js";
import { LoyaltyPointsDeptRepository } from "../repos/loyalty-points-dept.repo.js";

@Entity({ tableName: 'loyalty_points_dept', repository: () => LoyaltyPointsDeptRepository })
export class LoyaltyPointsDeptEntity {
  @PrimaryKey({ type: 'uuid' })
  customerId: string;

  @Property({ type: 'integer' })
  points: number;

  constructor(data: PartiallyRequired<LoyaltyPointsDeptEntity, 'customerId' | 'points'>) {
    this.customerId = data.customerId;
    this.points = data.points;
  }
}
