import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { CoreModule } from './core/core.module.js';
import { LoggerMiddleware } from './core/middleware/logger.middleware.js';
import { AuthMiddleware } from './core/middleware/auth.middleware.js';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { UsersModule } from './users/users.module.js';
import { TweetsModule } from './tweets/tweets.module.js';
import { AuthModule } from './auth/auth.module.js';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProfileModule } from './profile/profile.module.js';
import { HashtagModule } from './hashtag/hashtag.module.js';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PaginationModule } from './common/pagination/pagination.module.js';
import databaseConfig from './config/database.config.js';
import appConfig from './config/app.config.js';
import envValidation from './config/env.validation.js';
import { AcceptLanguageResolver, I18nModule, I18nValidationExceptionFilter } from 'nestjs-i18n';
import { APP_FILTER } from '@nestjs/core';
import * as path from 'node:path';


const ENV = process.env.NODE_ENV?.trim();

@Module({
  imports: [CoreModule, UsersModule, TweetsModule, AuthModule,
    ConfigModule.forRoot({
      envFilePath: !ENV?'env/.env':`env/.env.${ENV}`,
      isGlobal: true,
      load:[appConfig,databaseConfig],
      validationSchema: envValidation,
    }),
    I18nModule.forRoot({
      fallbackLanguage: 'en',
      loaderOptions: {
        path: path.join(import.meta.dirname, 'i18n'),
        watch: true,
      },
      resolvers: [AcceptLanguageResolver],
    })
    , TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: configService.getOrThrow<'postgres'>('database.type'),
        autoLoadEntities: configService.getOrThrow<boolean>('database.autoLoadEntities'),
        synchronize: configService.getOrThrow<boolean>('database.synchronize'),
        host: configService.getOrThrow<string>('database.host'),
        port: +configService.getOrThrow<string>('database.port'),
        username: configService.getOrThrow<string>('database.username'),
        password: configService.getOrThrow<string>('database.password'),
        database: configService.getOrThrow<string>('database.database')
      })
    }), ProfileModule, HashtagModule, PaginationModule],
  controllers: [AppController],
  providers: [
    AppService,
    LoggerMiddleware,
    AuthMiddleware,
    { provide: APP_FILTER, useClass: I18nValidationExceptionFilter },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(LoggerMiddleware, AuthMiddleware).forRoutes('*');
  }
}
