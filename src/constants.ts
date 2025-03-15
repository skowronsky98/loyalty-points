import { UniqueConstraintViolationException } from "@mikro-orm/postgresql";

export enum EventName {
  CUSTOMER_CREATED = "CustomerCreated",
  CUSTOMER_DELETED = "CustomerDeleted",
  ORDER_CANCELED = "OrderCanceled",
  ORDER_PLACED = "OrderPlaced",
  ORDER_RETURNED = "OrderReturned",
}

export enum EntityName {
  CUSTOMER = "Customer",
  ORDER = "Order",
}

export const catchWebhookEventsDbErrors = (err: unknown) => {
  if (
    err instanceof UniqueConstraintViolationException &&
    err.message.includes('events_history_event_hash_unique')
  ) {
    return;
  }
  throw err;
};
