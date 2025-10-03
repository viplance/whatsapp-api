import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PuppeteerService } from './services/puppeteer.service';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { LogModule } from '@viplance/nestjs-logger';

@Module({
  imports: [
    ConfigModule.forRoot(),
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'public'),
      serveStaticOptions: {
        fallthrough: true,
        redirect: true,
      },
    }),
    LogModule,
  ],
  controllers: [AppController],
  providers: [AppService, PuppeteerService],
})
export class AppModule {}
