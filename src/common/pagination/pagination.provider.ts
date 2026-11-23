import { Inject, Injectable } from '@nestjs/common';
import { PaginationQueryDto } from './dto/pagination-query.dto.js';
import { REQUEST } from '@nestjs/core';
import { Request } from 'express';
import type { FindManyOptions, FindOptionsWhere, ObjectLiteral, Repository } from 'typeorm';
import type { Paginated } from './paginated.interface.js';

@Injectable()
export class PaginationProvider {
    constructor(
    ){}


    public async paginateQuery<T extends ObjectLiteral>(
        { page = 1, limit = 10 }: PaginationQueryDto,
        repository: Repository<T>,
        path: string,
        options: Omit<FindManyOptions<T>, 'skip' | 'take' | 'where'>,
        where?: FindOptionsWhere<T> | FindOptionsWhere<T>[],
        linkFilters: Record<string, string> = {},
    ): Promise<Paginated<T>> {

        const [data, totalItems] = await repository.findAndCount({
            ...options,
            where,
            skip: (page - 1) * limit,
            take: limit,
        });
        const totalPages = Math.ceil(totalItems / limit);
        const link = (target: number) => {
            const query = new URLSearchParams({ page: String(target), limit: String(limit), ...linkFilters });
            return `${path}?${query}`;
        };
        return {
            data,
            meta: { itemsPerPage: limit, totalItems, currentPage: page, totalPages },
            links: {
                first: link(1),
                last: link(Math.max(1, totalPages)),
                current: link(page),
                next: page < totalPages ? link(page + 1) : '',
                previous: page > 1 && totalPages ? link(Math.min(page - 1, totalPages)) : '',
            },
        };
    }
}
