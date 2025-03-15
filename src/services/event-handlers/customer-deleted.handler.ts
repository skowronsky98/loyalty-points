import { EntityManager } from "@mikro-orm/postgresql";
import { EventName } from "../../constants.js";
import { EventSchema } from "../../endpoints/webhook-events.endpoint.js";
import { EventHandler } from "../event.factory.js";
import { EventsHistoryEntity } from "../../entitites/event-history.entity.js";
import { hashEvent } from "../../common/utils.js";
import { LoyaltyPointsDeptEntity } from "../../entitites/loyalty-points-dept.entity.js";
import { LoyaltyPointsEntity } from "../../entitites/loyalty-points.entity.js";

export class CustomerDeletedHandler implements EventHandler {
  async handle(event: Extract<EventSchema, { EventName: typeof EventName.CUSTOMER_DELETED }>, em: EntityManager): Promise<void> {
    await em.transactional(async (transactionalEm) => {

      const eventHistory = new EventsHistoryEntity({
        eventHash: hashEvent({ eventName: event.EventName, sequence: event.Sequence }),
      });

      transactionalEm.persist(eventHistory);

      await Promise.all([
        transactionalEm.nativeDelete(LoyaltyPointsEntity, {
          customerId: event.Payload.CustomerId,
        }),
        transactionalEm.nativeDelete(LoyaltyPointsDeptEntity, {
          customerId: event.Payload.CustomerId,
        }),
      ]);
    });
  }
}
