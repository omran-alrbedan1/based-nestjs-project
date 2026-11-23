import { ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { TypeOrmModule, getRepositoryToken } from '@nestjs/typeorm';
import type { INestApplication } from '@nestjs/common';
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { Repository } from 'typeorm';
import { CoreModule } from '../src/core/core.module.js';
import { AuthorizeGuard } from '../src/auth/guards/authorize.guard.js';
import { HashingProvider } from '../src/auth/provider/hashing.provider.js';
import { PaginationProvider } from '../src/common/pagination/pagination.provider.js';
import { Hashtag } from '../src/hashtag/entities/hashtag.entity.js';
import { Profile } from '../src/profile/entities/profile.entity.js';
import { Tweet } from '../src/tweets/entities/tweet.entity.js';
import { User } from '../src/users/entities/user.entity.js';
import { UsersController } from '../src/users/users.controller.js';
import { UsersService } from '../src/users/users.service.js';

describe('Users API (PostgreSQL e2e)', () => {
  let app: INestApplication<App>;
  let postgres: StartedPostgreSqlContainer;
  let usersRepository: Repository<User>;

  beforeAll(async () => {
    postgres = await new PostgreSqlContainer('postgres:16-alpine').start();

    const moduleRef = await Test.createTestingModule({
      imports: [
        CoreModule,
        TypeOrmModule.forRoot({
          type: 'postgres',
          url: postgres.getConnectionUri(),
          entities: [User, Profile, Tweet, Hashtag],
          synchronize: true,
          dropSchema: true,
        }),
        TypeOrmModule.forFeature([User, Profile]),
      ],
      controllers: [UsersController],
      providers: [
        UsersService,
        PaginationProvider,
        {
          provide: HashingProvider,
          useValue: { hashPassword: async (password: string) => `test-hash:${password}` },
        },
        { provide: AuthorizeGuard, useValue: { canActivate: () => true } },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }));
    await app.init();
    usersRepository = app.get<Repository<User>>(getRepositoryToken(User));
  }, 120_000);

  afterAll(async () => {
    await app?.close();
    await postgres?.stop();
  }, 120_000);

  it('creates a user through HTTP, hashes the password, and never returns secrets', async () => {
    const response = await request(app.getHttpServer())
      .post('/users')
      .send({
        firstName: 'Test',
        lastName: 'User',
        email: 'test.user@example.com',
        gender: 'unspecified',
        password: 'plain-password',
      })
      .expect(201);

    expect(response.body.message).toBe('common.request_success');
    expect(response.body.data).toMatchObject({
      id: expect.any(Number),
      email: 'test.user@example.com',
      profile: expect.objectContaining({ id: expect.any(Number) }),
    });
    expect(response.body.data).not.toHaveProperty('password');
    expect(response.body.data).not.toHaveProperty('refreshToken');

    const persistedUser = await usersRepository.findOneByOrFail({ email: 'test.user@example.com' });
    expect(persistedUser.password).toBe('test-hash:plain-password');
  });

  it('rejects duplicate email with 409', async () => {
    await request(app.getHttpServer())
      .post('/users')
      .send({
        firstName: 'Test',
        lastName: 'User',
        email: 'test.user@example.com',
        gender: 'unspecified',
        password: 'plain-password',
      })
      .expect(409);
  });

  it('rejects unrecognized request properties with 400', async () => {
    await request(app.getHttpServer())
      .post('/users')
      .send({
        firstName: 'Test',
        lastName: 'User',
        email: 'other.user@example.com',
        gender: 'unspecified',
        password: 'plain-password',
        isAdmin: true,
      })
      .expect(400);
  });

  it('does not expose password or refresh token on user lookup', async () => {
    const response = await request(app.getHttpServer())
      .get('/users/1')
      .expect(200);

    expect(response.body.data.email).toBe('test.user@example.com');
    expect(response.body.data).not.toHaveProperty('password');
    expect(response.body.data).not.toHaveProperty('refreshToken');
  });
});
