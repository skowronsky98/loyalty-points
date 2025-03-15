import { defineConfig } from "@mikro-orm/postgresql";
import { ENV } from "./env/env.js";
import { LoyaltyPointsEntity } from "./entitites/loyalty-points.entity.js";
import { LoyaltyPointsDeptEntity } from "./entitites/loyalty-points-dept.entity.js";
import { EventsHistoryEntity } from "./entitites/event-history.entity.js";

export default defineConfig({
  host: ENV.POSTGRESQL_HOST,
  port: ENV.POSTGRESQL_PORT,
  user: ENV.POSTGRESQL_USERNAME,
  password: ENV.POSTGRESQL_PASSWORD,
  dbName: ENV.POSTGRESQL_DB_NAME,
  entities: [LoyaltyPointsEntity, LoyaltyPointsDeptEntity, EventsHistoryEntity],
  discovery: { disableDynamicFileAccess: true },
  debug: false,
});
