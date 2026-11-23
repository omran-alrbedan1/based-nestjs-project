import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { LoginDto } from './dto/login.dto.js';
import { UsersService } from '../users/users.service.js';
import authConfig from './config/auth.config.js';
import type { ConfigType } from '@nestjs/config';
import { CreateUserDto } from '../users/dto/create-user.dto.js';
import { HashingProvider } from './provider/hashing.provider.js';
import { JwtService } from '@nestjs/jwt';
import { I18nContext } from 'nestjs-i18n';
import { User } from '../users/entities/user.entity.js';
import type { ActiveUserData } from './interfaces/active-user-data.interface.js';

@Injectable()
export class AuthService {
  isAuthenticated = true;

  constructor(
    @Inject(UsersService)
    private readonly usersService: UsersService,

    // partial registration
    @Inject(authConfig.KEY)
    private readonly authConfiguration: ConfigType<typeof authConfig>,

    private readonly hashingProvider: HashingProvider,

    private readonly jwtService: JwtService,
  ) { }

  public async login(loginDto: LoginDto) {
    // 1- find the user with the email 
    const user = await this.usersService.findByEmail(loginDto.email);
    if (!user) throw new UnauthorizedException(this.translate('auth.invalid_credentials'));

    // 2- if the user is avaliable compare the password 
    const isValid = await this.hashingProvider.comparePassword(loginDto.password, user.password);
    if (!isValid) throw new UnauthorizedException(this.translate('auth.incorrect_password'));

    // 3- the password pass , login successfully
    const { password, refreshToken: _storedToken, ...userWithoutPassword } = user;

    const tokens = await this.generateTokens(user);
    await this.updateRefreshTokenHash(user.id, tokens.refreshToken);

    return {
      user: userWithoutPassword,
      ...tokens,
    };
  }

  public async signup(createUserDto: CreateUserDto) {
    return await this.usersService.create(createUserDto)
  }

  private async signToken<T>(userId: number, expiresIn: number, payload?: T) {
    return await this.jwtService.signAsync(
      { sub: userId, ...payload },
      {
        secret: this.authConfiguration.secret,
        expiresIn,
        audience: this.authConfiguration.audience,
        issuer: this.authConfiguration.issuer,
      },
    );
  }

  public async generateTokens(user: User) {
    const [accessToken, refreshToken] = await Promise.all([
      this.signToken<Partial<ActiveUserData>>(
        user.id,
        this.authConfiguration.expiresIn,
        { email: user.email },
      ),
      this.signToken(user.id, this.authConfiguration.refreshTokenExpiresIn),
    ]);

    return {
      accessToken,
      refreshToken,
    };
  }

  public async refreshTokens(user: Pick<ActiveUserData, 'sub'> & { refreshToken: string }) {
    try {
      // 1- fetch the user from the database (signature already verified by RefreshTokenGuard)
      const dbUser = await this.usersService.findOneForAuth(user.sub);
      if (!dbUser.refreshToken) throw new UnauthorizedException();

      // 2- compare the presented token with the stored hash
      const isValid = await this.hashingProvider.comparePassword(user.refreshToken, dbUser.refreshToken);
      if (!isValid) throw new UnauthorizedException();

      // 3- mint a fresh pair and rotate the stored hash
      const tokens = await this.generateTokens(dbUser);
      await this.updateRefreshTokenHash(dbUser.id, tokens.refreshToken);
      return tokens;
    } catch {
      throw new UnauthorizedException(this.translate('auth.unauthorized'));
    }
  }

  public async logout(user: Pick<ActiveUserData, 'sub'>) {
    await this.usersService.setRefreshToken(user.sub, null);
  }

  private async updateRefreshTokenHash(userId: number, refreshToken: string) {
    const hashed = await this.hashingProvider.hashPassword(refreshToken);
    await this.usersService.setRefreshToken(userId, hashed);
  }

  private translate(key: string): string {
    try {
      return I18nContext.current()?.t(key) ?? key;
    } catch {
      return key;
    }
  }

}
