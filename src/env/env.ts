import { z } from "zod";
import { parseEnv } from "./parse-env.js";

const envSchema = z.object({
  APP_PORT: z.coerce.number().int(),

  POSTGRESQL_HOST: z.string(),
  POSTGRESQL_PORT: z.coerce.number().int(),
  POSTGRESQL_USERNAME: z.string(),
  POSTGRESQL_PASSWORD: z.string(),
  POSTGRESQL_DB_NAME: z.string(),
});

export const ENV = parseEnv(envSchema);
