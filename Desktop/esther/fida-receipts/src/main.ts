import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';
import { ResponseInterceptor } from './common/response.interceptor';
import { HttpExceptionFilter } from './common/http-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api', { exclude: [''] });
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }),
  );
  app.useGlobalInterceptors(new ResponseInterceptor());
  app.useGlobalFilters(new HttpExceptionFilter());

  const port = app.get(ConfigService).get<number>('PORT') ?? 3000;
  await app.listen(port);
  // eslint-disable-next-line no-console
  console.log(`FIDA receipts running on http://localhost:${port}`);
}
bootstrap();
