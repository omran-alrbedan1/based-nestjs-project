import { createParamDecorator } from '@nestjs/common';
import type { ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';
import { REQUEST_USER_KEY } from '../constants/auth.constants.js';
import type { ActiveUserData } from '../interfaces/active-user-data.interface.js';

export const ActiveUser = createParamDecorator(
  (field: keyof ActiveUserData | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<Request & Record<string, unknown>>();
    const user = request[REQUEST_USER_KEY] as ActiveUserData | undefined;
    return field ? user?.[field] : user;
  },
);
