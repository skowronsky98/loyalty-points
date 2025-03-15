import { type ZodType, type TypeOf } from 'zod';

export const parseEnv = <T extends ZodType>(envSchema: T): TypeOf<T> => {
  const parsedEnv = envSchema.safeParse(process.env);

  if (!parsedEnv.success) {
    console.error({
      msg: 'Invalid environment variables',
      info: parsedEnv.error.format(),
    });
    process.exit(1);
  }

  return parsedEnv.data;
};
