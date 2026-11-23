import type { ErrorEvent } from '@sentry/nestjs';
import { scrubEvent, scrubText } from './sentry-scrub';

const jwt =
  'eyJhbGciOiJFUzI1NiJ9.eyJzdWIiOiJ1MSIsImVtYWlsIjoiYUBiLmMifQ.c2lnbmF0dXJh';

describe('sentry scrubbing', () => {
  it('removes tokens, keys, passwords, connections, emails and amounts', () => {
    const text = scrubText(
      `Bearer ${jwt} sb_secret_AbC123 password=hunter22 ` +
        `postgresql://postgres.ref:clave@host:5432/postgres ana@correo.com $1,250.75`,
    );
    for (const leaked of [
      jwt,
      'sb_secret_AbC123',
      'hunter22',
      'clave@host',
      'ana@correo.com',
      '1,250.75',
    ]) {
      expect(text).not.toContain(leaked);
    }
    expect(text).toContain('$[amount]');
  });

  it('keeps the error and the route, drops headers, body, user and extra', () => {
    const event = scrubEvent({
      type: undefined,
      message: `Falló para ana@correo.com`,
      exception: { values: [{ type: 'Error', value: `token ${jwt}` }] },
      request: {
        method: 'POST',
        url: 'https://api/transactions?q=farmacia',
        headers: { authorization: `Bearer ${jwt}`, cookie: 'sb=1' },
        cookies: { sb: jwt },
        data: { password: 'hunter22', amount: 12.5 },
        query_string: 'q=farmacia',
      },
      user: { id: 'u1', email: 'ana@correo.com', ip_address: '1.2.3.4' },
      extra: { amount: 12.5 },
      server_name: 'srv',
      breadcrumbs: [
        {
          type: 'http',
          data: {
            method: 'GET',
            status_code: 200,
            url: 'https://x.supabase.co/auth/v1/admin/users?x=1',
          },
        },
        { category: 'console', message: `DATABASE_URL=postgresql://u:p@h/db` },
      ],
    });

    expect(event.request).toEqual({
      method: 'POST',
      url: 'https://api/transactions',
    });
    expect(event.user).toBeUndefined();
    expect(event.extra).toBeUndefined();
    expect(event.server_name).toBeUndefined();
    expect(event.message).toBe('Falló para [email]');
    expect(event.exception?.values?.[0].value).toBe('token [token]');
    expect(event.breadcrumbs?.[0].data).toEqual({
      method: 'GET',
      status_code: 200,
      url: 'https://x.supabase.co/auth/v1/admin/users',
    });
    expect(event.breadcrumbs?.[1].message).toBe('DATABASE_URL=[connection]');
    expect(JSON.stringify(event)).not.toContain('hunter22');
  });
});
