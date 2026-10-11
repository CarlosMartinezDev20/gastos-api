import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { PrismaService } from '../src/prisma/prisma.service';
import { createTestApp, registerUser, TEST_PASSWORD } from './test-app';

type Body = Record<string, unknown>;

describe('Account deletion (e2e)', () => {
  let app: INestApplication<App>;
  const email = `e2e-cuenta-${Date.now()}@ejemplo.com`;
  const api = () => request(app.getHttpServer());

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.get(PrismaService).user.deleteMany({ where: { email } });
    await app.close();
  });

  it('deletes the account with everything in it', async () => {
    const auth = await registerUser(app, email);
    // An own category with a movement in it: the cascade must not trip on it.
    const category = (
      await api()
        .post('/categories')
        .set('Authorization', auth)
        .send({ name: 'Propia e2e', icon: 'star', type: 'EXPENSE' })
        .expect(201)
    ).body as Body;
    await api()
      .post('/transactions')
      .set('Authorization', auth)
      .send({
        title: 'Gasto',
        amount: 5,
        type: 'EXPENSE',
        categoryId: category.id,
      })
      .expect(201);

    await api()
      .delete('/users/profile')
      .set('Authorization', auth)
      .send({ password: 'mal' })
      .expect(400);
    await api()
      .delete('/users/profile')
      .set('Authorization', auth)
      .send({ password: TEST_PASSWORD })
      .expect(204);

    // The token is still unexpired, but the account is gone: no new profile.
    await api().get('/transactions').set('Authorization', auth).expect(401);
    const prisma = app.get(PrismaService);
    expect(
      await prisma.category.count({ where: { id: category.id as string } }),
    ).toBe(0);
  });
});
