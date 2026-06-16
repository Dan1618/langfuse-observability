// ⚠️  Must be the very first import – registers the OTel SDK before any
// LangChain / LangGraph module is loaded so that auto-instrumentation works.
import './tracing';

import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  app.setBaseViewsDir(join(__dirname, '..', 'views'));
  app.setViewEngine('hbs');

  await app.listen(process.env.PORT ?? 3001);
}
bootstrap();
