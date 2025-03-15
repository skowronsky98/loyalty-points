import Fastify from 'fastify'
import { ENV } from './env/env.js'
import { initORM } from './db.js'
import { RequestContext } from '@mikro-orm/postgresql'
import { registerWebhookEvents } from './endpoints/webhook-events.endpoint.js'
import { registerPointsRoutes } from './endpoints/get-loyalty-points.endpoint.js'
import { registerConsumePoints } from './endpoints/consume-loyalty-points.endpoint.js'
import {
  jsonSchemaTransform,
  serializerCompiler,
  validatorCompiler,
  isResponseSerializationError,
  hasZodFastifySchemaValidationErrors,
  ZodTypeProvider,
} from 'fastify-type-provider-zod';
import fastifySwagger from '@fastify/swagger'
import fastifySwaggerUI from '@fastify/swagger-ui';

export const createApp = async () => {

  const db = await initORM();

  const app = Fastify().withTypeProvider<ZodTypeProvider>();

  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

  app.register(fastifySwagger, {
    openapi: {
      info: {
        title: 'Loyalty Points Service',
        description: 'Sample backend service',
        version: '1.0.0',
      },
      servers: [],
    },
    transform: jsonSchemaTransform,
  });

  app.register(fastifySwaggerUI, {
    routePrefix: '/documentation',
  });


  app.addHook('onRequest', (request, reply, done) => {
    RequestContext.create(db.em, done);
  });

  app.setErrorHandler((error, request, reply) => {

    if (hasZodFastifySchemaValidationErrors(error)) {
      return reply.status(400).send({ error: 'Bad Request', statusCode: 400 });
    }

    if (isResponseSerializationError(error)) {
      return reply.code(500).send({
        error: 'Internal Server Error',
        statusCode: 500,
      })
    }

    app.log.error(error);

    return reply.code(500).send({
      error: 'Internal Server Error',
      statusCode: 500,
    })
  });

  app.addHook('onClose', async () => {
    await db.orm.close();
  });

  app.register(registerPointsRoutes);
  app.register(registerConsumePoints);
  app.register(registerWebhookEvents);

  await app.ready();
  await app.listen({ port: ENV.APP_PORT });

  console.log(`Documentation running at http://localhost:3000/documentation`);

  return app;
}

try {
  await createApp();
} catch (error) {
  console.error(error);
  process.exit(1);
}
