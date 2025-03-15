import { LoyaltyPointsEntity } from "../entitites/loyalty-points.entity.js";


export const consumePointsFromManyOrders = (loyaltyPointOrders: LoyaltyPointsEntity[], points: number): number => {

  let remainingPointsToConsume = points;

  for (const loyaltyPointOrder of loyaltyPointOrders) {
    if (remainingPointsToConsume === 0) {
      break;
    }

    if (loyaltyPointOrder.availablePoints >= remainingPointsToConsume) {
      loyaltyPointOrder.availablePoints -= remainingPointsToConsume;
      remainingPointsToConsume = 0;
    } else {
      remainingPointsToConsume -= loyaltyPointOrder.availablePoints;
      loyaltyPointOrder.availablePoints = 0;
    }
  }

  return remainingPointsToConsume;
}
