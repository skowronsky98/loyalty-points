import { initORM } from "../db.js";
import { z } from "zod";
import { FastifyTypedInstance } from "../common/types.js";

export const customerPointsParamsSchema = z.object({
  customerId: z.string().uuid(),
});

export async function registerPointsRoutes(app: FastifyTypedInstance) {
  const em = await initORM();

  app.get("/:customerId/points", {
    schema: {
      tags: ["Loyalty Points"],
      description: "Get loyalty points",
      params: customerPointsParamsSchema,
      response: {
        200: z.object({
          pointsAvailable: z.number(),
        }),
      },
    },
  }, async (request) => {

    const { customerId } = request.params;

    const [loyaltyPointOrders, customerDept] = await Promise.all([
      em.loyaltyPointsRepo.findAvailablePointsByCustomerId(customerId),
      em.loyaltyPointsDeptRepo.getLoyaltyPointsDeptForCustomerId(customerId)
    ]);

    const pointsFromOrders = loyaltyPointOrders.reduce((acc, order) => acc + order.availablePoints, 0);

    return { pointsAvailable: pointsFromOrders - customerDept };
  });
}
