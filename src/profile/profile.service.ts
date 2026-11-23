import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateProfileDto } from './dto/create-profile.dto.js';
import { UpdateProfileDto } from './dto/update-profile.dto.js';
import { Profile } from './entities/profile.entity.js';

@Injectable()
export class ProfileService {
  constructor(
    @InjectRepository(Profile)
    private readonly profileRepository: Repository<Profile>,
  ) {}

  public async create(createProfileDto: CreateProfileDto) {
    const profile = this.profileRepository.create(createProfileDto);
    return await this.profileRepository.save(profile);
  }

  public async findAll() {
    return this.profileRepository.find({
      relations:{
        user:true
      }
    });
  }

  public async findOne(id: number) {
    const profile = await this.profileRepository.findOneBy({ id });
    if (!profile) throw new NotFoundException(`Profile #${id} not found`);
    return profile;
  }

  public async update(id: number, updateProfileDto: UpdateProfileDto) {
    const profile = await this.findOne(id);
    Object.assign(profile, updateProfileDto);
    return this.profileRepository.save(profile);
  }

  public async remove(id: number) {
    const result = await this.profileRepository.delete(id);
    if (!result.affected) throw new NotFoundException(`Profile #${id} not found`);
    return { deleted: true };
  }
}
