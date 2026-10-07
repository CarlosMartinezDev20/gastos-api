import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { configureApp } from './app.setup';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

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

  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  console.log(`🚀 API en http://localhost:${port}`);
  if (swagger) console.log(`📚 Swagger en http://localhost:${port}/api/docs`);
}
void bootstrap();
