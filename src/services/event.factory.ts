import { EntityManager } from "@mikro-orm/postgresql";
import { EventName } from "../constants.js";
import { EventSchema } from "../endpoints/webhook-events.endpoint.js";
import { CustomerDeletedHandler } from "./event-handlers/customer-deleted.handler.js";
import { OrderCanceledHandler } from "./event-handlers/order-canceled.handler.js";
import { OrderPlacedHandler } from "./event-handlers/order-placed.handler.js";

export interface EventHandler {
  handle(event: EventSchema, em: EntityManager): Promise<void>;
}

export class EventHandlerFactory {
  private constructor() { }

  private static mapEventNameToHandler: Record<Exclude<EventName, EventName.CUSTOMER_CREATED>, EventHandler> = {
    [EventName.CUSTOMER_DELETED]: new CustomerDeletedHandler(),
    [EventName.ORDER_PLACED]: new OrderPlacedHandler(),
    [EventName.ORDER_CANCELED]: new OrderCanceledHandler(),
    [EventName.ORDER_RETURNED]: new OrderCanceledHandler(),
  };

  static create(eventName: Exclude<EventName, EventName.CUSTOMER_CREATED>): EventHandler {
    return this.mapEventNameToHandler[eventName];
  }
}
