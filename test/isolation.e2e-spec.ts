import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { PrismaService } from '../src/prisma/prisma.service';
import { createTestApp, registerUser } from './test-app';

type Body = Record<string, unknown>;

// Two throwaway users, deleted at the end (their data cascades).
describe('Isolation between users and the wallet (e2e)', () => {
  let app: INestApplication<App>;
  const stamp = Date.now();
  const emails = [`e2e-a-${stamp}@ejemplo.com`, `e2e-b-${stamp}@ejemplo.com`];
  let alice: string;
  let bob: string;
  let foodId: string;
  let tx: Body;
  let card: Body;
  let payment: Body;
  let goal: Body;

  const api = () => request(app.getHttpServer());

  beforeAll(async () => {
    app = await createTestApp();
    alice = await registerUser(app, emails[0]);
    bob = await registerUser(app, emails[1]);

    const categories = await api()
      .get('/categories')
      .set('Authorization', alice)
      .expect(200);
    foodId = (categories.body as Body[]).find((c) => c.name === 'Comida')!
      .id as string;

    card = (
      await api()
        .post('/payment-methods')
        .set('Authorization', alice)
        .send({
          name: 'Visa e2e',
          type: 'CREDIT_CARD',
          color: 'ink',
          last4: '4821',
          creditLimit: 500,
        })
        .expect(201)
    ).body as Body;
    tx = (
      await api()
        .post('/transactions')
        .set('Authorization', alice)
        .send({
          title: 'Zapatos',
          amount: 80.1,
          type: 'EXPENSE',
          categoryId: foodId,
          paymentMethodId: card.id,
        })
        .expect(201)
    ).body as Body;
    payment = (
      await api()
        .post(`/payment-methods/${card.id as string}/payments`)
        .set('Authorization', alice)
        .send({ amount: 30.05 })
        .expect(201)
    ).body as Body;
    goal = (
      await api()
        .post('/savings-goals')
        .set('Authorization', alice)
        .send({
          name: 'Meta e2e',
          targetAmount: 100,
          icon: 'savings',
          bgColor: 'x',
          iconColor: 'y',
        })
        .expect(201)
    ).body as Body;
  });

  afterAll(async () => {
    await app
      .get(PrismaService)
      .user.deleteMany({ where: { email: { in: emails } } });
    await app.close();
  });

  it('returns amounts as JSON numbers, not decimal strings', () => {
    expect(tx.amount).toBe(80.1);
    expect(payment.amount).toBe(30.05);
    expect(card.creditLimit).toBe(500);
  });

  it('a card payment lowers the debt, not the balance', async () => {
    const methods = await api()
      .get('/payment-methods')
      .set('Authorization', alice)
      .expect(200);
    expect((methods.body as Body[])[0]).toMatchObject({
      paidTotal: 30.05,
      transactionCount: 1,
    });
    const balance = await api()
      .get('/transactions/balance')
      .set('Authorization', alice)
      .expect(200);
    expect(balance.body).toEqual({
      totalIncome: 0,
      totalExpense: 80.1,
      balance: -80.1,
    });
  });

  it("doesn't list another user's data", async () => {
    for (const path of [
      '/transactions',
      '/payment-methods',
      '/savings-goals',
    ]) {
      const res = await api().get(path).set('Authorization', bob).expect(200);
      expect(res.body).toEqual([]);
    }
  });

  it("can't change or delete another user's data", async () => {
    await api()
      .patch(`/transactions/${tx.id as string}`)
      .set('Authorization', bob)
      .send({ amount: 1 })
      .expect(404);
    await api()
      .delete(`/transactions/${tx.id as string}`)
      .set('Authorization', bob)
      .expect(404);
    await api()
      .delete(`/payment-methods/${card.id as string}`)
      .set('Authorization', bob)
      .expect(404);
    await api()
      .delete(`/payment-methods/payments/${payment.id as string}`)
      .set('Authorization', bob)
      .expect(404);
    await api()
      .patch(`/savings-goals/${goal.id as string}`)
      .set('Authorization', bob)
      .send({ name: 'Hackeada' })
      .expect(404);
  });

  it("can't use another user's card", async () => {
    await api()
      .post('/transactions')
      .set('Authorization', bob)
      .send({
        title: 'Con tarjeta ajena',
        amount: 5,
        type: 'EXPENSE',
        categoryId: foodId,
        paymentMethodId: card.id,
      })
      .expect(404);
    await api()
      .post(`/payment-methods/${card.id as string}/payments`)
      .set('Authorization', bob)
      .send({ amount: 5 })
      .expect(404);
  });

  it("left alice's data untouched", async () => {
    const res = await api()
      .get('/transactions')
      .set('Authorization', alice)
      .expect(200);
    expect(res.body).toEqual([
      expect.objectContaining({ id: tx.id, amount: 80.1 }),
    ]);
  });

  it('sets, validates and clears a goal target date', async () => {
    const path = `/savings-goals/${goal.id as string}`;
    const set = await api()
      .patch(path)
      .set('Authorization', alice)
      .send({ targetDate: '2027-02-28' })
      .expect(200);
    expect((set.body as Body).targetDate).toBe('2027-02-28');
    for (const targetDate of ['2027-02-30', '28/02/2027', '2027-02-28T10:00']) {
      await api()
        .patch(path)
        .set('Authorization', alice)
        .send({ targetDate })
        .expect(400);
    }
    const cleared = await api()
      .patch(path)
      .set('Authorization', alice)
      .send({ targetDate: null })
      .expect(200);
    expect((cleared.body as Body).targetDate).toBeNull();
  });
});
