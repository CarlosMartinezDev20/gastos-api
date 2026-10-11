import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '../src/prisma/prisma.service';
import { createTestApp, registerUser, signToken } from './test-app';

// Needs the database from .env with the migrations and seed applied.
describe('API (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it('reports health without a token', async () => {
    const api = request(app.getHttpServer());
    await api.get('/health').expect(200, { status: 'ok' });
    await api.get('/health/db').expect(200, { status: 'ok' });
  });

  it('rejects protected routes without a token', () => {
    return request(app.getHttpServer()).get('/transactions').expect(401);
  });

  it('rejects forged, expired and anon tokens', async () => {
    const sub = randomUUID();
    for (const token of [
      'basura',
      await signToken(sub, 'x@ejemplo.com', { role: 'anon' }),
      await signToken(sub, 'x@ejemplo.com', {
        exp: Math.floor(Date.now() / 1000) - 60,
      }),
    ]) {
      await request(app.getHttpServer())
        .get('/transactions')
        .set('Authorization', `Bearer ${token}`)
        .expect(401);
    }
  });

  it('creates the profile on the first call and reads the balance', async () => {
    const email = `e2e-perfil-${Date.now()}@ejemplo.com`;
    const auth = await registerUser(app, email);
    try {
      const profile = await request(app.getHttpServer())
        .get('/users/profile')
        .set('Authorization', auth)
        .expect(200);
      expect(profile.body).toMatchObject({ email, name: 'Prueba e2e' });
      const balance = await request(app.getHttpServer())
        .get('/transactions/balance')
        .set('Authorization', auth)
        .expect(200);
      expect(balance.body).toHaveProperty('balance', 0);
    } finally {
      await app.get(PrismaService).user.deleteMany({ where: { email } });
    }
  });
});
