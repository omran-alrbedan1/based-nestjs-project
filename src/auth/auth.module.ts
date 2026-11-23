import { forwardRef, Module } from '@nestjs/common';
import { AuthService } from './auth.service.js';
import { AuthController } from './auth.controller.js';
import { UsersModule } from '../users/users.module.js';
import { ConfigModule } from '@nestjs/config';
import { HashingProvider } from './provider/hashing.provider.js';
import { BcryptProvider } from './provider/bcrypt.provider.js';
import authConfig from './config/auth.config.js';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthorizeGuard } from './guards/authorize.guard.js';
import { RefreshTokenGuard } from './guards/refresh-token.guard.js';
import { AccessTokenStrategy } from './strategies/access-token.strategy.js';
import { RefreshTokenStrategy } from './strategies/refresh-token.strategy.js';

@Module({
  imports: [
    forwardRef(() => UsersModule),
    ConfigModule.forFeature(authConfig),
    JwtModule.registerAsync(authConfig.asProvider()),
    PassportModule
  ],
  controllers: [AuthController],
  providers: [AuthService, {
    provide:HashingProvider,
    useClass: BcryptProvider
  }, BcryptProvider, AuthorizeGuard, RefreshTokenGuard, AccessTokenStrategy, RefreshTokenStrategy],
  exports: [AuthService, HashingProvider, AuthorizeGuard, RefreshTokenGuard, JwtModule, ConfigModule],
})
export class AuthModule { }
