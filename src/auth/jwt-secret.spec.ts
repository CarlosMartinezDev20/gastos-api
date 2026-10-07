import { ConfigService } from '@nestjs/config';
import { jwtSecret } from './jwt-secret';

const config = (value?: string) =>
  ({ get: () => value }) as unknown as ConfigService;

describe('jwtSecret', () => {
  it('refuses a missing or short secret instead of a default', () => {
    expect(() => jwtSecret(config())).toThrow('JWT_SECRET');
    expect(() => jwtSecret(config('corto'))).toThrow('al menos 32');
  });

  it('returns a long enough secret', () => {
    const secret = 'x'.repeat(40);
    expect(jwtSecret(config(` ${secret} `))).toBe(secret);
  });
});
