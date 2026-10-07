import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.setup';

/** The API with the same setup as main.ts (pipes, interceptors…). */
export async function createTestApp(): Promise<INestApplication<App>> {
  const moduleFixture = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();
  const app = moduleFixture.createNestApplication<INestApplication<App>>();
  configureApp(app);
  await app.init();
  return app;
}

/** Registers a throwaway user and returns its bearer header. */
export async function registerUser(app: INestApplication<App>, email: string) {
  const res = await request(app.getHttpServer())
    .post('/auth/register')
    .send({ name: 'Prueba e2e', email, password: 'secreto123' })
    .expect(201);
  return `Bearer ${(res.body as { accessToken: string }).accessToken}`;
}
