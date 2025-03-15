import { initORM } from "../db.js";
import { customerPointsParamsSchema } from "./get-loyalty-points.endpoint.js";
import { z } from "zod";
import { FastifyTypedInstance } from "../common/types.js";
import { consumePointsFromManyOrders } from "../services/loyalty-points.service.js";

const consumeSchema = z.object({
  points: z.number().int().positive(),
});

export async function registerConsumePoints(app: FastifyTypedInstance) {
  const db = await initORM();

  app.post("/:customerId/consume", {
    schema: {
      tags: ["Loyalty Points"],
      description: "Consume loyalty points",
      params: customerPointsParamsSchema,
      body: consumeSchema,
      response: {
        200: z.object({
          pointsAvailable: z.number().int(),
        }),
        400: z.object({
          message: z.string(),
        }),
        404: z.object({
          message: z.string(),
        }),
      },
    },
  }, async (request, response) => {

    const { customerId } = request.params;
    const { points } = request.body;

    const em = db.em.fork();

    const pointsAvailable = await em.transactional(async (transactionalEm) => {

      const loyaltyPointOrders = await db.loyaltyPointsRepo.findAvailablePointsByCustomerId(customerId, true);

      if (loyaltyPointOrders.length === 0) {
        return response.status(404).send({ message: "Customer not found" });
      }

      const availablePoints = loyaltyPointOrders.reduce((acc, order) => acc + order.availablePoints, 0);

      if (availablePoints < points) {
        return response.status(400).send({ message: "Not enough points" });
      }

      consumePointsFromManyOrders(loyaltyPointOrders, points);

      await transactionalEm.flush();

      return availablePoints - points
    });

    return response.status(200).send({ pointsAvailable });
  });
}
