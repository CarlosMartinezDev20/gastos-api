import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

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

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  const config = new DocumentBuilder()
    .setTitle('Gastos Universitarios API')
    .setDescription(
      'API REST para finanzas personales universitarias (Material Design 3). ' +
        'Consumible desde Flutter con generación de modelos Dart.',
    )
    .setVersion('1.0')
    .addBearerAuth()
    .addTag('Auth')
    .addTag('Users')
    .addTag('Categories')
    .addTag('Transactions')
    .addTag('Savings Goals')
    .addTag('Metrics')
    .build();

  // The API map is for development; production doesn't advertise it.
  const swagger = process.env.NODE_ENV !== 'production';
  if (swagger) {
    SwaggerModule.setup(
      'api/docs',
      app,
      SwaggerModule.createDocument(app, config),
    );
  }

  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  console.log(`🚀 API en http://localhost:${port}`);
  if (swagger) console.log(`📚 Swagger en http://localhost:${port}/api/docs`);
}
void bootstrap();
