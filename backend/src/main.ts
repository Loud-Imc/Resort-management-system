import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { json, urlencoded } from 'express';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Increase payload size limits for webhooks and uploads
  app.use(json({ limit: '50mb' }));
  app.use(urlencoded({ extended: true, limit: '50mb' }));

  // Global prefix for all API endpoints
  app.setGlobalPrefix('api');

  // CORS
  app.enableCors({
    origin: [
      process.env.ADMIN_URL || 'http://localhost:5174',
      process.env.PUBLIC_URL || 'http://localhost:5173',
      process.env.CHANNEL_PARTNER_URL || 'http://localhost:5176',
      process.env.PROPERTY_URL || 'http://localhost:5175',
      process.env.OPP_URL || 'http://localhost:5177',
      'https://opp.routeguide.in',
      'https://staging-opp.routeguide.in',
    ],
    credentials: true,
  });

  // Validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Global Filter
  app.useGlobalFilters(new HttpExceptionFilter());

  // Swagger API Documentation
  const config = new DocumentBuilder()
    .setTitle('Resort Management System API')
    .setDescription('Production-ready Resort ERP and Booking System')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT || 3000;
  await app.listen(port);
  console.log(`🚀 Application is running on: http://localhost:${port}`);
  console.log(`📚 API Documentation: http://localhost:${port}/api/docs`);
}
bootstrap();
