import { IntersectionType, PartialType, PickType } from '@nestjs/mapped-types';
import { PaginationQueryDto } from '../../common/pagination/dto/pagination-query.dto.js';
import { CreateUserDto } from './create-user.dto.js';

class UserFiltersDto extends PartialType(
  PickType(CreateUserDto, ['firstName', 'lastName', 'email', 'gender'] as const),
) {}

export class GetUserQueryDto extends IntersectionType(PaginationQueryDto, UserFiltersDto) {}
