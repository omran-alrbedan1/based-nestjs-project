import { NotFoundException, type ExecutionContext } from '@nestjs/common';
import { lastValueFrom, throwError } from 'rxjs';
import { QueryFailedError } from 'typeorm';
import { describe, expect, it } from 'vitest';
import { DatabaseConnectionInterceptor } from '../src/core/interceptors/database-connection.interceptor.js';

function handle(error: Error) {
  return lastValueFrom(new DatabaseConnectionInterceptor().intercept({} as ExecutionContext, {
    handle: () => throwError(() => error),
  }));
}

function queryFailure(code: string) {
  return new QueryFailedError('SELECT 1', [], Object.assign(new Error('driver details'), { code }));
}

describe('database connection exceptions', () => {
  it.each([
    Object.assign(new Error('socket failure'), { code: 'ECONNREFUSED' }),
    queryFailure('08006'),
    new Error('timeout exceeded when trying to connect'),
  ])('returns a sanitized 503 for a connection failure', async error => {
    await expect(handle(error)).rejects.toMatchObject({
      response: { statusCode: 503, message: 'Database temporarily unavailable' },
      cause: error,
    });
  });

  it.each([new NotFoundException(), queryFailure('23505'), new Error('unexpected')])(
    'preserves non-connection exceptions', async error => {
      await expect(handle(error)).rejects.toBe(error);
    },
  );
});
