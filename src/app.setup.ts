import { INestApplication, ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';
import { DecimalToNumberInterceptor } from './common/decimal-to-number.interceptor';

/**
 * Security headers, CORS, response mapping and validation: shared by
 * main.ts and the e2e tests, so the tests exercise the real setup.
 */
export function configureApp(app: INestApplication) {
  app.use(helmet());

  const corsOrigin = process.env.CORS_ORIGIN ?? '*';
  const allowedOrigins = corsOrigin.split(',').map((o) => o.trim());
  app.enableCors({
    origin: (
      origin: string | undefined,
      callback: (err: Error | null, allow?: boolean) => void,
    ) => {
      if (!origin || corsOrigin === '*' || allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }

      const isLocalWildcardAllowed = allowedOrigins.some((allowed) => {
        if (!allowed.endsWith(':*')) return false;
        const baseOrigin = allowed.slice(0, -2);
        return origin.startsWith(`${baseOrigin}:`);
      });

      callback(null, isLocalWildcardAllowed);
    },
    credentials: true,
  });

  app.useGlobalInterceptors(new DecimalToNumberInterceptor());
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );
}
