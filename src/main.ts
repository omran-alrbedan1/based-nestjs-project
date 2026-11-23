import { I18nValidationPipe } from 'nestjs-i18n';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(new I18nValidationPipe({
    whitelist:true,
    forbidNonWhitelisted:true,
  }));
  await app.listen(process.env.PORT ?? 3000);
}
await bootstrap();
