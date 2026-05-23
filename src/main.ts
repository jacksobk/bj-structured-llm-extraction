/**
 * Application entry point — Layer 7. Sets the global prefix, the global
 * ValidationPipe (DTO enforcement), and Swagger docs.
 */

import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { config } from './core/config';
import { LlmProvider } from './code/extract/llm-provider';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix(config.basicUrl);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  const swaggerConfig = new DocumentBuilder()
    .setTitle(config.appName)
    .setVersion(config.appVersion)
    .setContact(config.appContactName, '', config.appContactEmail)
    .setDescription(
      'Structured-output extraction with validation, deterministic ' +
        'verification, and a human-review flag. All endpoints return a ' +
        'standardised ApiResponse envelope.',
    )
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup(`${config.basicUrl}/docs`, app, document, {
    jsonDocumentUrl: `${config.basicUrl}/openapi.json`,
  });

  await app.listen(config.port);
  // eslint-disable-next-line no-console
  console.log(
    `${config.appName} listening on http://localhost:${config.port}${config.basicUrl} ` +
      `(LLM provider: ${LlmProvider.resolveProvider()})`,
  );
}

void bootstrap();
