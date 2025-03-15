import { FastifyInstance } from 'fastify'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import supertest from 'supertest'
import { initORM, Services } from '../../db.js'
import { createApp } from '../../app.js'
import { clearDatabase } from '../../test-utils/test.utils.js'
import { LoyaltyPointsEntity } from '../../entitites/loyalty-points.entity.js'
import { faker } from '@faker-js/faker';
import { addDays, subDays } from 'date-fns'
import { EntityManager } from '@mikro-orm/postgresql'
import { LoyaltyPointsDeptEntity } from '../../entitites/loyalty-points-dept.entity.js'

describe('get-loyalty-points', () => {
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

  it('should not return expired loyalty points', async () => {
    const loyaltyPoints = new LoyaltyPointsEntity({
      customerId: faker.string.uuid(),
      availablePoints: 10,
      pointsFromOrder: 10,
      orderId: faker.string.uuid(),
      expiresAt: subDays(new Date(), 1),
    });

    await em.persistAndFlush(loyaltyPoints);

    const response = await supertest(app.server)
      .get(`/${loyaltyPoints.customerId}/points`)
      .expect(200)
      .expect('Content-Type', 'application/json; charset=utf-8')

    expect(response.body).toEqual({ pointsAvailable: 0 })
  })

  it('should not return loyalty points from returned orders', async () => {
    const loyaltyPoints = new LoyaltyPointsEntity({
      customerId: faker.string.uuid(),
      availablePoints: 10,
      pointsFromOrder: 10,
      orderId: faker.string.uuid(),
      expiresAt: subDays(new Date(), 1),
      isCancelled: true,
    });

    await em.persistAndFlush(loyaltyPoints);

    const response = await supertest(app.server)
      .get(`/${loyaltyPoints.customerId}/points`)
      .expect(200)
      .expect('Content-Type', 'application/json; charset=utf-8')

    expect(response.body).toEqual({ pointsAvailable: 0 })
  })

  it('should return loyalty points', async () => {
    const loyaltyPoints = new LoyaltyPointsEntity({
      customerId: faker.string.uuid(),
      availablePoints: 10,
      pointsFromOrder: 10,
      orderId: faker.string.uuid(),
      expiresAt: addDays(new Date(), 1),
    });

    await em.persistAndFlush(loyaltyPoints);

    const response = await supertest(app.server)
      .get(`/${loyaltyPoints.customerId}/points`)
      .expect(200)
      .expect('Content-Type', 'application/json; charset=utf-8')

    expect(response.body).toEqual({ pointsAvailable: 10 })
  })

  it('should return loyalty points sum', async () => {
    const customerId = faker.string.uuid();
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
      expiresAt: addDays(new Date(), 1),
    })];

    await em.persistAndFlush(loyaltyPoints);

    const response = await supertest(app.server)
      .get(`/${customerId}/points`)
      .expect(200)
      .expect('Content-Type', 'application/json; charset=utf-8')

    expect(response.body).toEqual({ pointsAvailable: 20 })
  })

  it('should return negative amount of loyalty points when customer is in dept', async () => {
    const customerId = faker.string.uuid();
    const loyaltyPointsDept = new LoyaltyPointsDeptEntity({
      customerId,
      points: 10,
    });

    await em.persistAndFlush(loyaltyPointsDept);

    const response = await supertest(app.server)
      .get(`/${customerId}/points`)
      .expect(200)
      .expect('Content-Type', 'application/json; charset=utf-8')

    expect(response.body).toEqual({ pointsAvailable: -10 })
  })
})
