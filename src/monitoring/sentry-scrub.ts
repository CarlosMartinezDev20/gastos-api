import type { Breadcrumb, ErrorEvent } from '@sentry/nestjs';

const PATTERNS: [RegExp, string][] = [
  // JWTs: Supabase access tokens or any other signed token.
  [/eyJ[\w-]+\.[\w-]+\.[\w-]*/g, '[token]'],
  [/Bearer\s+\S+/gi, 'Bearer [token]'],
  // Supabase keys.
  [/sb_(secret|publishable)_[\w-]+/g, '[key]'],
  [
    /(refresh_token|access_token|password|passwd|apikey)(["=:\s]+)[^\s&",}]+/gi,
    '$1$2[redacted]',
  ],
  // Connection strings (DATABASE_URL, DIRECT_URL) with their password.
  [/postgres(ql)?:\/\/\S+/gi, '[connection]'],
  [/[\w.+-]+@[\w-]+\.[\w.-]+/g, '[email]'],
  // Amounts of money.
  [/\$\s?-?\d[\d.,]*/g, '$$[amount]'],
];

/** [text] without tokens, keys, passwords, connection strings, emails or
 * amounts of money. */
export function scrubText(text: string): string {
  return PATTERNS.reduce((out, [re, to]) => out.replace(re, to), text);
}

/** A request path without its query (searches, dates, cursors). */
function scrubUrl(url: string): string {
  return scrubText(url.split('?')[0]);
}

/**
 * What reaches Sentry from the API: the error and where it happened, never
 * who or what. The request keeps only method and path (no headers, so no
 * Authorization or cookies; no body, so no passwords or amounts); no user,
 * no extra data; texts scrubbed.
 */
export function scrubEvent(event: ErrorEvent): ErrorEvent {
  if (event.request) {
    event.request = {
      method: event.request.method,
      url: event.request.url ? scrubUrl(event.request.url) : undefined,
    };
  }
  delete event.user;
  delete event.extra;
  delete event.server_name;
  if (event.message) event.message = scrubText(event.message);
  if (event.transaction) event.transaction = scrubUrl(event.transaction);
  for (const exception of event.exception?.values ?? []) {
    if (exception.value) exception.value = scrubText(exception.value);
  }
  event.breadcrumbs = event.breadcrumbs
    ?.map(scrubBreadcrumb)
    .filter((b): b is Breadcrumb => b !== null);
  return event;
}

/** HTTP steps keep method, status and path; everything else only its
 * scrubbed message. */
export function scrubBreadcrumb(breadcrumb: Breadcrumb): Breadcrumb | null {
  const data: Record<string, unknown> = breadcrumb.data ?? {};
  const http =
    breadcrumb.type === 'http'
      ? {
          method: typeof data.method === 'string' ? data.method : undefined,
          status_code:
            typeof data.status_code === 'number' ? data.status_code : undefined,
          url: typeof data.url === 'string' ? scrubUrl(data.url) : undefined,
        }
      : undefined;
  return {
    ...breadcrumb,
    message: breadcrumb.message ? scrubText(breadcrumb.message) : undefined,
    data: http,
  };
}
