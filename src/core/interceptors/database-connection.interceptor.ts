import { HttpException, Injectable, ServiceUnavailableException, type CallHandler, type ExecutionContext, type NestInterceptor } from '@nestjs/common';
import { catchError } from 'rxjs';
import { QueryFailedError } from 'typeorm';

const connectionCodes = new Set([
  'ECONNREFUSED', 'ECONNRESET', 'ETIMEDOUT', 'EPIPE', 'EHOSTUNREACH',
  'ENETUNREACH', 'ENOTFOUND', 'EAI_AGAIN',
  '53300', '57P01', '57P02', '57P03',
]);

function isConnectionError(error: unknown): boolean {
  if (!(error instanceof Error) || error instanceof HttpException) return false;
  const driver = error instanceof QueryFailedError ? error.driverError : error;
  if ('code' in driver && typeof driver.code === 'string') {
    // PostgreSQL SQLSTATE class 08 denotes a connection exception.
    return /^08[A-Z0-9]{3}$/.test(driver.code) || connectionCodes.has(driver.code);
  }
  // pg and pg-pool emit these errors without a SQLSTATE or socket code.
  return driver.message === 'Connection terminated unexpectedly'
    || driver.message === 'Connection terminated due to connection timeout'
    || driver.message === 'timeout exceeded when trying to connect';
}

@Injectable()
export class DatabaseConnectionInterceptor implements NestInterceptor {
  intercept(_context: ExecutionContext, next: CallHandler) {
    return next.handle().pipe(catchError((error: unknown) => {
      if (isConnectionError(error)) {
        throw new ServiceUnavailableException('Database temporarily unavailable', { cause: error });
      }
      throw error;
    }));
  }
}
