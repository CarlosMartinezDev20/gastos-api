import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { PrismaService } from '../src/prisma/prisma.service';
import { createTestApp, registerUser } from './test-app';

type Body = Record<string, unknown>;

describe('Password change and account deletion (e2e)', () => {
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

  it('signs out other devices when the password changes', async () => {
    const phone = await registerUser(app, email);
    const laptop = `Bearer ${
      (
        (
          await api()
            .post('/auth/login')
            .send({ email, password: 'secreto123' })
            .expect(201)
        ).body as { accessToken: string }
      ).accessToken
    }`;

    await api()
      .patch('/users/password')
      .set('Authorization', phone)
      .send({ currentPassword: 'mal', newPassword: 'nuevaClave1' })
      .expect(400);

    const res = await api()
      .patch('/users/password')
      .set('Authorization', phone)
      .send({ currentPassword: 'secreto123', newPassword: 'nuevaClave1' })
      .expect(200);
    const fresh = `Bearer ${(res.body as { accessToken: string }).accessToken}`;

    await api().get('/users/profile').set('Authorization', laptop).expect(401);
    await api().get('/users/profile').set('Authorization', phone).expect(401);
    await api().get('/users/profile').set('Authorization', fresh).expect(200);
    await api()
      .post('/auth/login')
      .send({ email, password: 'nuevaClave1' })
      .expect(201);
  });

  it('deletes the account with everything in it', async () => {
    const login = await api()
      .post('/auth/login')
      .send({ email, password: 'nuevaClave1' })
      .expect(201);
    const auth = `Bearer ${(login.body as { accessToken: string }).accessToken}`;
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
      .send({ password: 'nuevaClave1' })
      .expect(204);

    await api().get('/transactions').set('Authorization', auth).expect(401);
    await api()
      .post('/auth/login')
      .send({ email, password: 'nuevaClave1' })
      .expect(401);
    const prisma = app.get(PrismaService);
    expect(
      await prisma.category.count({ where: { id: category.id as string } }),
    ).toBe(0);
  });
});
