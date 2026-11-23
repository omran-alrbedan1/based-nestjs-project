import { Controller, Get, Post, Body, Patch, Param, Delete, ParseIntPipe, Query, UseGuards, ValidationPipe } from '@nestjs/common';
import { GetUserQueryDto } from './dto/get-user-query.dto.js';
import { Message } from '../core/decorators/message.decorator.js';
import { UsersService } from './users.service.js';
import { CreateUserDto } from './dto/create-user.dto.js';
import { UpdateUserDto } from './dto/update-user.dto.js';
import { AuthorizeGuard } from '../auth/guards/authorize.guard.js';
import { ActiveUser } from '../auth/decorators/active-user.decorator.js';
import type { ActiveUserData } from '../auth/interfaces/active-user-data.interface.js';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  create(@Body(new ValidationPipe()) createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }

  @Get()
  @Message('users.fetch_success')
  findAll(@Query() query: GetUserQueryDto) {
    return this.usersService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id',ParseIntPipe) id: number) {
    return this.usersService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(AuthorizeGuard)
  update(@Param('id', ParseIntPipe) id: number, @Body() updateUserDto: UpdateUserDto, @ActiveUser() user: ActiveUserData) {
    return this.usersService.update(id, updateUserDto);
  }

  @Delete(':id')
  @UseGuards(AuthorizeGuard)
  @Message('users.deleted_success')
  remove(@Param('id',ParseIntPipe) id: number, @ActiveUser() user: ActiveUserData) {
    return this.usersService.remove(id);
  }
}
