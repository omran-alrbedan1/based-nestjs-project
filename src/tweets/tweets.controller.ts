import { Controller, Get, Post, Body, Patch, Param, Delete, ParseIntPipe, Query, UseGuards } from '@nestjs/common';
import { TweetsService } from './tweets.service.js';
import { CreateTweetDto } from './dto/create-tweet.dto.js';
import { UpdateTweetDto } from './dto/update-tweet.dto.js';
import { PaginationQueryDto } from '../common/pagination/dto/pagination-query.dto.js';
import { GetTweetQueryDto } from './dto/get-tweet-query.dto.js';
import { AuthorizeGuard } from '../auth/guards/authorize.guard.js';
import { ActiveUser } from '../auth/decorators/active-user.decorator.js';
import type { ActiveUserData } from '../auth/interfaces/active-user-data.interface.js';

@Controller('tweets')
export class TweetsController {
  constructor(private readonly  tweetsService: TweetsService) { }

  @Post()
  @UseGuards(AuthorizeGuard)
  create(@Body() createTweetDto: CreateTweetDto, @ActiveUser() user: ActiveUserData) {
    return this.tweetsService.create(createTweetDto, user.sub);
  }

  @Get()
  findAll(@Query() pagination: PaginationQueryDto) {
    return this.tweetsService.findAll(pagination);
  }

  @Get(':userId')
  findOne(
    @Param('userId', ParseIntPipe) userId: number,
    @Query() getTweetQueryDto: GetTweetQueryDto
  ) {
    return this.tweetsService.findOne(userId, getTweetQueryDto);
  }

  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() updateTweetDto: UpdateTweetDto) {
    return this.tweetsService.update(id, updateTweetDto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.tweetsService.remove(id);
  }
}
