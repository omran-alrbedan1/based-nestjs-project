import { PartialType } from '@nestjs/mapped-types';
import { CreateHashtagDto } from './create-hashtag.dto.js';

export class UpdateHashtagDto extends PartialType(CreateHashtagDto) {}
