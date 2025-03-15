import { EntityManager, LockMode } from "@mikro-orm/postgresql";
import { EventName } from "../../constants.js";
import { EventSchema } from "../../endpoints/webhook-events.endpoint.js";
import { EventHandler } from "../event.factory.js";
import { EventsHistoryEntity } from "../../entitites/event-history.entity.js";
import { hashEvent } from "../../common/utils.js";
import { LoyaltyPointsDeptEntity } from "../../entitites/loyalty-points-dept.entity.js";
import { LoyaltyPointsEntity } from "../../entitites/loyalty-points.entity.js";
import { addMonths } from "date-fns";

export class OrderPlacedHandler implements EventHandler {

  private calculateLoyaltyPointsFromOrderAmount(orderAmount: number): number {
    if (orderAmount < 0) {
      throw new Error('Order amount cannot be negative');
    }
    return Math.floor(orderAmount / 50);
  }

  private calculateAvailablePointsWithDept(input: { currentDept: number, gainedPoints: number }): { dept: number, availablePoints: number } {
    const { currentDept, gainedPoints } = input;

    if (currentDept >= gainedPoints) {
      return { dept: currentDept - gainedPoints, availablePoints: 0 };
    }

    return { dept: 0, availablePoints: gainedPoints - currentDept };
  }

  async handle(event: Extract<EventSchema, { EventName: typeof EventName.ORDER_PLACED }>, em: EntityManager): Promise<void> {
    await em.transactional(async (transactionalEm) => {

      const eventHistory = new EventsHistoryEntity({
        eventHash: hashEvent({ eventName: event.EventName, sequence: event.Sequence }),
      });

      transactionalEm.persist(eventHistory);

      const gainedPoints = this.calculateLoyaltyPointsFromOrderAmount(event.Payload.TotalOrderAmount);
      const expiresAt = addMonths(event.EventTime, 6);

      let availablePoints = gainedPoints;

      const customerDept = await transactionalEm.findOne(LoyaltyPointsDeptEntity, {
        customerId: event.Payload.CustomerId,
      }, {
        lockMode: LockMode.PESSIMISTIC_WRITE,
      });

      if (customerDept) {
        const calculatedPoints = this.calculateAvailablePointsWithDept({
          currentDept: customerDept.points,
          gainedPoints,
        });
        availablePoints = calculatedPoints.availablePoints;
        customerDept.points = calculatedPoints.dept;
      }

      transactionalEm.persist(new LoyaltyPointsEntity({
        customerId: event.Payload.CustomerId,
        orderId: event.Payload.OrderId,
        pointsFromOrder: gainedPoints,
        availablePoints,
        expiresAt,
      }));
    });
  }
}
