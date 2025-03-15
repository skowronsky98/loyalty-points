import { EntityManager, QueryOrder } from "@mikro-orm/postgresql";
import { EventName } from "../../constants.js";
import { EventSchema } from "../../endpoints/webhook-events.endpoint.js";
import { EventHandler } from "../event.factory.js";
import { EventsHistoryEntity } from "../../entitites/event-history.entity.js";
import { hashEvent } from "../../common/utils.js";
import { LoyaltyPointsDeptEntity } from "../../entitites/loyalty-points-dept.entity.js";
import { LoyaltyPointsEntity } from "../../entitites/loyalty-points.entity.js";
import { consumePointsFromManyOrders } from "../loyalty-points.service.js";

export class OrderCanceledHandler implements EventHandler {
  async handle(event: Extract<EventSchema, { EventName: typeof EventName.ORDER_RETURNED }>, em: EntityManager): Promise<void> {
    await em.transactional(async (transactionalEm) => {

      const eventHistory = new EventsHistoryEntity({
        eventHash: hashEvent({ eventName: event.EventName, sequence: event.Sequence }),
      });

      transactionalEm.persist(eventHistory);

      const canceledOrderPoints = await transactionalEm.findOne(LoyaltyPointsEntity, {
        orderId: event.Payload.OrderId,
      })

      if (!canceledOrderPoints) {
        return;
      }

      canceledOrderPoints.isCancelled = true;

      const loyaltyPointOrders = await transactionalEm.find(LoyaltyPointsEntity,
        {
          id: { $ne: canceledOrderPoints.id },
          customerId: canceledOrderPoints.customerId,
          expiresAt: { $gte: event.EventTime },
          isCancelled: false
        },
        {
          orderBy: { expiresAt: QueryOrder.ASC, }
        }
      );

      let pointsToDeduct = consumePointsFromManyOrders(
        loyaltyPointOrders,
        canceledOrderPoints.pointsFromOrder - canceledOrderPoints.availablePoints
      )

      if (pointsToDeduct > 0) {

        let customerDept = await transactionalEm.findOne(LoyaltyPointsDeptEntity, {
          customerId: canceledOrderPoints.customerId,
        });

        if (!customerDept) {
          customerDept = new LoyaltyPointsDeptEntity({
            customerId: canceledOrderPoints.customerId,
            points: pointsToDeduct,
          });
          transactionalEm.persist(customerDept);
        } else {
          customerDept.points += pointsToDeduct;
        }
      }
    });
  }
}
