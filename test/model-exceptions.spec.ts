import { ConflictException, NotFoundException } from '@nestjs/common';
import { QueryFailedError, type ObjectLiteral, type Repository } from 'typeorm';
import { describe, expect, it, vi } from 'vitest';
import { HashtagService } from '../src/hashtag/hashtag.service.js';
import { ProfileService } from '../src/profile/profile.service.js';
import { TweetsService } from '../src/tweets/tweets.service.js';
import { UsersService } from '../src/users/users.service.js';
import type { HashingProvider } from '../src/auth/provider/hashing.provider.js';
import { PaginationProvider } from '../src/common/pagination/pagination.provider.js';

function repository<T extends ObjectLiteral>(methods: Partial<Repository<T>> = {}) {
  return methods as Repository<T>;
}

describe('model exceptions', () => {
  it('returns not found when a delete affects no rows', async () => {
    const missing = vi.fn().mockResolvedValue({ affected: 0 });
    const tags = new HashtagService(repository({ softDelete: missing }));
    const services = [
      new UsersService(repository({ delete: missing }), repository(), new PaginationProvider(), {} as HashingProvider),
      new ProfileService(repository({ delete: missing })),
      new TweetsService(repository({ findOneBy: vi.fn().mockResolvedValue(null), delete: missing }), repository(), tags, new PaginationProvider()),
      tags,
    ];
    for (const service of services) {
      await expect(service.remove(99)).rejects.toBeInstanceOf(NotFoundException);
    }
  });

  it('rejects a tweet referencing even one unavailable hashtag before saving', async () => {
    const tags = new HashtagService(repository({ find: vi.fn().mockResolvedValue([{ id: 1 }]) }));
    const save = vi.fn();
    const tweets = new TweetsService(repository({ save }), repository({
      findOneBy: vi.fn().mockResolvedValue({ id: 1 }),
    }), tags, new PaginationProvider());
    await expect(tweets.create({ text: 'test', hashtag: [1, 2] }, 1))
      .rejects.toThrow('Hashtag #2 not found');
    expect(save).not.toHaveBeenCalled();
  });

  it('maps a duplicate hashtag to conflict without masking unrelated failures', async () => {
    const duplicate = Object.assign(new Error(), { code: '23505' });
    const unavailable = new Error('database unavailable');
    const save = vi.fn()
      .mockRejectedValueOnce(new QueryFailedError('', [], duplicate))
      .mockRejectedValueOnce(unavailable);
    const tags = new HashtagService(repository({ create: vi.fn(), save }));
    await expect(tags.create({ name: 'nestjs' })).rejects.toBeInstanceOf(ConflictException);
    await expect(tags.create({ name: 'nestjs' })).rejects.toBe(unavailable);
  });
});
