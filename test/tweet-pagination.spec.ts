import 'reflect-metadata';
import { BadRequestException, ValidationPipe } from '@nestjs/common';
import type { Repository } from 'typeorm';
import { describe, expect, it, vi } from 'vitest';
import { PaginationQueryDto } from '../src/common/pagination/dto/pagination-query.dto.js';
import { PaginationProvider } from '../src/common/pagination/pagination.provider.js';
import type { HashtagService } from '../src/hashtag/hashtag.service.js';
import { GetTweetQueryDto } from '../src/tweets/dto/get-tweet-query.dto.js';
import type { Tweet } from '../src/tweets/entities/tweet.entity.js';
import { TweetsService } from '../src/tweets/tweets.service.js';
import type { User } from '../src/users/entities/user.entity.js';

const pipe = new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true });

describe('tweet pagination', () => {
  it('uses defaults and preserves the author filter when requesting a later page', async () => {
    const findAndCount = vi.fn().mockResolvedValueOnce([[], 0]).mockResolvedValueOnce([[{ id: 8 }], 14]);
    const service = new TweetsService(
      { findAndCount } as unknown as Repository<Tweet>,
      { findOneBy: vi.fn().mockResolvedValue({ id: 5 }) } as unknown as Repository<User>,
      {} as HashtagService,
      new PaginationProvider(),
    );
    const empty = await service.findAll({});
    expect(empty).toMatchObject({
      data: [], meta: { totalItems: 0, totalPages: 0 },
      links: { current: '/tweets?page=1&limit=10', previous: '', next: '' },
    });
    expect(findAndCount).toHaveBeenCalledWith({ skip: 0, take: 10, order: { id: 'DESC' } });

    const query = await pipe.transform({ page: '3', limit: '4' }, { type: 'query', metatype: GetTweetQueryDto });
    const result = await service.findOne(5, query);
    expect(result).toEqual({
      data: [{ id: 8 }],
      meta: { itemsPerPage: 4, totalItems: 14, currentPage: 3, totalPages: 4 },
      links: {
        first: '/tweets/5?page=1&limit=4', last: '/tweets/5?page=4&limit=4',
        current: '/tweets/5?page=3&limit=4', next: '/tweets/5?page=4&limit=4',
        previous: '/tweets/5?page=2&limit=4',
      },
    });
    expect(findAndCount).toHaveBeenLastCalledWith(expect.objectContaining({
      skip: 8, take: 4, order: { id: 'DESC' }, where: { user: { id: 5 } },
    }));
  });

  it.each([{ page: '0' }, { limit: '2.5' }, { limit: '101' }, { page: 'abc' }])(
    'rejects invalid query %j', async query => {
      await expect(pipe.transform(query, { type: 'query', metatype: PaginationQueryDto }))
        .rejects.toBeInstanceOf(BadRequestException);
    },
  );
});
