import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersService } from './users.service.js';
import { UsersController } from './users.controller.js';
import { UsersRepository } from './users.repository.js';
import { AuthModule } from '../auth/auth.module.js';
import { User } from './entities/user.entity.js';
import { Profile } from '../profile/entities/profile.entity.js';
import { PaginationModule } from '../common/pagination/pagination.module.js';
import { APP_GUARD } from '@nestjs/core';
import { AuthorizeGuard } from '../auth/guards/authorize.guard.js';

@Module({
  controllers: [UsersController],
  providers: [UsersService, UsersRepository,
  ],
  exports: [UsersService],
  imports: [forwardRef(() => AuthModule), PaginationModule, TypeOrmModule.forFeature([User, Profile])],
})
export class UsersModule { }
