import { Inject, Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import type { ConfigType } from '@nestjs/config';
import type { Request } from 'express';
import authConfig from '../config/auth.config.js';
import type { ActiveUserData } from '../interfaces/active-user-data.interface.js';

@Injectable()
export class RefreshTokenStrategy extends PassportStrategy(Strategy, 'jwt-refresh') {
  constructor(
    @Inject(authConfig.KEY)
    private readonly authConfiguration: ConfigType<typeof authConfig>,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromBodyField('refreshToken'),
      secretOrKey: authConfiguration.secret!,
      audience: authConfiguration.audience,
      issuer: authConfiguration.issuer,
      ignoreExpiration: false,
      passReqToCallback: true,
    });
  }

  validate(req: Request, payload: Pick<ActiveUserData, 'sub'>) {
    const refreshToken = req.body?.refreshToken;
    return { ...payload, refreshToken };
  }
}
