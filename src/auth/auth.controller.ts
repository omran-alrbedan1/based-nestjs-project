import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service.js';
import { CreateUserDto } from '../users/dto/create-user.dto.js';
import { LoginDto } from './dto/login.dto.js';
import { RefreshTokenDto } from './dto/refresh-token.dto.js';
import { Message } from '../core/decorators/message.decorator.js';
import { AllowAnonymous } from './decorators/allow-anonymous.decorator.js';
import { AuthorizeGuard } from './guards/authorize.guard.js';
import { RefreshTokenGuard } from './guards/refresh-token.guard.js';
import { ActiveUser } from './decorators/active-user.decorator.js';
import type { ActiveUserData } from './interfaces/active-user-data.interface.js';

@Controller('auth')
@UseGuards(AuthorizeGuard)
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @AllowAnonymous()
  @Post('signup')
  @Message('auth.signup_success')
  async signup(@Body() createUserDto: CreateUserDto) {
    return await this.authService.signup(createUserDto);
  }

  @AllowAnonymous()
  @Post('login')
  @Message('auth.login_success')
  async login(@Body() loginDto: LoginDto) {
    return await this.authService.login(loginDto);
  }

  @AllowAnonymous()
  @Post('refresh')
  @UseGuards(RefreshTokenGuard)
  @Message('auth.tokens_refreshed')
  async refreshTokens(@Body() refreshTokenDto: RefreshTokenDto, @ActiveUser() user: Pick<ActiveUserData, 'sub'> & { refreshToken: string }) {
    return await this.authService.refreshTokens(user);
  }

  @Post('logout')
  @Message('auth.logout_success')
  async logout(@ActiveUser() user: Pick<ActiveUserData, 'sub'>) {
    return await this.authService.logout(user);
  }
}
