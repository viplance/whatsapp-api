import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import { join } from 'path';
import { readFileSync } from 'fs';
import { LogInterceptor } from '@viplance/nestjs-logger';
import { LogService } from '@viplance/nestjs-logger';

declare const module: any;

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get<ConfigService>(ConfigService);
  const port = configService.get('SERVER_PORT');

  const packageJsonPath = join(__dirname, '..', 'package.json');
  const packageJsonContent = readFileSync(packageJsonPath, 'utf-8');
  const packageJson = JSON.parse(packageJsonContent);
  const version: string = packageJson.version;

  const swaggerConfig = new DocumentBuilder()
    .setTitle('WhatsApp direct message API')
    .setDescription('Send direct messages to WhatsApp without Business account')
    .setVersion(version)
    .addTag('cats')
    .build();

  const logService = await app.resolve(LogService);
  app.useGlobalInterceptors(new LogInterceptor(logService));

  const documentFactory = () =>
    SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('docs', app, documentFactory);

  await app.listen(port || 3000);

  if (module.hot) {
    module.hot.accept();
    module.hot.dispose(() => app.close());
  }
}

bootstrap();
