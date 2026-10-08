import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { PrismaService } from '../src/prisma/prisma.service';
import { createTestApp, registerUser } from './test-app';

type Item = { id: string; title: string; amount: number; date: string };
type Page = {
  items: Item[];
  nextCursor: string | null;
  summary: { count: number; income: number; expense: number } | null;
};

describe('Paginated history (e2e)', () => {
  let app: INestApplication<App>;
  const email = `e2e-historial-${Date.now()}@ejemplo.com`;
  let auth: string;
  const api = () => request(app.getHttpServer());
  const page = async (query: Record<string, string | number>) =>
    (
      await api()
        .get('/transactions/page')
        .query(query)
        .set('Authorization', auth)
        .expect(200)
    ).body as Page;

  beforeAll(async () => {
    app = await createTestApp();
    auth = await registerUser(app, email);
    const categories = (
      await api().get('/categories').set('Authorization', auth).expect(200)
    ).body as { id: string; name: string }[];
    const food = categories.find((c) => c.name === 'Comida')!.id;
    const salary = categories.find((c) => c.name === 'Trabajo')!.id;
    const card = (
      await api()
        .post('/payment-methods')
        .set('Authorization', auth)
        .send({ name: 'Visa historial', type: 'CREDIT_CARD', color: 'ink' })
        .expect(201)
    ).body as { id: string };
    // Two on the same instant: the id breaks the tie between pages.
    const movements = [
      ['Café', 3.5, 'EXPENSE', food, '2026-09-01T12:00:00.000Z', card.id],
      ['Almuerzo', 6, 'EXPENSE', food, '2026-09-02T12:00:00.000Z', card.id],
      ['Cena', 9.25, 'EXPENSE', food, '2026-09-02T12:00:00.000Z', undefined],
      ['Pago', 500, 'INCOME', salary, '2026-09-03T12:00:00.000Z', undefined],
      ['Reembolso', 1.5, 'INCOME', salary, '2026-09-04T12:00:00.000Z', card.id],
      [
        '50% descuento',
        2,
        'EXPENSE',
        food,
        '2026-09-05T12:00:00.000Z',
        undefined,
      ],
    ] as const;
    for (const [
      title,
      amount,
      type,
      categoryId,
      date,
      paymentMethodId,
    ] of movements) {
      await api()
        .post('/transactions')
        .set('Authorization', auth)
        .send({ title, amount, type, categoryId, date, paymentMethodId })
        .expect(201);
    }
  });

  afterAll(async () => {
    await app.get(PrismaService).user.deleteMany({ where: { email } });
    await app.close();
  });

  it('walks every page once, newest first, with totals on the first', async () => {
    const first = await page({ limit: 4 });
    expect(first.summary).toEqual({ count: 6, income: 501.5, expense: 20.75 });
    expect(first.items).toHaveLength(4);
    expect(first.nextCursor).not.toBeNull();

    const second = await page({ limit: 4, cursor: first.nextCursor! });
    expect(second.summary).toBeNull();
    expect(second.nextCursor).toBeNull();
    const all = [...first.items, ...second.items];
    expect(all).toHaveLength(6);
    expect(new Set(all.map((t) => t.id)).size).toBe(6);
    const dates = all.map((t) => t.date);
    expect([...dates].sort().reverse()).toEqual(dates);
  });

  it('searches without accents and with literal wildcards', async () => {
    const cafe = await page({ q: 'cafe' });
    expect(cafe.items.map((t) => t.title)).toEqual(['Café']);
    // By category name too.
    expect((await page({ q: 'trabajo' })).summary?.count).toBe(2);
    expect((await page({ q: '50%' })).items.map((t) => t.title)).toEqual([
      '50% descuento',
    ]);
    expect((await page({ q: '%' })).summary?.count).toBe(1);
  });

  it('filters by type and dates', async () => {
    const income = await page({ type: 'INCOME' });
    expect(income.summary).toEqual({ count: 2, income: 501.5, expense: 0 });
    const range = await page({
      from: '2026-09-02T00:00:00.000Z',
      to: '2026-09-03T23:59:59.999Z',
    });
    expect(range.summary?.count).toBe(3);
    // Exact instants, whatever the database session's time zone.
    const instant = await page({
      from: '2026-09-02T12:00:00.000Z',
      to: '2026-09-02T12:00:00.000Z',
    });
    expect(instant.summary?.count).toBe(2);
  });

  it('rejects a bad cursor or limit', async () => {
    await api()
      .get('/transactions/page')
      .query({ cursor: 'nope' })
      .set('Authorization', auth)
      .expect(400);
    await api()
      .get('/transactions/page')
      .query({ limit: 500 })
      .set('Authorization', auth)
      .expect(400);
  });

  it('tells the wallet what was charged to a card, all time', async () => {
    const methods = (
      await api().get('/payment-methods').set('Authorization', auth).expect(200)
    ).body as { chargedTotal: number }[];
    expect(methods[0].chargedTotal).toBe(8); // 3.5 + 6 − 1.5
  });
});
