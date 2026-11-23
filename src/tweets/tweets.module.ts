import { Module } from '@nestjs/common';
import { TweetsService } from './tweets.service.js';
import { TweetsController } from './tweets.controller.js';
import { Tweet } from './entities/tweet.entity.js';
import { User } from '../users/entities/user.entity.js';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersModule } from '../users/users.module.js';
import { HashtagModule } from '../hashtag/hashtag.module.js';
import { PaginationModule } from '../common/pagination/pagination.module.js';
import { AuthModule } from '../auth/auth.module.js';

@Module({
  controllers: [TweetsController],
  providers: [TweetsService],
  imports: [UsersModule, HashtagModule, PaginationModule, AuthModule, TypeOrmModule.forFeature([Tweet, User])],
})
export class TweetsModule {}
