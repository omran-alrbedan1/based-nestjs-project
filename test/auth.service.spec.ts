import { UnauthorizedException } from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import { describe, expect, it, vi } from 'vitest';
import { AuthService } from '../src/auth/auth.service.js';
import authConfig from '../src/auth/config/auth.config.js';
import type { HashingProvider } from '../src/auth/provider/hashing.provider.js';
import type { UsersService } from '../src/users/users.service.js';
import type { User } from '../src/users/entities/user.entity.js';

function createAuthService() {
  const user = {
    id: 7,
    email: 'user@example.com',
    password: 'password-hash',
    refreshToken: null,
  } as User;
  const usersService = {
    findByEmail: vi.fn().mockResolvedValue(user),
    findOneForAuth: vi.fn().mockResolvedValue(user),
    setRefreshToken: vi.fn().mockResolvedValue(undefined),
  };
  const hashingProvider = {
    comparePassword: vi.fn().mockResolvedValue(true),
    hashPassword: vi.fn(async (value: string) => `hashed:${value}`),
  };
  const jwtService = {
    signAsync: vi.fn()
      .mockResolvedValueOnce('access-token')
      .mockResolvedValueOnce('refresh-token'),
  };
  const service = new AuthService(
    usersService as unknown as UsersService,
    {
      secret: 'test-secret',
      expiresIn: 3600,
      refreshTokenExpiresIn: 86400,
      audience: undefined,
      issuer: undefined,
    } as ConfigType<typeof authConfig>,
    hashingProvider as HashingProvider,
    jwtService as never,
  );

  return { service, user, usersService, hashingProvider, jwtService };
}

describe('AuthService', () => {
  it('authenticates credentials, returns a token pair, and stores a hashed refresh token', async () => {
    const { service, usersService, hashingProvider } = createAuthService();

    const result = await service.login({
      email: 'user@example.com',
      password: 'plain-password',
    });

    expect(result).toEqual({
      user: expect.objectContaining({ id: 7, email: 'user@example.com' }),
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
    });
    expect(result.user).not.toHaveProperty('password');
    expect(result.user).not.toHaveProperty('refreshToken');
    expect(hashingProvider.comparePassword).toHaveBeenCalledWith('plain-password', 'password-hash');
    expect(hashingProvider.hashPassword).toHaveBeenCalledWith('refresh-token');
    expect(usersService.setRefreshToken).toHaveBeenCalledWith(7, 'hashed:refresh-token');
  });

  it('rejects invalid credentials without signing tokens', async () => {
    const { service, user, jwtService, hashingProvider } = createAuthService();
    hashingProvider.comparePassword = vi.fn().mockResolvedValue(false);

    await expect(service.login({
      email: user.email,
      password: 'wrong-password',
    })).rejects.toBeInstanceOf(UnauthorizedException);
    expect(jwtService.signAsync).not.toHaveBeenCalled();
  });

  it('rotates the refresh token and rejects a token that does not match the stored hash', async () => {
    const { service, user, usersService, hashingProvider } = createAuthService();
    user.refreshToken = 'hashed:old-refresh-token';
    hashingProvider.comparePassword = vi.fn()
      .mockResolvedValueOnce(true)
      .mockResolvedValueOnce(false);

    await service.refreshTokens({ sub: user.id, refreshToken: 'old-refresh-token' });
    expect(usersService.setRefreshToken).toHaveBeenCalledWith(user.id, 'hashed:refresh-token');

    await expect(service.refreshTokens({ sub: user.id, refreshToken: 'replayed-token' }))
      .rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('invalidates the refresh token on logout', async () => {
    const { service, usersService } = createAuthService();

    await service.logout({ sub: 7 });

    expect(usersService.setRefreshToken).toHaveBeenCalledWith(7, null);
  });
});
