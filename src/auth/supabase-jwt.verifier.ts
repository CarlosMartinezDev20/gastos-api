import { createRemoteJWKSet, errors, jwtVerify, JWTVerifyGetKey } from 'jose';

/** Who a valid Supabase access token belongs to. */
export interface SupabaseIdentity {
  /** The Supabase Auth user id (a UUID), also the id of our `User` row. */
  sub: string;
  email: string;
  /** `name` given at sign-up (user metadata), if any. */
  name?: string;
}

/** The token is missing, forged, expired or not a user session. */
export class InvalidTokenError extends Error {}

/**
 * Checks access tokens issued by Supabase Auth against the project's public
 * signing keys (JWKS, asymmetric ES256/RS256): the API holds no secret that
 * could sign tokens, and keys rotated in Supabase are picked up on their own.
 * Issuer, audience, expiry and algorithm are all enforced.
 */
export class SupabaseJwtVerifier {
  private readonly issuer: string;
  private readonly keys: JWTVerifyGetKey;

  constructor(supabaseUrl: string, keys?: JWTVerifyGetKey) {
    this.issuer = `${supabaseUrl}/auth/v1`;
    this.keys =
      keys ??
      createRemoteJWKSet(new URL(`${this.issuer}/.well-known/jwks.json`), {
        cacheMaxAge: 10 * 60 * 1000,
      });
  }

  async verify(token: string): Promise<SupabaseIdentity> {
    let payload: Record<string, unknown>;
    try {
      ({ payload } = await jwtVerify(token, this.keys, {
        issuer: this.issuer,
        audience: 'authenticated',
        algorithms: ['ES256', 'RS256'],
      }));
    } catch (error) {
      // An unreachable JWKS is an outage, not a bad token.
      if (
        error instanceof errors.JOSEError &&
        !(error instanceof errors.JWKSTimeout)
      ) {
        throw new InvalidTokenError(error.code);
      }
      throw error;
    }

    const { sub, email, role } = payload;
    // `authenticated` = a signed-in user (not the anon or service role).
    if (typeof sub !== 'string' || role !== 'authenticated') {
      throw new InvalidTokenError('not a user session');
    }
    if (typeof email !== 'string' || email.length === 0) {
      throw new InvalidTokenError('token without email');
    }
    const metadata = payload.user_metadata as { name?: unknown } | undefined;
    const name =
      typeof metadata?.name === 'string' ? metadata.name.trim() : undefined;
    return { sub, email: email.toLowerCase(), name: name || undefined };
  }
}
