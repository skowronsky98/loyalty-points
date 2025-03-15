import { initORM } from "../db.js";
import { z } from "zod";
import { catchWebhookEventsDbErrors, EntityName, EventName } from "../constants.js";
import { EventHandlerFactory } from "../services/event.factory.js";
import { FastifyTypedInstance } from "../common/types.js";

const baseEventSchema = z.object({
  EventTime: z.string(),
  Sequence: z.number().int().positive(),
});

const customerPayloadSchema = z.object({
  CustomerId: z.string().uuid(),
});

const baseOrderPayloadSchema = z.object({
  OrderId: z.string().uuid(),
});

const orderPayloadSchema = z.object({
  OrderId: z.string().uuid(),
  CustomerId: z.string().uuid(),
  TotalOrderAmount: z.number().int().positive(),
});

const customerCreatedEventSchema = baseEventSchema.extend({
  EventName: z.literal(EventName.CUSTOMER_CREATED),
  EntityName: z.literal(EntityName.CUSTOMER),
  Payload: customerPayloadSchema,
});

const customerDeletedEventSchema = baseEventSchema.extend({
  EventName: z.literal(EventName.CUSTOMER_DELETED),
  EntityName: z.literal(EntityName.CUSTOMER),
  Payload: customerPayloadSchema,
});

const orderPlacedEventSchema = baseEventSchema.extend({
  EventName: z.literal(EventName.ORDER_PLACED),
  EntityName: z.literal(EntityName.ORDER),
  Payload: orderPayloadSchema,
});

const orderCanceledEventSchema = baseEventSchema.extend({
  EventName: z.literal(EventName.ORDER_CANCELED),
  EntityName: z.literal(EntityName.ORDER),
  Payload: baseOrderPayloadSchema,
});

const orderReturnedEventSchema = baseEventSchema.extend({
  EventName: z.literal(EventName.ORDER_RETURNED),
  EntityName: z.literal(EntityName.ORDER),
  Payload: baseOrderPayloadSchema,
});

const eventSchema = z.discriminatedUnion('EventName', [
  customerCreatedEventSchema,
  customerDeletedEventSchema,
  orderPlacedEventSchema,
  orderCanceledEventSchema,
  orderReturnedEventSchema
]);

export type EventSchema = z.infer<typeof eventSchema>;

export async function registerWebhookEvents(app: FastifyTypedInstance) {
  const db = await initORM();

  app.post("/webhook", {
    schema: {
      tags: ["Webhook"],
      description: "Receive events",
      body: eventSchema,
      response: {
        200: z.object({
          message: z.string(),
        }),
      },
    },
  }, async (request, response) => {

    const event = request.body;

    if (event.EventName === EventName.CUSTOMER_CREATED) {
      return response.status(200).send({ message: "Event received" });
    }

    const eventHandler = EventHandlerFactory.create(event.EventName);

    await eventHandler.handle(event, db.em).catch(catchWebhookEventsDbErrors);

    return response.status(200).send({ message: "Event received" });
  });
}
