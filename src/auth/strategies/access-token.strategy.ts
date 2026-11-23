import { Inject, Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import type { ConfigType } from '@nestjs/config';
import authConfig from '../config/auth.config.js';
import type { ActiveUserData } from '../interfaces/active-user-data.interface.js';

@Injectable()
export class AccessTokenStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    @Inject(authConfig.KEY)
    private readonly authConfiguration: ConfigType<typeof authConfig>,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: authConfiguration.secret!,
      audience: authConfiguration.audience,
      issuer: authConfiguration.issuer,
      ignoreExpiration: false,
    });
  }

  validate(payload: ActiveUserData): ActiveUserData {
    return payload;
  }
}
