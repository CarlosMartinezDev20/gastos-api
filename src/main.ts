import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { configureApp } from './app.setup';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  // Render stops instances with SIGTERM: close the database pool cleanly.
  app.enableShutdownHooks();

  configureApp(app);

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

  // 0.0.0.0: reachable from the host's proxy (Render), not only loopback.
  const port = Number(process.env.PORT ?? 3000);
  await app.listen(port, '0.0.0.0');
  const logger = new Logger('Bootstrap');
  logger.log(`API escuchando en el puerto ${port}`);
  if (swagger) logger.log(`Swagger en http://localhost:${port}/api/docs`);
}
void bootstrap();
