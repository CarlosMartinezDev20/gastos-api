import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { createTestApp } from './test-app';

// Needs the database from .env with the seed applied (npm run db:setup).
describe('API (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it('reports health without a token', () => {
    return request(app.getHttpServer())
      .get('/health')
      .expect(200, { status: 'ok' });
  });

  it('rejects protected routes without a token', () => {
    return request(app.getHttpServer()).get('/transactions').expect(401);
  });

  it('logs in the seed user and reads the balance', async () => {
    const login = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'daniela@universidad.edu', password: 'daniela123' })
      .expect(201);
    const token = (login.body as { accessToken: string }).accessToken;

    const balance = await request(app.getHttpServer())
      .get('/transactions/balance')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(balance.body).toHaveProperty('balance');
  });
});
