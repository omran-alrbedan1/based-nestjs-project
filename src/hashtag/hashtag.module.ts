import { Module } from '@nestjs/common';
import { HashtagService } from './hashtag.service.js';
import { HashtagController } from './hashtag.controller.js';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Hashtag } from './entities/hashtag.entity.js';

@Module({
  controllers: [HashtagController],
  providers: [HashtagService],
  exports: [HashtagService],
  imports: [TypeOrmModule.forFeature([Hashtag])],
})
export class HashtagModule {}
