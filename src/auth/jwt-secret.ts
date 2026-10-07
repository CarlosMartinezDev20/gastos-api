import { ConfigService } from '@nestjs/config';

/** Shorter secrets can be brute-forced offline from any issued token. */
export const MIN_JWT_SECRET_LENGTH = 32;

/**
 * The secret that signs and checks access tokens. There is no fallback: a
 * missing or weak secret stops the API at startup instead of letting anyone
 * forge tokens with a known default.
 */
export function jwtSecret(config: ConfigService): string {
  const secret = config.get<string>('JWT_SECRET')?.trim();
  if (!secret || secret.length < MIN_JWT_SECRET_LENGTH) {
    throw new Error(
      `JWT_SECRET debe tener al menos ${MIN_JWT_SECRET_LENGTH} caracteres ` +
        '(genera uno con: openssl rand -base64 48)',
    );
  }
  return secret;
}
