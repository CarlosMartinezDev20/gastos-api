import { randomUUID } from 'node:crypto';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import {
  createLocalJWKSet,
  exportJWK,
  generateKeyPair,
  KeyLike,
  SignJWT,
} from 'jose';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.setup';
import { SupabaseAuthClient } from '../src/auth/supabase-auth.client';
import { SupabaseJwtVerifier } from '../src/auth/supabase-jwt.verifier';

const SUPABASE_URL = 'https://e2e.supabase.co';
/** The password every test account has in the fake Supabase. */
export const TEST_PASSWORD = 'secreto123';

let signingKey: KeyLike;

/**
 * Stands in for Supabase Auth: accounts are created by `registerUser`,
 * deleted by the API, and only TEST_PASSWORD is right.
 */
export class FakeSupabaseAuth {
  readonly users = new Set<string>();
  checkPassword(_email: string, password: string) {
    return Promise.resolve(password === TEST_PASSWORD);
  }
  userExists(id: string) {
    return Promise.resolve(this.users.has(id));
  }
  deleteUser(id: string) {
    this.users.delete(id);
    return Promise.resolve();
  }
}

/**
 * The API with the same setup as main.ts (pipes, interceptors…). Tokens
 * are checked by the real verifier, against a key made for the test run
 * instead of the project's published keys.
 */
export async function createTestApp(): Promise<INestApplication<App>> {
  const { publicKey, privateKey } = await generateKeyPair('ES256');
  signingKey = privateKey;
  const jwk = { ...(await exportJWK(publicKey)), kid: 'e2e', alg: 'ES256' };
  const moduleFixture = await Test.createTestingModule({
    imports: [AppModule],
  })
    .overrideProvider(SupabaseJwtVerifier)
    .useValue(
      new SupabaseJwtVerifier(SUPABASE_URL, createLocalJWKSet({ keys: [jwk] })),
    )
    .overrideProvider(SupabaseAuthClient)
    .useValue(new FakeSupabaseAuth())
    .compile();
  const app = moduleFixture.createNestApplication<INestApplication<App>>();
  configureApp(app);
  await app.init();
  return app;
}

/** A Supabase-style access token for [sub]. */
export function signToken(
  sub: string,
  email: string,
  claims: Record<string, unknown> = {},
) {
  return new SignJWT({ email, role: 'authenticated', ...claims })
    .setProtectedHeader({ alg: 'ES256', kid: 'e2e' })
    .setSubject(sub)
    .setIssuer(`${SUPABASE_URL}/auth/v1`)
    .setAudience('authenticated')
    .setIssuedAt()
    .setExpirationTime('1h')
    .sign(signingKey);
}

/** Signs up a throwaway account and returns its bearer header. */
export async function registerUser(app: INestApplication<App>, email: string) {
  const sub = randomUUID();
  app.get<FakeSupabaseAuth>(SupabaseAuthClient).users.add(sub);
  const token = await signToken(sub, email, {
    user_metadata: { name: 'Prueba e2e' },
  });
  return `Bearer ${token}`;
}
