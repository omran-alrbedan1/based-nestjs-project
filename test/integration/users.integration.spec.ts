import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { describe, expect, it, vi } from 'vitest';
import { HashingProvider } from '../src/auth/provider/hashing.provider.js';
import { PaginationProvider } from '../src/common/pagination/pagination.provider.js';
import { Profile } from '../src/profile/entities/profile.entity.js';
import { User } from '../src/users/entities/user.entity.js';
import { UsersService } from '../src/users/users.service.js';

describe('UsersService module integration', () => {
  it('resolves through Nest DI and hashes credentials before persistence', async () => {
    const profileRepository = {
      create: vi.fn((profile: object) => ({ ...profile })),
    };
    const usersRepository = {
      findOneBy: vi.fn().mockResolvedValue(null),
      create: vi.fn((user: object) => ({ ...user })),
      save: vi.fn(async (user: object) => ({ id: 12, ...user })),
    };
    const hashingProvider = {
      hashPassword: vi.fn(async (password: string) => `hashed:${password}`),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        UsersService,
        PaginationProvider,
        { provide: getRepositoryToken(User), useValue: usersRepository },
        { provide: getRepositoryToken(Profile), useValue: profileRepository },
        { provide: HashingProvider, useValue: hashingProvider },
      ],
    }).compile();

    const service = moduleRef.get(UsersService);
    const result = await service.create({
      firstName: 'Test',
      lastName: 'User',
      email: 'test@example.com',
      gender: 'unspecified',
      password: 'plain-password',
    });

    const savedUser = usersRepository.save.mock.calls[0][0] as User;
    expect(hashingProvider.hashPassword).toHaveBeenCalledWith('plain-password');
    expect(savedUser.password).toBe('hashed:plain-password');
    expect(savedUser.profile?.user).toBe(savedUser);
    expect(result).toMatchObject({ id: 12, email: 'test@example.com' });
    expect(result).not.toHaveProperty('password');
    expect(result).not.toHaveProperty('refreshToken');

    await moduleRef.close();
  });
});
