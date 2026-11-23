import { Inject, Injectable, NestMiddleware } from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { NextFunction, Request, Response } from 'express';
import authConfig from '../../auth/config/auth.config.js';
import { REQUEST_USER_KEY } from '../../auth/constants/auth.constants.js';

/**
 * Parses the Bearer token and attaches the verified payload to request.user
 * when present. Never rejects — guards decide whether a route requires auth.
 * Runs before guards, so request.user is available early in the pipeline.
 */
@Injectable()
export class AuthMiddleware implements NestMiddleware {
  constructor(
    private readonly jwtService: JwtService,

    @Inject(authConfig.KEY)
    private readonly authConfiguration: ConfigType<typeof authConfig>,
  ) {}

  async use(req: Request, _res: Response, next: NextFunction) {
    const [type, token] = req.headers.authorization?.split(' ') ?? [];

    if (type === 'Bearer' && token) {
      try {
        (req as Request & Record<string, unknown>)[REQUEST_USER_KEY] =
          await this.jwtService.verifyAsync(token, {
            secret: this.authConfiguration.secret,
          });
      } catch {
        // invalid/expired token — left unattached, guards enforce auth
      }
    }

    next();
  }
}
