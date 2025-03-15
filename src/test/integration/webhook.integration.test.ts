import { FastifyInstance } from 'fastify'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import supertest from 'supertest'
import { initORM, Services } from '../../db.js'
import { createApp } from '../../app.js'
import { clearDatabase } from '../../test-utils/test.utils.js'
import { EntityManager } from '@mikro-orm/postgresql'
import { LoyaltyPointsEntity } from '../../entitites/loyalty-points.entity.js'
import { randomUUID } from 'node:crypto'
import { addDays } from 'date-fns'
import { hashEvent } from '../../common/utils.js'
import { EventsHistoryEntity } from '../../entitites/event-history.entity.js'
import { EventName } from '../../constants.js'
import { LoyaltyPointsDeptEntity } from '../../entitites/loyalty-points-dept.entity.js'

describe('webhook-events', () => {
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

  it('should handle customer created event', async () => {
    await supertest(app.server)
      .post(`/webhook`)
      .send({
        "EventTime": "2023-11-13T21:03:10Z",
        "EventName": "CustomerCreated",
        "EntityName": "Customer",
        "Sequence": 1,
        "Payload": {
          "CustomerId": "814e496d-c6d1-49d5-b30b-359b4f83fa48"
        }
      })
      .expect(200)
      .expect('Content-Type', 'application/json; charset=utf-8')

  })

  it('should handle order placed event', async () => {
    const orderId = randomUUID()

    await supertest(app.server)
      .post(`/webhook`)
      .send({
        "EventTime": "2023-11-16T12:24:45+01:00",
        "EventName": "OrderPlaced",
        "EntityName": "Order",
        "Sequence": 10,
        "Payload": {
          "OrderId": orderId,
          "CustomerId": "814e496d-c6d1-49d5-b30b-359b4f83fa48",
          "TotalOrderAmount": 50
        }
      })
      .expect(200)
      .expect('Content-Type', 'application/json; charset=utf-8')

    const pointsFromOrder = await em.findOne(LoyaltyPointsEntity, { orderId })
    expect(pointsFromOrder).toBeTruthy()
    expect(pointsFromOrder?.pointsFromOrder).toBe(1);
  })

  it('should handle order placed event when same event alredy occured', async () => {

    const eventName = EventName.ORDER_PLACED;
    const sequence = 10;

    const loyaltyPoints = new LoyaltyPointsEntity({
      customerId: randomUUID(),
      availablePoints: 1,
      pointsFromOrder: 1,
      orderId: randomUUID(),
      expiresAt: addDays(new Date(), 1),
    });

    const eventHistory = new EventsHistoryEntity({
      eventHash: hashEvent({ eventName, sequence }),
    });

    em.persist([loyaltyPoints, eventHistory]);
    await em.flush();

    await supertest(app.server)
      .post(`/webhook`)
      .send({
        "EventTime": "2023-11-16T12:24:45+01:00",
        "EventName": eventName,
        "EntityName": "Order",
        "Sequence": sequence,
        "Payload": {
          "OrderId": loyaltyPoints.orderId,
          "CustomerId": loyaltyPoints.customerId,
          "TotalOrderAmount": 50
        }
      })
      .expect(200)
      .expect('Content-Type', 'application/json; charset=utf-8')

    const pointsFromOrder = await em.find(LoyaltyPointsEntity, { customerId: loyaltyPoints.customerId })
    expect(pointsFromOrder).toHaveLength(1);
  })

  it('should reduce debt balance when a customer with negative points places a new order', async () => {

    const eventName = EventName.ORDER_PLACED;
    const sequence = 10;
    const orderId = randomUUID();

    const loyaltyPointsDept = new LoyaltyPointsDeptEntity({
      customerId: randomUUID(),
      points: 1,
    });

    await em.persistAndFlush(loyaltyPointsDept);

    await supertest(app.server)
      .post(`/webhook`)
      .send({
        "EventTime": "2023-11-16T12:24:45+01:00",
        "EventName": eventName,
        "EntityName": "Order",
        "Sequence": sequence,
        "Payload": {
          "OrderId": orderId,
          "CustomerId": loyaltyPointsDept.customerId,
          "TotalOrderAmount": 100
        }
      })
      .expect(200)
      .expect('Content-Type', 'application/json; charset=utf-8')

    const emFork = em.fork();

    const [pointsFromOrder, customerDept] = await Promise.all([
      emFork.findOne(LoyaltyPointsEntity, { customerId: loyaltyPointsDept.customerId }),
      emFork.findOne(LoyaltyPointsDeptEntity, { customerId: loyaltyPointsDept.customerId })
    ]);

    expect(pointsFromOrder).toBeTruthy();
    expect(pointsFromOrder?.pointsFromOrder).toBe(2);
    expect(pointsFromOrder?.availablePoints).toBe(1);

    expect(customerDept).toBeTruthy();
    expect(customerDept?.points).toBe(0);
  })

  it('should handle order canceled event when order does not exist', async () => {
    await supertest(app.server)
      .post(`/webhook`)
      .send({
        "EventTime": "2023-11-14T09:57:52+01:00",
        "EventName": "OrderCanceled",
        "EntityName": "Order",
        "Sequence": 2,
        "Payload": {
          "OrderId": "671eac98-7d4d-47fb-bd07-dee2c3a14d11"
        }
      })
      .expect(200)
      .expect('Content-Type', 'application/json; charset=utf-8')
  })


  it('should handle order canceled event when order exist', async () => {
    const loyaltyPoints = new LoyaltyPointsEntity({
      customerId: randomUUID(),
      availablePoints: 10,
      pointsFromOrder: 10,
      orderId: randomUUID(),
      expiresAt: addDays(new Date(), 1),
    });

    await em.persistAndFlush(loyaltyPoints);

    await supertest(app.server)
      .post(`/webhook`)
      .send({
        "EventTime": "2023-11-14T09:57:52+01:00",
        "EventName": "OrderCanceled",
        "EntityName": "Order",
        "Sequence": 2,
        "Payload": {
          "OrderId": loyaltyPoints.orderId
        }
      })
      .expect(200)
      .expect('Content-Type', 'application/json; charset=utf-8')

    const pointsFromOrder = await em.findOne(LoyaltyPointsEntity, { orderId: loyaltyPoints.orderId })
    expect(pointsFromOrder).toBeTruthy()
    expect(pointsFromOrder?.isCancelled).toBe(true);
  })

  it('should handle order returned event when order does not exist', async () => {
    await supertest(app.server)
      .post(`/webhook`)
      .send({
        "EventTime": "2023-11-11T16:54:43+01:00",
        "EventName": "OrderReturned",
        "EntityName": "Order",
        "Sequence": 2,
        "Payload": {
          "OrderId": "2e59361e-9544-11ee-a802-52f5db49a304"
        }
      })
      .expect(200)
      .expect('Content-Type', 'application/json; charset=utf-8')
  })

  it('should handle order returned event when order exist', async () => {
    const loyaltyPoints = new LoyaltyPointsEntity({
      customerId: randomUUID(),
      availablePoints: 10,
      pointsFromOrder: 10,
      orderId: randomUUID(),
      expiresAt: addDays(new Date(), 1),
    });

    await em.persistAndFlush(loyaltyPoints);

    await supertest(app.server)
      .post(`/webhook`)
      .send({
        "EventTime": "2023-11-11T16:54:43+01:00",
        "EventName": "OrderReturned",
        "EntityName": "Order",
        "Sequence": 2,
        "Payload": {
          "OrderId": loyaltyPoints.orderId
        }
      })
      .expect(200)
      .expect('Content-Type', 'application/json; charset=utf-8')

    const pointsFromOrder = await em.fork().findOne(LoyaltyPointsEntity, { orderId: loyaltyPoints.orderId })
    expect(pointsFromOrder).toBeTruthy()
    expect(pointsFromOrder?.isCancelled).toBe(true);
  })

  it('should create dept when customer consumed points from order which is canceled and does not have any points left', async () => {
    const loyaltyPoints = new LoyaltyPointsEntity({
      customerId: randomUUID(),
      availablePoints: 2,
      pointsFromOrder: 10,
      orderId: randomUUID(),
      expiresAt: addDays(new Date(), 1),
    });

    await em.persistAndFlush(loyaltyPoints);

    await supertest(app.server)
      .post(`/webhook`)
      .send({
        "EventTime": "2023-11-11T16:54:43+01:00",
        "EventName": "OrderReturned",
        "EntityName": "Order",
        "Sequence": 2,
        "Payload": {
          "OrderId": loyaltyPoints.orderId
        }
      })
      .expect(200)
      .expect('Content-Type', 'application/json; charset=utf-8')

    const emFork = em.fork();

    const [pointsDept, pointsFromOrder] = await Promise.all([
      emFork.findOne(LoyaltyPointsDeptEntity, { customerId: loyaltyPoints.customerId }),
      emFork.findOne(LoyaltyPointsEntity, { orderId: loyaltyPoints.orderId })
    ])

    expect(pointsFromOrder).toBeTruthy()
    expect(pointsFromOrder?.isCancelled).toBe(true);
    expect(pointsDept).toBeTruthy();
    expect(pointsDept?.points).toBe(8);
  })

  it('should prioritize available points when canceling an order with previously consumed points', async () => {
    const customerId = randomUUID();

    const loyaltyPoints = [new LoyaltyPointsEntity({
      customerId,
      availablePoints: 2,
      pointsFromOrder: 10,
      orderId: randomUUID(),
      expiresAt: addDays(new Date(), 1),
    }),
    new LoyaltyPointsEntity({
      customerId,
      availablePoints: 8,
      pointsFromOrder: 8,
      orderId: randomUUID(),
      expiresAt: addDays(new Date(), 1),
    })
    ];

    await em.persistAndFlush(loyaltyPoints);

    await supertest(app.server)
      .post(`/webhook`)
      .send({
        "EventTime": "2023-11-11T16:54:43+01:00",
        "EventName": "OrderReturned",
        "EntityName": "Order",
        "Sequence": 2,
        "Payload": {
          "OrderId": loyaltyPoints[0].orderId
        }
      })
      .expect(200)
      .expect('Content-Type', 'application/json; charset=utf-8')

    const emFork = em.fork();

    const [pointsDept, pointsFromCanceledOrder, pointsFromOtherOrder] = await Promise.all([
      emFork.findOne(LoyaltyPointsDeptEntity, { customerId }),
      emFork.findOne(LoyaltyPointsEntity, { orderId: loyaltyPoints[0].orderId }),
      emFork.findOne(LoyaltyPointsEntity, { orderId: loyaltyPoints[1].orderId })
    ])

    expect(pointsFromCanceledOrder).toBeTruthy()
    expect(pointsFromCanceledOrder?.isCancelled).toBe(true);
    expect(pointsFromOtherOrder).toBeTruthy();
    expect(pointsFromOtherOrder?.availablePoints).toBe(0);
    expect(pointsDept).toBeFalsy();
  })

  it('should create dept when customer consumed points from order which is canceled and does not have enough points left', async () => {
    const customerId = randomUUID();

    const loyaltyPoints = [new LoyaltyPointsEntity({
      customerId,
      availablePoints: 2,
      pointsFromOrder: 10,
      orderId: randomUUID(),
      expiresAt: addDays(new Date(), 1),
    }),
    new LoyaltyPointsEntity({
      customerId,
      availablePoints: 2,
      pointsFromOrder: 2,
      orderId: randomUUID(),
      expiresAt: addDays(new Date(), 1),
    })
    ];

    await em.persistAndFlush(loyaltyPoints);

    await supertest(app.server)
      .post(`/webhook`)
      .send({
        "EventTime": "2023-11-11T16:54:43+01:00",
        "EventName": "OrderReturned",
        "EntityName": "Order",
        "Sequence": 2,
        "Payload": {
          "OrderId": loyaltyPoints[0].orderId
        }
      })
      .expect(200)
      .expect('Content-Type', 'application/json; charset=utf-8')

    const emFork = em.fork();

    const [pointsDept, pointsFromCanceledOrder, pointsFromOtherOrder] = await Promise.all([
      emFork.findOne(LoyaltyPointsDeptEntity, { customerId }),
      emFork.findOne(LoyaltyPointsEntity, { orderId: loyaltyPoints[0].orderId }),
      emFork.findOne(LoyaltyPointsEntity, { orderId: loyaltyPoints[1].orderId })
    ])

    expect(pointsFromCanceledOrder).toBeTruthy()
    expect(pointsFromCanceledOrder?.isCancelled).toBe(true);
    expect(pointsFromOtherOrder).toBeTruthy();
    expect(pointsFromOtherOrder?.availablePoints).toBe(0);
    expect(pointsDept).toBeTruthy();
    expect(pointsDept?.points).toBe(6);
  })

  it('should handle customer delete event when customer does not have any orders', async () => {
    await supertest(app.server)
      .post(`/webhook`)
      .send({
        "EventTime": "2023-11-20T00:57:57+01:00",
        "EventName": "CustomerDeleted",
        "EntityName": "Customer",
        "Sequence": 2,
        "Payload": {
          "CustomerId": "814e496d-c6d1-49d5-b30b-359b4f83fa48"
        }
      })
      .expect(200)
      .expect('Content-Type', 'application/json; charset=utf-8')
  })

  it('should delete user dept when customer deleted occured', async () => {

    const loyaltyPointsDept = new LoyaltyPointsDeptEntity({
      customerId: randomUUID(),
      points: 10,
    });

    await em.persistAndFlush(loyaltyPointsDept);

    await supertest(app.server)
      .post(`/webhook`)
      .send({
        "EventTime": "2023-11-20T00:57:57+01:00",
        "EventName": "CustomerDeleted",
        "EntityName": "Customer",
        "Sequence": 2,
        "Payload": {
          "CustomerId": loyaltyPointsDept.customerId
        }
      })
      .expect(200)
      .expect('Content-Type', 'application/json; charset=utf-8')

    const pointsDept = await em.fork().findOne(LoyaltyPointsDeptEntity, { customerId: loyaltyPointsDept.customerId })
    expect(pointsDept).toBeFalsy();
  })

  it('should delete user loyalty points when customer deleted occured', async () => {
    const loyaltyPoints = new LoyaltyPointsEntity({
      customerId: randomUUID(),
      availablePoints: 2,
      pointsFromOrder: 2,
      orderId: randomUUID(),
      expiresAt: addDays(new Date(), 1),
    });

    await em.persistAndFlush(loyaltyPoints);

    await supertest(app.server)
      .post(`/webhook`)
      .send({
        "EventTime": "2023-11-20T00:57:57+01:00",
        "EventName": "CustomerDeleted",
        "EntityName": "Customer",
        "Sequence": 2,
        "Payload": {
          "CustomerId": loyaltyPoints.customerId
        }
      })
      .expect(200)
      .expect('Content-Type', 'application/json; charset=utf-8')

    const pointsDept = await em.fork().findOne(LoyaltyPointsEntity, { customerId: loyaltyPoints.customerId })
    expect(pointsDept).toBeFalsy();
  })
})
