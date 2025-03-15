import { FastifyInstance } from 'fastify'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import supertest from 'supertest'
import { initORM, Services } from '../../db.js'
import { createApp } from '../../app.js'
import { clearDatabase } from '../../test-utils/test.utils.js'
import { LoyaltyPointsEntity } from '../../entitites/loyalty-points.entity.js'
import { faker } from '@faker-js/faker';
import { addDays } from 'date-fns'
import { EntityManager } from '@mikro-orm/postgresql'
import { randomUUID } from 'node:crypto'

describe('consume-loyalty-points', () => {
  let app: FastifyInstance
  let db: Services
  let em: EntityManager

  beforeAll(async () => {
    [app, db] = await Promise.all([createApp(), initORM()])
    em = db.orm.em.fork();
    await app.ready()
  })

  beforeEach(async () => {
    await clearDatabase(db.orm)
  });

  afterAll(async () => {
    app.close()
  })

  it('should return 404 when not customer does not exist', async () => {
    await supertest(app.server)
      .post(`/${randomUUID()}/consume`)
      .send({ points: 20 })
      .expect(404)
      .expect('Content-Type', 'application/json; charset=utf-8')
  })

  it('should return 400 when not customer has not encough points', async () => {
    const loyaltyPoints = new LoyaltyPointsEntity({
      customerId: randomUUID(),
      availablePoints: 10,
      pointsFromOrder: 10,
      orderId: faker.string.uuid(),
      expiresAt: addDays(new Date(), 1),
    });

    await em.persistAndFlush(loyaltyPoints);

    await supertest(app.server)
      .post(`/${loyaltyPoints.customerId}/consume`)
      .send({ points: 20 })
      .expect(400)
      .expect('Content-Type', 'application/json; charset=utf-8')
  })

  it('should successfully consume points when customer has sufficient balance', async () => {
    const loyaltyPoints = new LoyaltyPointsEntity({
      customerId: faker.string.uuid(),
      availablePoints: 10,
      pointsFromOrder: 10,
      orderId: faker.string.uuid(),
      expiresAt: addDays(new Date(), 1),
    });

    await em.persistAndFlush(loyaltyPoints);

    const response = await supertest(app.server)
      .post(`/${loyaltyPoints.customerId}/consume`)
      .send({ points: 10 })
      .expect(200)
      .expect('Content-Type', 'application/json; charset=utf-8')

    expect(response.body).toEqual({ pointsAvailable: 0 })
  })

  it('should successfully consume points from oldest loyalty points orders', async () => {
    const customerId = randomUUID();
    const loyaltyPoints = [new LoyaltyPointsEntity({
      customerId,
      availablePoints: 10,
      pointsFromOrder: 10,
      orderId: faker.string.uuid(),
      expiresAt: addDays(new Date(), 1),
    }), new LoyaltyPointsEntity({
      customerId,
      availablePoints: 10,
      pointsFromOrder: 10,
      orderId: faker.string.uuid(),
      expiresAt: addDays(new Date(), 5),
    })];

    await em.persistAndFlush(loyaltyPoints);

    const response = await supertest(app.server)
      .post(`/${customerId}/consume`)
      .send({ points: 15 })
      .expect(200)
      .expect('Content-Type', 'application/json; charset=utf-8')

    expect(response.body).toEqual({ pointsAvailable: 5 })

    const updatedLoyaltyPoints = await em.fork().find(LoyaltyPointsEntity, { customerId }, { orderBy: { expiresAt: 'asc' } });

    expect(updatedLoyaltyPoints[0].availablePoints).toEqual(0)
    expect(updatedLoyaltyPoints[1].availablePoints).toEqual(5)
  })

})
