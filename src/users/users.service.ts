import { BadRequestException, ConflictException, forwardRef, HttpException, HttpStatus, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto.js';
import { UpdateUserDto } from './dto/update-user.dto.js';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from './entities/user.entity.js';
import { IsNull, QueryFailedError, Repository } from 'typeorm';
import { Profile } from '../profile/entities/profile.entity.js';
import { PaginationProvider } from '../common/pagination/pagination.provider.js';
import type { GetUserQueryDto } from './dto/get-user-query.dto.js';
import { UserAlreadyExistsException } from '../core/exceptions/user-already-exist.exception.js';
import { UserConflictException } from '../core/exceptions/user-conflict.exception.js';
import { HashingProvider } from '../auth/provider/hashing.provider.js';


@Injectable()
export class UsersService {
  constructor(  
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,

    @InjectRepository(Profile)
    private readonly profileRepositary: Repository<Profile>,

    private readonly paginationProvider: PaginationProvider,

    @Inject(forwardRef(() => HashingProvider))
    private readonly hashingProvider: HashingProvider,
  ) {}

  public async create(createUserDto: CreateUserDto) {
    // validate if the email already exists
    const existingUser = await this.usersRepository.findOneBy({ email: createUserDto.email });
    
    if (existingUser) {
      throw new UserAlreadyExistsException('email',createUserDto.email)
    }

    // hash the password before saving :
    createUserDto.password = await this.hashingProvider.hashPassword(createUserDto.password);

    const profileDto = createUserDto.profile ?? {};
    const user = this.usersRepository.create(createUserDto);
    const profile = this.profileRepositary.create(profileDto);
    profile.user = user;
    user.profile = profile;

    // Save both sides of the relation through the User cascade.
    return this.saveUser(user);
  }

  public async findAll(query: GetUserQueryDto = {}) {
    const filters: Partial<Pick<User, 'firstName' | 'lastName' | 'email' | 'gender'>> = {};
    for (const key of ['firstName', 'lastName', 'email', 'gender'] as const) {
      if (query[key] !== undefined) filters[key] = query[key];
    }
    return this.paginationProvider.paginateQuery(query, this.usersRepository, '/users', {
      select: { id: true, firstName: true, lastName: true, email: true, gender: true, createdAt: true, updatedAt: true },
      order: { id: 'DESC' },
    }, { ...filters, deletedAt: IsNull() }, filters);
  }

  public async findOne(id: number) {
    const user = await this.findOneForAuth(id);
    return this.toPublicUser(user);
  }

  public async findOneForAuth(id: number) {
    const user = await this.usersRepository.findOneBy({ id });
    if (!user) throw new NotFoundException(`User #${id} not found`);
    return user;
  }

  public async findByEmail(email: string) {
    return this.usersRepository.findOneBy({ email });
  }

  public async setRefreshToken(userId: number, refreshToken: string | null) {
    await this.usersRepository.update(userId, { refreshToken });
  }
              
  public async update(id: number, updateUserDto: UpdateUserDto) {
    const user = await this.findOneForAuth(id);
    Object.assign(user, updateUserDto);
    return this.saveUser(user);
  }

  private async saveUser(user: User) {
    try {
      const savedUser = await this.usersRepository.save(user);
      return this.toPublicUser(savedUser);
    } catch (error) {
      if (error instanceof QueryFailedError && error.driverError.code === '23505') {
        throw new UserConflictException();
      }
      throw error;
    }
  }

  private toPublicUser(user: User) {
    const { password: _password, refreshToken: _refreshToken, ...publicUser } = user;
    return publicUser;
  }

  public async remove(id: number) {
    const result = await this.usersRepository.delete(id);
    if (!result.affected) throw new NotFoundException(`User #${id} not found`);

    // send a response ;
    return { deleted: true };
  }
}
