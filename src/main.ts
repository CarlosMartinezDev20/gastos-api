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
    origin: (origin, callback) => {
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

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  console.log(`🚀 API en http://localhost:${port}`);
  console.log(`📚 Swagger en http://localhost:${port}/api/docs`);
}
bootstrap();
