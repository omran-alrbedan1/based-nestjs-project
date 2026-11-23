import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, IsNull, QueryFailedError, Repository } from 'typeorm';
import { CreateHashtagDto } from './dto/create-hashtag.dto.js';
import { UpdateHashtagDto } from './dto/update-hashtag.dto.js';
import { Hashtag } from './entities/hashtag.entity.js';

@Injectable()
export class HashtagService {
  constructor(
    @InjectRepository(Hashtag)
    private readonly hashtagRepository: Repository<Hashtag>,
  ) {}

  public async create(createHashtagDto: CreateHashtagDto) {
    const hashtag = this.hashtagRepository.create(createHashtagDto);
    return this.saveHashtag(hashtag);
  }

  public async findHashtags(hashtags:number[]) {
    if (!hashtags.length) return [];
    const found = await this.hashtagRepository.find({ where: { id: In(hashtags) } });
    const foundIds = new Set(found.map(tag => tag.id));
    const missing = hashtags.find(id => !foundIds.has(id));
    if (missing !== undefined) throw new NotFoundException(`Hashtag #${missing} not found`);
    return found;
  }

  public async findAll() {
    return this.hashtagRepository.find({ relations: { tweets: true } });
  }

  public async findOne(id: number) {
    const hashtag = await this.hashtagRepository.findOne({
      where: { id },
      relations: { tweets: true },
    });
    if (!hashtag) throw new NotFoundException(`Hashtag #${id} not found`);
    return hashtag;
  }

  public async update(id: number, updateHashtagDto: UpdateHashtagDto) {
    const hashtag = await this.findOne(id);
    Object.assign(hashtag, updateHashtagDto);
    return this.saveHashtag(hashtag);
  }

  public async remove(id: number) {
    const result = await this.hashtagRepository.softDelete({ id, deletedAt: IsNull() });
    if (!result.affected) throw new NotFoundException(`Hashtag #${id} not found`);
    return { deleted: true };
  }
  private async saveHashtag(hashtag: Hashtag) {
    try {
      return await this.hashtagRepository.save(hashtag);
    } catch (error) {
      if (error instanceof QueryFailedError && error.driverError.code === '23505') {
        throw new ConflictException('Hashtag name already exists');
      }
      throw error;
    }
  }
}
