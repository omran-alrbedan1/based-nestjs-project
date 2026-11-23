import Joi from 'joi';

export default Joi.object({
    NODE_ENV: Joi.string().trim().valid('development', 'test', 'production').default('development'),
    ENV_MODE: Joi.string().valid('DEVELOPMENT', 'TEST', 'PRODUCTION').required(),
    PORT: Joi.number().port().default(3000),

    // Database :
    DB_TYPE: Joi.string().valid('postgres').required(),
    DB_HOST: Joi.string().required(),
    DB_PORT: Joi.number().port().default(5432),
    DB_USERNAME: Joi.string().required(),
    DB_PASSWORD: Joi.string().required(),
    DB_NAME: Joi.string().required(),
    DB_SYNC: Joi.boolean().default(false),
    DB_AUTOLOADENTITIES: Joi.boolean().default(true),

    // Auth :
    JWT_TOKEN_SECRET: Joi.string().required(),
     JWT_TOKEN_EXPIRESIN: Joi.number().default(3600),
    JWT_TOKEN_REFRESH_EXPIRESIN: Joi.number().default(86400),
    JWT_TOKEN_AUDIENCE: Joi.string().optional(),
    JWT_TOKEN_ISSUER: Joi.string().optional(),
});
