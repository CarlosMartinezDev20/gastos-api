import * as Sentry from '@sentry/nestjs';
import { scrubBreadcrumb, scrubEvent } from './monitoring/sentry-scrub';

// Loaded before anything else (first import in main.ts) so Sentry can hook
// into Nest. Without SENTRY_DSN (local, tests, CI) nothing is sent.
const dsn = process.env.SENTRY_DSN?.trim();
if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV ?? 'development',
    // The SDK collects none of these (v11 collects them all by default):
    // no Authorization header, cookies, passwords in bodies or searches.
    dataCollection: {
      userInfo: false,
      cookies: false,
      httpHeaders: false,
      httpBodies: [],
      urlQueryParams: false,
    },
    // Errors only, no performance tracing.
    tracesSampleRate: 0,
    beforeSend: (event) => scrubEvent(event),
    beforeBreadcrumb: (breadcrumb) => scrubBreadcrumb(breadcrumb),
  });
}
