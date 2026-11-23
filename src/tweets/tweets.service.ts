import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateTweetDto } from './dto/create-tweet.dto.js';
import { UpdateTweetDto } from './dto/update-tweet.dto.js';
import { Tweet } from './entities/tweet.entity.js';
import { User } from '../users/entities/user.entity.js';
import { HashtagService } from '../hashtag/hashtag.service.js';
import { PaginationProvider } from '../common/pagination/pagination.provider.js';
import { PaginationQueryDto } from '../common/pagination/dto/pagination-query.dto.js';
import { GetTweetQueryDto } from './dto/get-tweet-query.dto.js';

@Injectable()
export class TweetsService {
  constructor(
    @InjectRepository(Tweet)
    private readonly tweetsRepository: Repository<Tweet>,

    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,

    private readonly hashtagService: HashtagService,
    private readonly paginationProvider: PaginationProvider,
  ) { }

  public async create(createTweetDto: CreateTweetDto, userId: number) {
    // find the user who is creating the tweet :
    const user = await this.usersRepository.findOneBy({ id: userId });
    if (!user) throw new NotFoundException(`User #${userId} not found`);

    // find the hashtags with the given ids :
    const hashtags = await this.hashtagService.findHashtags(createTweetDto.hashtag || []);

    // create the tweet and link it to the user and hashtags :
    const tweet = this.tweetsRepository.create(createTweetDto);
    tweet.user = user;
    tweet.hashtags = hashtags;

    // save the tweet to the database :
    return await this.tweetsRepository.save(tweet);
  }

  public async findAll(pagination: PaginationQueryDto = {}) {
    return this.paginationProvider.paginateQuery(pagination, this.tweetsRepository, '/tweets', {
      order: { id: 'DESC' },
    });
  }

  public async findOne(userId: number, getTweetQueryDto: GetTweetQueryDto) {
    // return all tweets created by the given user :
    const user = await this.usersRepository.findOneBy({ id: userId });
    if (!user) throw new NotFoundException(`User #${userId} not found`);

    return this.paginationProvider.paginateQuery(getTweetQueryDto, this.tweetsRepository, `/tweets/${userId}`, {
      relations: {
        user: true,
        hashtags: true
      },
      order: { id: 'DESC' },
    }, { user: { id: userId } });
  }

  public async update(id: number, updateTweetDto: UpdateTweetDto) {
    const tweet = await this.tweetsRepository.findOneBy({ id });
    if (!tweet) throw new NotFoundException(`Tweet #${id} not found`);
    Object.assign(tweet, updateTweetDto);
    return this.tweetsRepository.save(tweet);
  }

  public async remove(id: number) {
    const tweet = await this.tweetsRepository.findOneBy({ id });
    if (!tweet) throw new NotFoundException(`Tweet #${id} not found`);
    await this.tweetsRepository.delete(id);
    return { deleted: true };
  }
}
