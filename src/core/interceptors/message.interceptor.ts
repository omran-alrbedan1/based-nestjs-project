import { Injectable, type CallHandler, type ExecutionContext, type NestInterceptor } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { I18nContext } from 'nestjs-i18n';
import { map } from 'rxjs';
import { MESSAGE_KEY } from '../decorators/message.decorator.js';

@Injectable()
export class MessageInterceptor implements NestInterceptor {
  constructor(private readonly reflector: Reflector) {}

  intercept(context: ExecutionContext, next: CallHandler) {
    const key = this.reflector.get<string>(MESSAGE_KEY, context.getHandler()) ?? 'common.request_success';
    let message = key;
    try {
      message = I18nContext.current()?.t(key) ?? key;
    } catch {
      // keep the key when no i18n context is available
    }
    return next.handle().pipe(map((data: unknown) => ({ message, data: data ?? null })));
  }
}
