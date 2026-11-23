import { Module } from '@nestjs/common';
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { MessageInterceptor } from './interceptors/message.interceptor.js';
import { DatabaseConnectionInterceptor } from './interceptors/database-connection.interceptor.js';
import { LoggingInterceptor } from './interceptors/logging.interceptor.js';
import { TimeoutInterceptor } from './interceptors/timeout.interceptor.js';
import { HttpExceptionFilter } from './filters/http-exception.filter.js';

/**
 * Global plumbing for every route: response envelope, request logging,
 * timeout, DB connection errors, and a consistent error body.
 */
@Module({
  providers: [
    { provide: APP_INTERCEPTOR, useClass: LoggingInterceptor },
    { provide: APP_INTERCEPTOR, useClass: MessageInterceptor },
    { provide: APP_INTERCEPTOR, useClass: DatabaseConnectionInterceptor },
    { provide: APP_INTERCEPTOR, useClass: TimeoutInterceptor },
    { provide: APP_FILTER, useClass: HttpExceptionFilter },
  ],
})
export class CoreModule {}
