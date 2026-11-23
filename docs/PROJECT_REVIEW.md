# NestJS Architecture & Best Practices Guide

A senior-level architecture standard for NestJS projects. Use this as the foundation when starting any new API — every pattern here is proven in production-style code.

> **Core philosophy:** thin controllers, fat services, explicit contracts, global concerns handled globally, and nothing reaching the client that you didn't deliberately shape.

## Table of Contents

1. [Standard Project Structure](#1-standard-project-structure)
2. [The Request Pipeline](#2-the-request-pipeline)
3. [Module Design](#3-module-design)
4. [Layer Responsibilities](#4-layer-responsibilities)
5. [Data Layer (TypeORM)](#5-data-layer-typeorm)
6. [API Contract — DTOs & Validation](#6-api-contract--dtos--validation)
7. [Response Envelope](#7-response-envelope)
8. [Exception Handling Standard](#8-exception-handling-standard)
9. [Pagination & Filtering](#9-pagination--filtering)
10. [Configuration](#10-configuration)
11. [Authentication & Authorization Blueprint](#11-authentication--authorization-blueprint)
12. [Internationalization](#12-internationalization)
13. [Circular Dependencies](#13-circular-dependencies)
14. [Testing Strategy](#14-testing-strategy)
15. [HTTP Testing Convention](#15-http-testing-convention)
16. [Security Checklist](#16-security-checklist)
17. [Production Checklist](#17-production-checklist)
18. [New Feature Recipe](#18-new-feature-recipe)
19. [Naming & Style Conventions](#19-naming--style-conventions)
20. [Cheat Sheet](#20-cheat-sheet)

---

## 1. Standard Project Structure

Use this layout for every new project. Feature folders are self-contained; cross-cutting concerns live in `common/` and `config/`.

```
src/
├── main.ts                     # bootstrap only — pipes, port, nothing else
├── app.module.ts               # root: imports + global providers only
│
├── config/                     # everything environment-related
│   ├── env.validation.ts       # schema for env vars (fail fast at boot)
│   ├── app.config.ts           # registerAs('app', ...)
│   ├── database.config.ts      # registerAs('database', ...)
│   └── database-connection.interceptor.ts
│
├── common/                     # shared, feature-agnostic building blocks
│   ├── pagination/             # PaginationProvider, Paginated<T>, query DTOs
│   ├── decorators/             # @Message, @ActiveUser, ...
│   ├── interceptors/           # response envelope, logging, ...
│   ├── filters/                # global exception filters
│   └── exceptions/             # custom HttpException subclasses
│
├── i18n/                       # translation catalogs: en/, ar/, fr/ ...
│
├── <feature>/                  # one folder per domain
│   ├── <feature>.module.ts
│   ├── <feature>.controller.ts
│   ├── <feature>.service.ts
│   ├── entities/
│   ├── dto/                    # create-*, update-*, query-* DTOs
│   ├── guards/                 # feature-scoped guards (if any)
│   └── providers/              # feature-scoped providers
│
└── auth/
    ├── auth.module.ts / .controller.ts / .service.ts
    ├── config/auth.config.ts   # registerAs('auth', ...)
    ├── providers/              # HashingProvider, BcryptProvider, ...
    ├── guards/                 # AuthorizeGuard
    ├── decorators/             # @AllowAnonymous, @ActiveUser
    ├── interfaces/             # ActiveUserData
    ├── constants/              # REQUEST_USER_KEY, ALLOW_ANONYMOUS_KEY
    └── dto/

env/
├── .env                        # NODE_ENV unset
├── .env.development            # NODE_ENV=development
├── .env.test                   # NODE_ENV=test
└── .env.production             # NODE_ENV=production

docs/app.http                   # executable API documentation
test/                           # real unit/e2e tests
```

**Rules:**

- ESM project → relative imports always end in `.js`.
- One folder per domain. Never import entities across features via file paths — import the module and use its exported service.
- `main.ts` stays tiny. Anything reusable goes in providers.

---

## 2. The Request Pipeline

Know this order — it determines where every concern belongs:

```
Request → Middleware → Guards → Interceptors (pre) → Pipes → Controller
      → Service → Interceptors (post, maps result) → Exception Filters (on throw)
      → Response
```

| Building block | Runs when | Use it for |
|---|---|---|
| **Middleware** | before routing/guards | raw request shaping, request logging, body parsing tweaks |
| **Guard** | before controller | authN/authZ — "may this request proceed?" |
| **Interceptor** | wraps the call | response shaping, caching, timeouts, error mapping |
| **Pipe** | on params/body | validation + transformation (`ParseIntPipe`, `ValidationPipe`) |
| **Filter** | on thrown exceptions | consistent error responses |

Register globals via `APP_GUARD` / `APP_INTERCEPTOR` / `APP_PIPE` / `APP_FILTER` providers in `AppModule` — never `app.use*` for things that need DI.

---

## 3. Module Design

```ts
@Module({
  imports: [
    TypeOrmModule.forFeature([Tweet, User]),  // repositories for THIS module
    HashtagModule,                            // gives access to its exports
  ],
  controllers: [TweetsController],
  providers: [TweetsService],
  exports: [TweetsService],                   // ONLY what other modules need
})
export class TweetsModule {}
```

**Rules:**

1. **Feature modules own their providers.** A service is private to its module unless explicitly exported.
2. **`exports` is the module's public API.** Export services, never repositories — other features should call your service, not query your tables.
3. **`TypeOrmModule.forFeature([Entity])` scopes the repository** to the declaring module only.
4. **`forRoot` / `forRootAsync`** for global, config-driven modules (once, in `AppModule`). **`forFeature`** for namespaced additions inside feature modules (config slices, repositories).
5. **AppModule imports modules and wires globals — nothing else.** No business logic at the root.
6. Prefer **importing a module** over importing its internals — if you find yourself importing 3 things from another feature, that feature should export one service instead.

---

## 4. Layer Responsibilities

### Controller — transport only

```ts
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.findOne(id);
  }
}
```

**Does:** extract params/body/query/user, apply route-level decorators (`@UseGuards`, `@Message`), delegate.
**Doesn't:** business logic, DB calls, `try/catch` (filters handle errors), translation logic.

### Service — all business logic

```ts
@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
  ) {}

  public async findOne(id: number) {
    const user = await this.usersRepository.findOneBy({ id });
    if (!user) throw new NotFoundException(`User #${id} not found`);
    return user;
  }
}
```

**Does:** validation of business rules, lookups, writes, transactions, throwing domain exceptions.
**Doesn't:** know about HTTP (no `Request`/`Response` objects), know about transport details.

### Entity — persistence shape only

Never return entity internals you don't want public — strip secrets (`password`) or select columns explicitly.

**The test:** if swapping REST for GraphQL/gRPC would force changes in your service, logic leaked into the wrong layer.

---

## 5. Data Layer (TypeORM)

### Entity baseline

```ts
@Entity()
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  email: string;

  @CreateDateColumn()   // INSERT timestamp — auto
  createdAt: Date;

  @UpdateDateColumn()   // UPDATE timestamp — auto
  updatedAt: Date;

  @DeleteDateColumn()   // soft delete — auto-excluded from queries
  deletedAt?: Date;
}
```

### Relationship rules

| Relation | Owning side | Marker |
|---|---|---|
| One-to-One | holds the FK → `@JoinColumn()` on the owner | `@OneToOne` both sides |
| One-to-Many | the "many" holds the FK | `@ManyToOne` on many, `@OneToMany` on one |
| Many-to-Many | ONE side gets `@JoinTable()` | TypeORM builds the junction table |

Always mirror both sides — TypeORM relations are bidirectional pairs:

```ts
@ManyToOne(() => User, (u) => u.tweets, { onDelete: 'CASCADE' })
user: User;
```

Use `onDelete: 'CASCADE'` deliberately — it deletes children at the DB level. Only where business rules say children can't outlive parents.

### Repository usage standards

- **Not-found is always `if (!x)`** — never `if (x)`. The most common inversion bug.
- **`update` pattern:** `findOne` → `Object.assign(entity, dto)` → `save`. Only fields present in the DTO get overwritten; `PartialType` DTOs make fields optional.
- **`remove` pattern:** verify existence first (404 if missing), then `delete`/`softDelete`, return `{ deleted: true }`.
- **`delete` vs `softDelete`:** with `@DeleteDateColumn`, prefer `softDelete` — rows stay recoverable, and queries auto-filter them.
- **Only assign defined fields** when merging: `if (dto.field !== undefined) entity.field = dto.field` — prevents blanking columns on partial updates.
- **Load relations explicitly:** `find({ relations: { profile: true } })` — avoid `eager: true` on hot paths; it runs a join on every query.

### Transactions

For multi-write operations use `dataSource.transaction` or `QueryRunner` — either all writes commit or none do:

```ts
await this.dataSource.transaction(async (manager) => {
  await manager.save(user);
  await manager.save(profile);
});
```

### synchronize

`synchronize: true` is a dev convenience. **Never in production** — generate migrations instead (`typeorm migration:generate`).

---

## 6. API Contract — DTOs & Validation

### Global validation pipe (`main.ts`)

```ts
app.useGlobalPipes(new I18nValidationPipe({
  whitelist: true,              // strip unknown properties
  forbidNonWhitelisted: true,   // AND reject them with 400
  transform: true,              // instantiate DTO classes
}));
```

### DTO rules

```ts
export class CreateUserDto {
  @IsString({ message: i18nValidationMessage('validation.IS_STRING') })
  @MinLength(3)
  @IsNotEmpty({ message: i18nValidationMessage('validation.NOT_EMPTY') })
  @MaxLength(100)
  firstName: string;

  @IsOptional()                          // may be omitted entirely
  @IsArray()
  @IsInt({ each: true })                 // EVERY element must pass
  hashtag?: number[];

  @IsOptional()
  @ValidateNested()                      // run nested DTO's validators
  @Type(() => CreateProfileDto)          // instantiate the concrete class
  profile?: CreateProfileDto;
}
```

**Hard rules:**

- `each: true` for array element validation — without it the constraint checks the array object itself and fails.
- `@ValidateNested()` + `@Type()` together for nested objects. Missing `@Type` means nested validators silently don't run.
- `Update` DTOs: `extends PartialType(CreateDto)` — every field optional, single source of truth.
- Query DTOs get their own class (`GetUserQueryDto`) — separate query filters from body DTOs.
- **Never trust client-supplied identity fields** (`userId`, `role`, `isAdmin`). Take identity from the verified token instead — see the auth blueprint.
- Use `ParseIntPipe` on `:id` route params — non-numeric ids become 400 before hitting the DB.

---

## 7. Response Envelope

Every successful response should share one shape — clients parse `data` the same way on every endpoint.

```json
{ "message": "Login successful", "data": { ... } }
```

### Implementation — metadata + global interceptor

```ts
// decorator — attaches a key to the route
export const MESSAGE_KEY = 'response:message';
export const Message = (msg: string) => SetMetadata(MESSAGE_KEY, msg);

// interceptor — reads metadata, wraps result, translates
@Injectable()
export class MessageInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler) {
    const key = this.reflector.get(MESSAGE_KEY, context.getHandler())
      ?? 'common.request_success';
    const message = I18nContext.current()?.t(key) ?? key;
    return next.handle().pipe(map(data => ({ message, data: data ?? null })));
  }
}
```

Registered once: `{ provide: APP_INTERCEPTOR, useClass: MessageInterceptor }`.

Usage: `@Message('users.deleted_success')` per route. Errors bypass it — interceptors only map the success stream; filters own the error shape.

**`SetMetadata` + `Reflector` is the canonical pattern** for attaching per-route config that guards/interceptors/filters read. Reuse it everywhere (`@AllowAnonymous`, `@Roles`, `@Message`).

---

## 8. Exception Handling Standard

| Exception | Status | When |
|---|---|---|
| `BadRequestException` | 400 | input shape problems (usually pipes throw this first) |
| `UnauthorizedException` | 401 | missing/invalid credentials or token |
| `ForbiddenException` | 403 | authenticated but not allowed (ownership/role) |
| `NotFoundException` | 404 | lookup returned `null` |
| `ConflictException` | 409 | uniqueness violation (duplicate email/name) |
| `ServiceUnavailableException` | 503 | infrastructure down (DB unreachable) |

### Conventions

- **404 after lookups:** `const x = await repo.findOneBy({id}); if (!x) throw new NotFoundException(...)`.
- **409 on duplicates:** check existence before insert, AND catch `QueryFailedError` with Postgres code `23505` in `save` — the DB is the final authority (closes the check-then-write race).
- **401 message hygiene:** "Invalid email or password" for unknown users, don't over-disclose. (Revealing whether the email exists enables user enumeration — weigh UX vs. security; many APIs deliberately use one generic message.)
- **Custom exceptions** extend `HttpException` for domain-specific errors:

```ts
export class UserAlreadyExistsException extends HttpException {
  constructor(field: string, value: string) {
    super(`User with ${field} ${value} already exists`, HttpStatus.CONFLICT);
  }
}
```

- **Infrastructure errors:** a global interceptor maps driver connection errors (`ECONNREFUSED`, `ETIMEDOUT`, `ConnectionNotFoundError`) to 503 with a sanitized message — internals never leak to clients.
- **Don't `try/catch` in controllers.** Let exceptions bubble to filters — they produce the consistent error body.

---

## 9. Pagination & Filtering

### Shared provider

```ts
@Injectable()
export class PaginationProvider {
  async paginateQuery<T>(
    query: PaginationQueryDto,            // { page?: number; limit?: number }
    repository: Repository<T>,
    relations?: FindOptionsRelations<T>,
    where?: FindOptionsWhere<T>,          // filters page AND total count
    requestPath?: string,
  ): Promise<Paginated<T>> {
    const page = query.page ?? 1;
    const limit = Math.min(query.limit ?? 10, 100);   // cap the limit
    // findAndCount + build meta + links
  }
}
```

### Response shape

```ts
{
  data: T[],
  meta:  { itemsPerPage, totalItems, currentPage, totalPages },
  links: { first, last, current, next, previous }
}
```

### Standards

- Defaults: `page=1`, `limit=10`; **cap `limit` at 100** — unbounded limits are a DoS vector.
- Always `order` (e.g. `id DESC`) — unordered pagination skips/duplicates rows as data changes.
- `where` must filter **both** the rows and the `totalItems` count.
- Query DTOs (`PaginationQueryDto`, `GetUserQueryDto`) validate `page`/`limit` as ints + optional filters.
- Carry active filters into `links` URLs so `next`/`previous` keep them.
- Scoped lists (`GET /users/:id/tweets` style) → `where: { user: { id } }`.

---

## 10. Configuration

### Environment files

```
env/.env                 # NODE_ENV unset (default/dev)
env/.env.development
env/.env.test
env/.env.production
```

```ts
const ENV = process.env.NODE_ENV?.trim();   // trim() — Windows `set` keeps trailing spaces

ConfigModule.forRoot({
  envFilePath: !ENV ? 'env/.env' : `env/.env.${ENV}`,
  isGlobal: true,
  load: [appConfig, databaseConfig],
  validationSchema: envValidation,          // boot fails on bad env — good
});
```

### Schema validation — `src/config/env.validation.ts`

```ts
export default Joi.object({
  NODE_ENV: Joi.string().trim().valid('development', 'test', 'production').default('development'),
  DB_PORT: Joi.number().port().default(5432),
  DB_SYNC: Joi.boolean().default(false),          // accepts "true"/"false" strings
  JWT_TOKEN_SECRET: Joi.string().required(),      // no default — must exist
});
```

- `.required()` for secrets/keys — the app refuses to boot misconfigured.
- `.default(x)` for everything with a sane fallback.
- With `@nestjs/config` v12+ use **Joi 18+** (Standard Schema) or Zod.

### Namespaced config — `registerAs`

```ts
// config/auth.config.ts
export default registerAs('auth', () => ({
  secret: process.env.JWT_TOKEN_SECRET,
  expiresIn: parseInt(process.env.JWT_TOKEN_EXPIRESIN ?? '3600', 10),
  refreshTokenExpiresIn: parseInt(process.env.JWT_TOKEN_REFRESH_EXPIRESIN ?? '86400', 10),
  audience: process.env.JWT_TOKEN_AUDIENCE,
  issuer: process.env.JWT_TOKEN_ISSUER,
}));
```

```ts
// registration — inside the feature module
imports: [ConfigModule.forFeature(authConfig)]

// injection — typed config slice
@Inject(authConfig.KEY)
private readonly authConfiguration: ConfigType<typeof authConfig>,
```

### Config reading rules

- **`getOrThrow<T>()` always** for required values: typed, non-undefined, and fails fast with a clear error. `get()` returns `T | undefined` and silently misconfigures (and breaks TypeORM's discriminated union).
- `process.env` only inside `*.config.ts` factories — services read `ConfigService`/namespaced config, never `process.env` directly.
- Numbers need explicit casts: `parseInt(..., 10)` or unary `+`.
- `.env.example` documents every key (values blanked). Never commit real secrets.
- **Windows gotcha:** `set NODE_ENV=development && cmd` — the space before `&&` becomes part of the value. Write `set NODE_ENV=development&& cmd`.

### Async registration for config-driven modules

```ts
TypeOrmModule.forRootAsync({
  imports: [ConfigModule],
  inject: [ConfigService],
  useFactory: (configService: ConfigService) => ({ ... }),
});

JwtModule.registerAsync(authConfig.asProvider());  // namespaced → JWT options directly
```

---

## 11. Authentication & Authorization Blueprint

### Provider abstraction for hashing

```ts
export abstract class HashingProvider {
  abstract hashPassword(data: string | Buffer): Promise<string>;
  abstract comparePassword(data: string | Buffer, encrypted: string): Promise<boolean>;
}

@Injectable()
export class BcryptProvider implements HashingProvider { ... }
```

Bound via token: `{ provide: HashingProvider, useClass: BcryptProvider }`.
Services depend on the **abstraction** — algorithms swap via one `useClass` change. Use this pattern for any swappable implementation (storage, mail, hashing).

### Token generation — reusable signers

```ts
private async signToken<T>(userId: number, expiresIn: number, payload?: T) {
  return this.jwtService.signAsync(
    { sub: userId, ...payload },
    { secret, expiresIn, audience, issuer },
  );
}

public async generateTokens(user: User) {
  const [accessToken, refreshToken] = await Promise.all([
    this.signToken<Partial<ActiveUserData>>(user.id, this.expiresIn, { email: user.email }),
    this.signToken(user.id, this.refreshTokenExpiresIn),   // sub only
  ]);
  return { accessToken, refreshToken };
}
```

- **Access token:** short-lived (~1h), carries `{ sub, email }`.
- **Refresh token:** long-lived (~1d), `sub` only. Never put secrets/roles-in-flux in tokens.
- Refresh endpoint: `verifyAsync(refreshToken)` → `findOne(sub)` → `generateTokens` → any failure = 401.

### The guard

```ts
@Injectable()
export class AuthorizeGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const allowAnonymous = this.reflector.getAllAndOverride<boolean>(
      ALLOW_ANONYMOUS_KEY, [context.getHandler(), context.getClass()]);
    if (allowAnonymous) return true;                        // opt-out wins

    const token = this.extractTokenFromHeader(request);     // "Bearer <jwt>"
    if (!token) throw new UnauthorizedException();

    const payload = await this.jwtService.verifyAsync(token, { secret });
    request[REQUEST_USER_KEY] = payload;                    // attach for @ActiveUser
    return true;
  }
}
```

Wiring requirements for a guard used across modules:
- The module owning the guard **exports** it plus the modules providing its deps (`JwtModule`, `ConfigModule` for `authConfig.KEY`).
- Consuming modules **import** that module.
- `getAllAndOverride(key, [handler, class])` — method metadata overrides class metadata.

### The decorators

```ts
// opt-out of auth (public route under a guarded controller)
export const AllowAnonymous = () => SetMetadata(ALLOW_ANONYMOUS_KEY, true);

// inject the verified user payload
export const ActiveUser = createParamDecorator(
  (field: keyof ActiveUserData | undefined, ctx: ExecutionContext) => {
    const user = ctx.switchToHttp().getRequest()[REQUEST_USER_KEY] as ActiveUserData;
    return field ? user?.[field] : user;
  },
);
```

### The critical security rule

**Identity always comes from the token, never the body.** `POST /tweets` takes `userId` from `@ActiveUser() user → user.sub`, not from `createTweetDto.userId` — a client cannot forge authorship. Remove identity fields from DTOs entirely.

```ts
@Post()
@UseGuards(AuthorizeGuard)
create(@Body() dto: CreateTweetDto, @ActiveUser() user: ActiveUserData) {
  return this.tweetsService.create(dto, user.sub);
}
```

### Password hygiene

- Hash before `repository.create()`/save — bcrypt with `genSalt(10)`.
- Strip before responding: `const { password, ...safe } = user`.
- Same for token payloads — claims only, no sensitive fields.

---

## 12. Internationalization

`nestjs-i18n` + JSON catalogs + `Accept-Language` detection.

### Setup

```ts
I18nModule.forRoot({
  fallbackLanguage: 'en',
  loaderOptions: { path: join(import.meta.dirname, 'i18n'), watch: true },
  resolvers: [AcceptLanguageResolver],
})
```

`nest-cli.json` must copy catalogs to `dist`:

```json
"assets": [{ "include": "i18n/**/*", "watchAssets": true }]
```

### Conventions

- One folder per locale (`en/`, `ar/`, `fr/`), one file per namespace (`auth.json` → `auth.*` keys).
- **Same keys in every locale** — enforce via a test that diffs key sets.
- Keys in code, never hardcoded translated strings: `@Message('auth.login_success')`.
- `I18nContext.current()?.t(key)` inside request scope — `?.` because it's `undefined` outside requests (unit tests, CLI).
- Validation: `I18nValidationPipe` (drop-in `ValidationPipe`) + `i18nValidationMessage('validation.KEY')` in DTO `message` options + `I18nValidationExceptionFilter` as `APP_FILTER`.
- `{property}`, `{value}`, `{constraints.0}` placeholders come from class-validator.
- Fallback chain: `Accept-Language` → supported check → `fallbackLanguage` (`en`).
- Never translate enum values, error codes, or DB contents.

---

## 13. Circular Dependencies

When two modules need each other (Users ↔ Auth), `forwardRef` on **all three sites**:

```ts
// both modules
imports: [forwardRef(() => OtherModule)]

// and at the injection point
@Inject(forwardRef(() => HashingProvider))
private readonly hashingProvider: HashingProvider,
```

Better long-term: extract the shared concern into a third module both depend on — circular deps are often a signal the boundary is wrong. `forwardRef` is the pragmatic fix; a shared module is the clean fix.

---

## 14. Testing Strategy

- **Vitest** (ESM-native): `vi.fn()`, `vi.mock()`, `expect()`. Config: `vitest.config.ts`, run `npx vitest run`.
- **Unit tests** instantiate services with hand-rolled repo mocks — fast, no DI container needed:

```ts
function repository<T>(methods: Partial<Repository<T>> = {}) {
  return methods as Repository<T>;
}

const service = new UsersService(repository({ findOneBy: vi.fn().mockResolvedValue(null) }), ...);
await expect(service.findOne(99)).rejects.toBeInstanceOf(NotFoundException);
```

- **What to test:** exception branches (404/409/401), business invariants (duplicate email rejected, soft-deleted excluded), provider logic (pagination meta/links), interceptor shapes.
- Interceptor/decorator tests: call `intercept(ctx, { handle: () => of(data) })`, unwrap with `lastValueFrom`.
- **Scaffold specs** (`should be defined` with empty `TestModule`) break the moment services get real deps — either inject mocks or delete them; don't leave red files.
- **e2e** (supertest + test DB / sqlite) for pipeline behavior: validation, guards, envelope, status codes.
- **Contract tests** worth adding: every locale has identical i18n keys; every endpoint has an app.http request.

---

## 15. HTTP Testing Convention

`docs/app.http` doubles as executable API docs (VS Code REST Client / JetBrains):

```http
@host = http://localhost:3000
@token = eyJhbGciOi...

### Login
POST {{host}}/auth/login
Content-Type: application/json
Accept-Language: ar

{ "email": "user@example.com", "password": "password123" }

### Protected route
POST {{host}}/tweets
Content-Type: application/json
Authorization: Bearer {{token}}

{ "text": "Hello", "hashtag": [1, 4] }

### Negative case — no token → 401
POST {{host}}/tweets
Content-Type: application/json

{ "text": "should fail" }
```

**Standards:** every endpoint has a happy-path request AND the negative cases that matter (401 no token / bad creds, 404 missing id, 409 duplicate, 400 bad body). Variables (`@host`, `@token`) at the top.

---

## 16. Security Checklist

- [ ] Passwords hashed (bcrypt) before save — never stored plaintext, never serialized out
- [ ] `password` stripped from every response (`const { password, ...rest }`)
- [ ] Identity from JWT payload only — `userId`/`role` never accepted from request bodies
- [ ] `Authorization: Bearer` — token extracted from header, verified with server-side secret
- [ ] `JWT_TOKEN_SECRET` required by env schema; strong random value in real envs
- [ ] `whitelist: true` + `forbidNonWhitelisted: true` on the validation pipe
- [ ] Pagination `limit` capped (≤100)
- [ ] 404 vs 401 wording doesn't enumerate valid users (pick a policy consciously)
- [ ] Refresh token is `sub`-only, long-lived; access token short-lived
- [ ] DB errors sanitized to 503 — driver details never reach clients
- [ ] `synchronize: false` outside dev
- [ ] `.env` files gitignored; `.env.example` documents keys only
- [ ] No secrets in code, tests, logs, or commits

## 17. Production Checklist

- [ ] `DB_SYNC=false`, migrations generated and reviewed
- [ ] `env/.env.production` exists with real secrets from a secrets manager
- [ ] `NODE_ENV=production` — Joi schema must pass on first boot
- [ ] Global prefix or URI versioning if the API is public (`/api/v1`)
- [ ] CORS configured for known origins only
- [ ] Helmet + rate limiting (`@nestjs/throttler`) for public APIs
- [ ] Health check endpoint (`@nestjs/terminus`)
- [ ] Structured logging / observability wired
- [ ] Graceful shutdown hooks enabled (`app.enableShutdownHooks()`)
- [ ] `nest build` clean; `dist/` includes i18n assets
- [ ] CI: `tsc --noEmit` + `vitest run` green on every commit

## 18. New Feature Recipe

Repeatable checklist per resource (e.g. "comment"):

1. `nest g resource <name>` → pick REST, CRUD yes.
2. **Entity** — columns + `@CreateDateColumn`/`@UpdateDateColumn` (+ `@DeleteDateColumn` if soft-delete) + relations.
3. **Module** — `TypeOrmModule.forFeature([Entity])` + imports for any needed cross-module services (+ `AuthModule` if guarded).
4. **DTOs** — `create-` (full validation + i18n messages), `update-` (`PartialType`), `get-/query-` for filters + pagination.
5. **Service** — CRUD with `findOneBy`+404, `Object.assign` update, existence-check `remove`; 409 on duplicates; delegate pagination.
6. **Controller** — thin; `@UseGuards` where protected; `@Message` keys; `@ActiveUser()` for identity.
7. **Ownership rule** — take user id from token, not body.
8. **i18n keys** — add same keys to every locale file.
9. **app.http** — happy path + negative cases.
10. **Test** — at minimum: 404 path, 409 path, guard behavior.
11. `tsc --noEmit` + `vitest run` green.

## 19. Naming & Style Conventions

| Thing | Convention | Example |
|---|---|---|
| Files | kebab-case with role suffix | `authorize.guard.ts`, `create-user.dto.ts` |
| Classes | PascalCase | `UsersService`, `AuthorizeGuard` |
| Providers (abstract) | abstract class as DI token | `HashingProvider` |
| Config namespaces | `registerAs('name')` | `'auth'`, `'database'` |
| Metadata keys | SCREAMING_SNAKE const | `REQUEST_USER_KEY = 'user'` |
| i18n keys | `namespace.snake_key` | `auth.login_success` |
| Env vars | SCREAMING_SNAKE + prefix | `JWT_TOKEN_SECRET`, `DB_HOST` |
| Routes | plural nouns | `/users`, `/tweets` |
| Service methods | verb-first | `findOne`, `create`, `remove` |

General style:

- Compact code — collapse duplicate branches, avoid needless nesting.
- `Object.assign` merge + `save` for updates; re-check existence instead of assuming.
- Comments only where intent isn't obvious; let names do the work.
- `const` by default; `private readonly` for injected deps.
- Return `{ deleted: true }`-style minimal payloads for deletes; full entities elsewhere.

## 20. Cheat Sheet

| You need | The pattern |
|---|---|
| Injectable repo | `@InjectRepository(Entity)` + `forFeature([Entity])` |
| Cross-module service | export there + `imports: [OtherModule]` |
| Optional field | `@IsOptional()` + `?` |
| Array elements | `@IsX({ each: true })` |
| Nested object | `@ValidateNested()` + `@Type(() => NestedDto)` |
| Optional update DTO | `extends PartialType(CreateDto)` |
| 404 | `findOneBy` + `if (!x) throw new NotFoundException()` |
| 409 | pre-check + catch `QueryFailedError` `23505` |
| Soft delete | `@DeleteDateColumn` + `softDelete` |
| Route metadata | `SetMetadata` + `Reflector.getAllAndOverride` |
| Global cross-cutting | `APP_PIPE` / `APP_INTERCEPTOR` / `APP_GUARD` / `APP_FILTER` |
| Required config | `getOrThrow<T>()` |
| Per-module config | `registerAs` + `forFeature` + `@Inject(cfg.KEY)` |
| Swappable impl | `{ provide: Abstraction, useClass: Impl }` |
| Circular DI | `forwardRef` both modules + injection site |
| Protect route | `@UseGuards(AuthorizeGuard)` + import `AuthModule` |
| Public under guard | `@AllowAnonymous()` |
| Current user | `@ActiveUser()` / `@ActiveUser('sub')` |
| Identity in create | `user.sub` from token — never body |
| Sign JWT | `signToken(sub, expiresIn, payload?)` |
| Translate | `I18nContext.current()?.t('ns.key')` |
| Test a service | instantiate with `vi.fn()` repo mocks |
| Async module cfg | `forRootAsync({ inject, useFactory })` |

---

*Keep this file at the root of every new NestJS project and prune/adjust per project — it's a starting contract, not dogma.*
