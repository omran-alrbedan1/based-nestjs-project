import { BadRequestException, ValidationPipe } from '@nestjs/common';
import { IsNull, type Repository } from 'typeorm';
import { expect, it, vi } from 'vitest';
import { PaginationProvider } from '../src/common/pagination/pagination.provider.js';
import type { Profile } from '../src/profile/entities/profile.entity.js';
import type { User } from '../src/users/entities/user.entity.js';
import { UsersController } from '../src/users/users.controller.js';
import type { HashingProvider } from '../src/auth/provider/hashing.provider.js';
import { UsersService } from '../src/users/users.service.js';
import { GetUserQueryDto } from '../src/users/dto/get-user-query.dto.js';

const pipe = new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true });
const metadata = { type: 'query' as const, metatype: GetUserQueryDto };

it('paginates active users with profiles and generates user list links', async () => {
  const findAndCount = vi.fn().mockResolvedValue([[{ id: 7, profile: {} }], 12]);
  const users = new UsersService(
    { findAndCount } as unknown as Repository<User>,
    {} as Repository<Profile>,
    new PaginationProvider(),
    {} as HashingProvider,
  );
  const result = await new UsersController(users).findAll({ page: 2, limit: 5 });
  expect(findAndCount).toHaveBeenCalledWith(expect.objectContaining({
    skip: 5, take: 5, where: { deletedAt: IsNull() }, order: { id: 'DESC' },
  }));
  expect(result).toMatchObject({
    data: [{ id: 7, profile: {} }],
    meta: { currentPage: 2, totalPages: 3, itemsPerPage: 5, totalItems: 12 },
    links: { current: '/users?page=2&limit=5', next: '/users?page=3&limit=5' },
  });
});

it('applies validated filters to the count and keeps them in the next link', async () => {
  const findAndCount = vi.fn().mockResolvedValue([[], 12]);
  const users = new UsersService({ findAndCount } as unknown as Repository<User>,
    {} as Repository<Profile>, new PaginationProvider(), {} as HashingProvider);
  const filters = { firstName: 'Sara', email: 'sara+test@example.com' };
  const query = await pipe.transform({ ...filters, limit: '5' }, metadata);
  const page = await users.findAll(query);
  expect(findAndCount).toHaveBeenCalledWith(expect.objectContaining({
    where: { ...filters, deletedAt: IsNull() }, take: 5,
  }));
  expect(page.links.next).toBe('/users?page=2&limit=5&firstName=Sara&email=sara%2Btest%40example.com');
});

it.each([{ email: 'invalid' }, { password: 'not-a-filter' }, { limit: '0' }])(
  'rejects invalid user query %j', async query => {
    await expect(pipe.transform(query, metadata)).rejects.toBeInstanceOf(BadRequestException);
  },
);
