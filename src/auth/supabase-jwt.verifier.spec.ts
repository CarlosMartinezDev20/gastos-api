import { createLocalJWKSet, exportJWK, generateKeyPair, SignJWT } from 'jose';
import {
  InvalidTokenError,
  SupabaseJwtVerifier,
} from './supabase-jwt.verifier';

const URL = 'https://ref.supabase.co';

async function setup() {
  const { publicKey, privateKey } = await generateKeyPair('ES256');
  const jwk = { ...(await exportJWK(publicKey)), kid: 'k1', alg: 'ES256' };
  const verifier = new SupabaseJwtVerifier(
    URL,
    createLocalJWKSet({ keys: [jwk] }),
  );
  const now = Math.floor(Date.now() / 1000);
  const sign = (claims: Record<string, unknown>, key = privateKey) =>
    new SignJWT({
      sub: '11111111-1111-4111-8111-111111111111',
      iss: `${URL}/auth/v1`,
      aud: 'authenticated',
      iat: now,
      exp: now + 3600,
      email: 'Ana@Correo.com',
      role: 'authenticated',
      user_metadata: { name: ' Ana ' },
      ...claims,
    })
      .setProtectedHeader({ alg: 'ES256', kid: 'k1' })
      .sign(key);
  return { verifier, sign };
}

describe('SupabaseJwtVerifier', () => {
  it('accepts a session token and reads who it belongs to', async () => {
    const { verifier, sign } = await setup();
    await expect(verifier.verify(await sign({}))).resolves.toEqual({
      sub: '11111111-1111-4111-8111-111111111111',
      email: 'ana@correo.com',
      name: 'Ana',
    });
  });

  it('rejects tokens signed by another key', async () => {
    const { verifier, sign } = await setup();
    const other = await generateKeyPair('ES256');
    await expect(
      verifier.verify(await sign({}, other.privateKey)),
    ).rejects.toBeInstanceOf(InvalidTokenError);
  });

  it('rejects expired tokens, other issuers and the anon role', async () => {
    const { verifier, sign } = await setup();
    for (const claims of [
      { exp: Math.floor(Date.now() / 1000) - 60 },
      { iss: 'https://otro.supabase.co/auth/v1' },
      { role: 'anon' },
      { aud: 'otra' },
    ]) {
      await expect(verifier.verify(await sign(claims))).rejects.toBeInstanceOf(
        InvalidTokenError,
      );
    }
  });

  it('rejects tokens with alg none or garbage', async () => {
    const { verifier } = await setup();
    const none = `${Buffer.from('{"alg":"none"}').toString('base64url')}.${Buffer.from('{"sub":"x"}').toString('base64url')}.`;
    for (const token of [none, 'basura']) {
      await expect(verifier.verify(token)).rejects.toBeInstanceOf(
        InvalidTokenError,
      );
    }
  });
});
