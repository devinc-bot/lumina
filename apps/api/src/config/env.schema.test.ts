import { expect, test } from 'vitest'
import { envSchema } from './env'
import { apiConfigSchema, mailEnvSchema, uploadEnvSchema } from './env.schema'
import {
  RATE_LIMIT_POLICY_DEFAULTS,
  RATE_LIMIT_PROFILE,
  createRateLimitPolicy,
} from './rate-limit.policy'

const validMailEnv = {
  AWS_REGION: 'sa-east-1',
  AWS_ACCESS_KEY_ID: '',
  AWS_SECRET_ACCESS_KEY: '',
  MAIL_FROM: 'no-reply@example.test',
  MAIL_SMOKE_TO: 'smoke@example.test',
}

test('mail env accepts AWS_REGION with empty paired AWS keys', () => {
  const env = mailEnvSchema.parse(validMailEnv)

  expect(env).toMatchObject({
    AWS_REGION: 'sa-east-1',
    AWS_ACCESS_KEY_ID: '',
    AWS_SECRET_ACCESS_KEY: '',
    MAIL_FROM: 'no-reply@example.test',
    MAIL_SMOKE_TO: 'smoke@example.test',
  })
  expect(env).not.toHaveProperty('RESEND_API_KEY')
})

test('mail env accepts both AWS access key and secret set together', () => {
  const env = mailEnvSchema.parse({
    ...validMailEnv,
    AWS_ACCESS_KEY_ID: 'AKIATESTACCESSKEY',
    AWS_SECRET_ACCESS_KEY: 'test-secret-access-key',
  })

  expect(env).toMatchObject({
    AWS_REGION: 'sa-east-1',
    AWS_ACCESS_KEY_ID: 'AKIATESTACCESSKEY',
    AWS_SECRET_ACCESS_KEY: 'test-secret-access-key',
  })
})

function expectAwsCredentialPairingFailure(
  result: ReturnType<typeof mailEnvSchema.safeParse>
): void {
  expect(result.success).toBe(false)
  if (result.success) {
    return
  }

  const issuePaths = result.error.issues.flatMap((issue) => issue.path.map(String))
  const issueMessages = result.error.issues.map((issue) => issue.message)
  expect(
    issuePaths.some((path) => path.includes('AWS_')) ||
      issueMessages.some((message) => /AWS_|pair|access key|secret/i.test(message))
  ).toBe(true)
}

test('mail env rejects an unpaired AWS access key', () => {
  expectAwsCredentialPairingFailure(
    mailEnvSchema.safeParse({
      ...validMailEnv,
      AWS_ACCESS_KEY_ID: 'AKIATESTACCESSKEY',
      AWS_SECRET_ACCESS_KEY: '',
    })
  )
})

test('mail env rejects an unpaired AWS secret access key', () => {
  expectAwsCredentialPairingFailure(
    mailEnvSchema.safeParse({
      ...validMailEnv,
      AWS_ACCESS_KEY_ID: '',
      AWS_SECRET_ACCESS_KEY: 'test-secret-access-key',
    })
  )
})

test('mail env schema does not include RESEND_API_KEY', () => {
  expect(mailEnvSchema.shape).not.toHaveProperty('RESEND_API_KEY')
  expect(mailEnvSchema.shape).toHaveProperty('AWS_REGION')
  expect(mailEnvSchema.shape).toHaveProperty('AWS_ACCESS_KEY_ID')
  expect(mailEnvSchema.shape).toHaveProperty('AWS_SECRET_ACCESS_KEY')
  expect(mailEnvSchema.shape).toHaveProperty('MAIL_FROM')
  expect(mailEnvSchema.shape).toHaveProperty('MAIL_SMOKE_TO')
  expect(mailEnvSchema.shape).toHaveProperty('MAIL_REPLY_TO')
})

test('mail env defaults MAIL_REPLY_TO to empty string when omitted', () => {
  const env = mailEnvSchema.parse(validMailEnv)

  expect(env.MAIL_REPLY_TO).toBe('')
})

test('mail env accepts an explicit MAIL_REPLY_TO value', () => {
  const env = mailEnvSchema.parse({
    ...validMailEnv,
    MAIL_REPLY_TO: 'support@example.test',
  })

  expect(env.MAIL_REPLY_TO).toBe('support@example.test')
})

test('mail env rejects an empty AWS_REGION', () => {
  expect(mailEnvSchema.safeParse({ ...validMailEnv, AWS_REGION: '' }).success).toBe(false)
})

test('runtime env schema rejects unpaired AWS credentials', () => {
  const result = envSchema.safeParse({
    ...process.env,
    AWS_REGION: 'sa-east-1',
    AWS_ACCESS_KEY_ID: 'AKIATESTACCESSKEY',
    AWS_SECRET_ACCESS_KEY: '',
    MAIL_FROM: 'no-reply@example.test',
    MAIL_SMOKE_TO: 'smoke@example.test',
  })

  expect(result.success).toBe(false)
})

const validInternalJobsOidc = {
  INTERNAL_JOBS_OIDC_AUDIENCE: 'https://api.example.com',
  INTERNAL_JOBS_OIDC_ALLOWED_SERVICE_ACCOUNTS:
    'scheduler@example.iam.gserviceaccount.com, jobs-runner@example.iam.gserviceaccount.com',
} as const

const validConfig = {
  PORT: '3000',
  JWT_SECRET: 'test-jwt-secret',
  REFRESH_TOKEN_SECRET: 'test-refresh-token-secret',
  API_PUBLIC_URL: 'https://api.example.com',
  WEB_URL: 'https://example.com',
  DASHBOARD_URL: 'https://dashboard.example.com',
  ADMIN_URL: 'https://admin.example.com',
  CORS_ALLOWED_ORIGINS:
    'https://example.com,https://dashboard.example.com,https://admin.example.com',
  TRUST_PROXY_HOPS: '1',
  NODE_ENV: 'production',
  ...validInternalJobsOidc,
}

test('upload env does not require or expose R2_UPLOAD_PREFIX', () => {
  const env = uploadEnvSchema.parse({
    R2_ACCOUNT_ID: 'test-account',
    R2_ACCESS_KEY_ID: 'test-access-key',
    R2_SECRET_ACCESS_KEY: 'test-secret-key',
    R2_BUCKET: 'test-bucket',
    R2_PUBLIC_BASE_URL: 'https://files.example.test',
  })

  expect(env).toMatchObject({
    R2_ACCOUNT_ID: 'test-account',
    R2_ACCESS_KEY_ID: 'test-access-key',
    R2_SECRET_ACCESS_KEY: 'test-secret-key',
    R2_BUCKET: 'test-bucket',
    R2_PUBLIC_BASE_URL: 'https://files.example.test',
  })
  expect(env).not.toHaveProperty('R2_UPLOAD_PREFIX')
})

test('accepts same-site application and API origins with a configured proxy topology', () => {
  expect(apiConfigSchema.parse(validConfig)).toMatchObject({
    TRUST_PROXY_HOPS: 1,
    ADMIN_URL: validConfig.ADMIN_URL,
    CORS_ALLOWED_ORIGINS: [validConfig.WEB_URL, validConfig.DASHBOARD_URL, validConfig.ADMIN_URL],
  })
})

test('accepts local subdomain origins during development', () => {
  expect(
    apiConfigSchema.parse({
      ...validConfig,
      API_PUBLIC_URL: 'http://localhost:3000',
      WEB_URL: 'http://web.localhost:3001',
      DASHBOARD_URL: 'http://dashboard.localhost:3002',
      ADMIN_URL: 'http://admin.localhost:3003',
      NODE_ENV: 'development',
      TRUST_PROXY_HOPS: '0',
    })
  ).toMatchObject({
    API_PUBLIC_URL: 'http://localhost:3000',
    WEB_URL: 'http://web.localhost:3001',
    DASHBOARD_URL: 'http://dashboard.localhost:3002',
    ADMIN_URL: 'http://admin.localhost:3003',
  })
})

test('accepts local subdomain origins in production', () => {
  const result = apiConfigSchema.safeParse({
    ...validConfig,
    API_PUBLIC_URL: 'http://localhost:3000',
    WEB_URL: 'http://web.localhost:3001',
    DASHBOARD_URL: 'http://dashboard.localhost:3002',
    ADMIN_URL: 'http://admin.localhost:3003',
  })

  expect(result.success).toBe(true)
})

test('defaults CORS origins to the three application URLs and accepts extra origins', () => {
  const result = apiConfigSchema.parse({
    ...validConfig,
    CORS_ALLOWED_ORIGINS: 'https://admin.example.com, https://partner.example.com',
  })

  expect(result.CORS_ALLOWED_ORIGINS).toEqual([
    validConfig.WEB_URL,
    validConfig.DASHBOARD_URL,
    validConfig.ADMIN_URL,
    'https://partner.example.com',
  ])

  const withoutConfiguredOrigins = apiConfigSchema.parse({
    ...validConfig,
    CORS_ALLOWED_ORIGINS: undefined,
  })

  expect(withoutConfiguredOrigins.CORS_ALLOWED_ORIGINS).toEqual([
    validConfig.WEB_URL,
    validConfig.DASHBOARD_URL,
    validConfig.ADMIN_URL,
  ])
})

test('accepts the same-site custom API origin with Cloudflare frontend origins', () => {
  const result = apiConfigSchema.safeParse({
    ...validConfig,
    API_PUBLIC_URL: 'https://api-staging.lumina-events.com',
    WEB_URL: 'https://staging.lumina-events.com',
    DASHBOARD_URL: 'https://staging-dash.lumina-events.com',
    ADMIN_URL: 'https://admin-staging.lumina-events.com',
  })

  expect(result.success).toBe(true)
})

test('allows a cross-site Cloud Run API origin for Lumina frontends outside production', () => {
  const result = apiConfigSchema.safeParse({
    ...validConfig,
    API_PUBLIC_URL: 'https://lumina-api-staging-w6oqqom2mq-rj.a.run.app',
    WEB_URL: 'https://staging.lumina-events.com',
    DASHBOARD_URL: 'https://staging-dash.lumina-events.com',
    ADMIN_URL: 'https://admin-staging.lumina-events.com',
    NODE_ENV: 'development',
    TRUST_PROXY_HOPS: '0',
  })

  expect(result.success).toBe(true)
})

test('allows a cross-site API origin for Lumina frontends in test mode', () => {
  const result = apiConfigSchema.safeParse({
    ...validConfig,
    API_PUBLIC_URL: 'https://lumina-api-staging-w6oqqom2mq-rj.a.run.app',
    WEB_URL: 'https://staging.lumina-events.com',
    DASHBOARD_URL: 'https://staging-dash.lumina-events.com',
    ADMIN_URL: 'https://admin-staging.lumina-events.com',
    NODE_ENV: 'test',
  })

  expect(result.success).toBe(true)
})

test('rejects a cross-site Cloud Run API origin for cookie-authenticated Lumina frontends in production', () => {
  const result = apiConfigSchema.safeParse({
    ...validConfig,
    API_PUBLIC_URL: 'https://lumina-api-staging-w6oqqom2mq-rj.a.run.app',
    WEB_URL: 'https://staging.lumina-events.com',
    DASHBOARD_URL: 'https://staging-dash.lumina-events.com',
    ADMIN_URL: 'https://admin-staging.lumina-events.com',
  })

  expect(result.success).toBe(false)
})

test('accepts public-suffix and IP-address origin combinations', () => {
  const publicSuffixResult = apiConfigSchema.safeParse({
    ...validConfig,
    API_PUBLIC_URL: 'https://api.foo.co.uk',
    WEB_URL: 'https://bar.co.uk',
    DASHBOARD_URL: 'https://dashboard.foo.co.uk',
    ADMIN_URL: 'https://admin.foo.co.uk',
  })
  const ipAddressResult = apiConfigSchema.safeParse({
    ...validConfig,
    API_PUBLIC_URL: 'https://192.0.2.1',
    WEB_URL: 'https://192.0.2.2',
    DASHBOARD_URL: 'https://192.0.2.1',
    ADMIN_URL: 'https://192.0.2.1',
  })

  expect(publicSuffixResult.success).toBe(true)
  expect(ipAddressResult.success).toBe(true)
})

test('defaults omitted rate-limit pairs to the approved policy budgets', () => {
  expect(apiConfigSchema.parse(validConfig)).toMatchObject({
    RATE_LIMIT_PUBLIC_LIMIT: RATE_LIMIT_POLICY_DEFAULTS[RATE_LIMIT_PROFILE.PUBLIC].limit,
    RATE_LIMIT_PUBLIC_TTL_MS: RATE_LIMIT_POLICY_DEFAULTS[RATE_LIMIT_PROFILE.PUBLIC].ttlMs,
    RATE_LIMIT_AUTHENTICATED_LIMIT:
      RATE_LIMIT_POLICY_DEFAULTS[RATE_LIMIT_PROFILE.AUTHENTICATED].limit,
    RATE_LIMIT_AUTHENTICATED_TTL_MS:
      RATE_LIMIT_POLICY_DEFAULTS[RATE_LIMIT_PROFILE.AUTHENTICATED].ttlMs,
    RATE_LIMIT_LOGIN_LIMIT: RATE_LIMIT_POLICY_DEFAULTS[RATE_LIMIT_PROFILE.LOGIN].limit,
    RATE_LIMIT_LOGIN_TTL_MS: RATE_LIMIT_POLICY_DEFAULTS[RATE_LIMIT_PROFILE.LOGIN].ttlMs,
    RATE_LIMIT_AUTH_SENSITIVE_LIMIT:
      RATE_LIMIT_POLICY_DEFAULTS[RATE_LIMIT_PROFILE.AUTH_SENSITIVE].limit,
    RATE_LIMIT_AUTH_SENSITIVE_TTL_MS:
      RATE_LIMIT_POLICY_DEFAULTS[RATE_LIMIT_PROFILE.AUTH_SENSITIVE].ttlMs,
    RATE_LIMIT_AUTH_CONFIRM_LIMIT:
      RATE_LIMIT_POLICY_DEFAULTS[RATE_LIMIT_PROFILE.AUTH_CONFIRM].limit,
    RATE_LIMIT_AUTH_CONFIRM_TTL_MS:
      RATE_LIMIT_POLICY_DEFAULTS[RATE_LIMIT_PROFILE.AUTH_CONFIRM].ttlMs,
    RATE_LIMIT_REFRESH_LIMIT: RATE_LIMIT_POLICY_DEFAULTS[RATE_LIMIT_PROFILE.REFRESH].limit,
    RATE_LIMIT_REFRESH_TTL_MS: RATE_LIMIT_POLICY_DEFAULTS[RATE_LIMIT_PROFILE.REFRESH].ttlMs,
    RATE_LIMIT_PURCHASE_LIMIT: RATE_LIMIT_POLICY_DEFAULTS[RATE_LIMIT_PROFILE.PURCHASE].limit,
    RATE_LIMIT_PURCHASE_TTL_MS: RATE_LIMIT_POLICY_DEFAULTS[RATE_LIMIT_PROFILE.PURCHASE].ttlMs,
    RATE_LIMIT_QR_LIMIT: RATE_LIMIT_POLICY_DEFAULTS[RATE_LIMIT_PROFILE.QR].limit,
    RATE_LIMIT_QR_TTL_MS: RATE_LIMIT_POLICY_DEFAULTS[RATE_LIMIT_PROFILE.QR].ttlMs,
    RATE_LIMIT_CHECK_IN_LIMIT: RATE_LIMIT_POLICY_DEFAULTS[RATE_LIMIT_PROFILE.CHECK_IN].limit,
    RATE_LIMIT_CHECK_IN_TTL_MS: RATE_LIMIT_POLICY_DEFAULTS[RATE_LIMIT_PROFILE.CHECK_IN].ttlMs,
    RATE_LIMIT_GEO_LIMIT: RATE_LIMIT_POLICY_DEFAULTS[RATE_LIMIT_PROFILE.GEO].limit,
    RATE_LIMIT_GEO_TTL_MS: RATE_LIMIT_POLICY_DEFAULTS[RATE_LIMIT_PROFILE.GEO].ttlMs,
  })
})

test('maps omitted rate-limit env onto every named policy profile', () => {
  expect(createRateLimitPolicy(apiConfigSchema.parse(validConfig))).toEqual(
    RATE_LIMIT_POLICY_DEFAULTS
  )
})

test('accepts explicit rate-limit overrides', () => {
  const parsed = apiConfigSchema.parse({
    ...validConfig,
    RATE_LIMIT_PUBLIC_LIMIT: '80',
    RATE_LIMIT_PUBLIC_TTL_MS: '45000',
    RATE_LIMIT_AUTHENTICATED_LIMIT: '200',
    RATE_LIMIT_AUTHENTICATED_TTL_MS: '50000',
    RATE_LIMIT_LOGIN_LIMIT: '8',
    RATE_LIMIT_LOGIN_TTL_MS: '800000',
    RATE_LIMIT_AUTH_SENSITIVE_LIMIT: '3',
    RATE_LIMIT_AUTH_SENSITIVE_TTL_MS: '700000',
    RATE_LIMIT_AUTH_CONFIRM_LIMIT: '12',
    RATE_LIMIT_AUTH_CONFIRM_TTL_MS: '600000',
    RATE_LIMIT_REFRESH_LIMIT: '25',
    RATE_LIMIT_REFRESH_TTL_MS: '40000',
    RATE_LIMIT_PURCHASE_LIMIT: '7',
    RATE_LIMIT_PURCHASE_TTL_MS: '35000',
    RATE_LIMIT_QR_LIMIT: '14',
    RATE_LIMIT_QR_TTL_MS: '25000',
    RATE_LIMIT_CHECK_IN_LIMIT: '40',
    RATE_LIMIT_CHECK_IN_TTL_MS: '20000',
    RATE_LIMIT_GEO_LIMIT: '15',
    RATE_LIMIT_GEO_TTL_MS: '30000',
  })

  expect(parsed).toMatchObject({
    RATE_LIMIT_PUBLIC_LIMIT: 80,
    RATE_LIMIT_PUBLIC_TTL_MS: 45_000,
    RATE_LIMIT_AUTHENTICATED_LIMIT: 200,
    RATE_LIMIT_AUTHENTICATED_TTL_MS: 50_000,
    RATE_LIMIT_LOGIN_LIMIT: 8,
    RATE_LIMIT_LOGIN_TTL_MS: 800_000,
    RATE_LIMIT_AUTH_SENSITIVE_LIMIT: 3,
    RATE_LIMIT_AUTH_SENSITIVE_TTL_MS: 700_000,
    RATE_LIMIT_AUTH_CONFIRM_LIMIT: 12,
    RATE_LIMIT_AUTH_CONFIRM_TTL_MS: 600_000,
    RATE_LIMIT_REFRESH_LIMIT: 25,
    RATE_LIMIT_REFRESH_TTL_MS: 40_000,
    RATE_LIMIT_PURCHASE_LIMIT: 7,
    RATE_LIMIT_PURCHASE_TTL_MS: 35_000,
    RATE_LIMIT_QR_LIMIT: 14,
    RATE_LIMIT_QR_TTL_MS: 25_000,
    RATE_LIMIT_CHECK_IN_LIMIT: 40,
    RATE_LIMIT_CHECK_IN_TTL_MS: 20_000,
    RATE_LIMIT_GEO_LIMIT: 15,
    RATE_LIMIT_GEO_TTL_MS: 30_000,
  })
  expect(createRateLimitPolicy(parsed)).toEqual({
    [RATE_LIMIT_PROFILE.PUBLIC]: { limit: 80, ttlMs: 45_000 },
    [RATE_LIMIT_PROFILE.AUTHENTICATED]: { limit: 200, ttlMs: 50_000 },
    [RATE_LIMIT_PROFILE.LOGIN]: { limit: 8, ttlMs: 800_000 },
    [RATE_LIMIT_PROFILE.AUTH_SENSITIVE]: { limit: 3, ttlMs: 700_000 },
    [RATE_LIMIT_PROFILE.AUTH_CONFIRM]: { limit: 12, ttlMs: 600_000 },
    [RATE_LIMIT_PROFILE.REFRESH]: { limit: 25, ttlMs: 40_000 },
    [RATE_LIMIT_PROFILE.PURCHASE]: { limit: 7, ttlMs: 35_000 },
    [RATE_LIMIT_PROFILE.QR]: { limit: 14, ttlMs: 25_000 },
    [RATE_LIMIT_PROFILE.CHECK_IN]: { limit: 40, ttlMs: 20_000 },
    [RATE_LIMIT_PROFILE.GEO]: { limit: 15, ttlMs: 30_000 },
  })
})

test('rejects a non-positive rate-limit value', () => {
  const zeroLimit = apiConfigSchema.safeParse({ ...validConfig, RATE_LIMIT_LOGIN_LIMIT: '0' })
  const zeroTtl = apiConfigSchema.safeParse({ ...validConfig, RATE_LIMIT_PUBLIC_TTL_MS: '0' })
  const negativeLimit = apiConfigSchema.safeParse({
    ...validConfig,
    RATE_LIMIT_GEO_LIMIT: '-1',
  })
  const negativeTtl = apiConfigSchema.safeParse({
    ...validConfig,
    RATE_LIMIT_REFRESH_TTL_MS: '-1000',
  })
  const nonIntegerLimit = apiConfigSchema.safeParse({
    ...validConfig,
    RATE_LIMIT_GEO_LIMIT: '1.5',
  })

  expect(zeroLimit.success).toBe(false)
  expect(zeroTtl.success).toBe(false)
  expect(negativeLimit.success).toBe(false)
  expect(negativeTtl.success).toBe(false)
  expect(nonIntegerLimit.success).toBe(false)
})

test('rejects an invalid trusted proxy hop count', () => {
  const result = apiConfigSchema.safeParse({ ...validConfig, TRUST_PROXY_HOPS: '-1' })

  expect(result.success).toBe(false)
})

test('requires a trusted proxy hop in production', () => {
  const result = apiConfigSchema.safeParse({ ...validConfig, TRUST_PROXY_HOPS: '0' })

  expect(result.success).toBe(false)
})

test('preserves API cross-field validation in the runtime environment schema', () => {
  const result = envSchema.safeParse({
    ...process.env,
    NODE_ENV: 'production',
    TRUST_PROXY_HOPS: '0',
  })

  expect(result.success).toBe(false)
})

test('accepts a complete API runtime environment without DATABASE_URL', () => {
  const { DATABASE_URL: _omittedDatabaseUrl, ...apiEnvWithoutDatabaseUrl } = process.env

  const result = envSchema.safeParse(apiEnvWithoutDatabaseUrl)

  expect(result.success).toBe(true)
  if (result.success) {
    expect(result.data).not.toHaveProperty('DATABASE_URL')
  }
})

test('accepts explicit internal jobs OIDC and pool settings in production', () => {
  expect(apiConfigSchema.parse(validConfig)).toMatchObject({
    INTERNAL_JOBS_OIDC_AUDIENCE: validInternalJobsOidc.INTERNAL_JOBS_OIDC_AUDIENCE,
    INTERNAL_JOBS_OIDC_ALLOWED_SERVICE_ACCOUNTS:
      validInternalJobsOidc.INTERNAL_JOBS_OIDC_ALLOWED_SERVICE_ACCOUNTS,
    ENABLE_IN_PROCESS_SCHEDULERS: false,
    DATABASE_POOL_MAX: 10,
  })
})

test('defaults DATABASE_POOL_MAX to 10 when omitted', () => {
  expect(apiConfigSchema.parse(validConfig)).toMatchObject({
    DATABASE_POOL_MAX: 10,
  })
})

test('accepts an explicit DATABASE_POOL_MAX override', () => {
  expect(
    apiConfigSchema.parse({
      ...validConfig,
      DATABASE_POOL_MAX: '5',
    })
  ).toMatchObject({
    DATABASE_POOL_MAX: 5,
  })
})

test('rejects a non-positive DATABASE_POOL_MAX', () => {
  const zero = apiConfigSchema.safeParse({ ...validConfig, DATABASE_POOL_MAX: '0' })
  const negative = apiConfigSchema.safeParse({ ...validConfig, DATABASE_POOL_MAX: '-1' })
  const nonInteger = apiConfigSchema.safeParse({ ...validConfig, DATABASE_POOL_MAX: '1.5' })

  expect(zero.success).toBe(false)
  expect(negative.success).toBe(false)
  expect(nonInteger.success).toBe(false)
})

test('defaults ENABLE_IN_PROCESS_SCHEDULERS to false when omitted', () => {
  expect(apiConfigSchema.parse(validConfig)).toMatchObject({
    ENABLE_IN_PROCESS_SCHEDULERS: false,
  })
})

test('parses ENABLE_IN_PROCESS_SCHEDULERS true/false', () => {
  expect(
    apiConfigSchema.parse({
      ...validConfig,
      ENABLE_IN_PROCESS_SCHEDULERS: 'true',
    })
  ).toMatchObject({
    ENABLE_IN_PROCESS_SCHEDULERS: true,
  })
  expect(
    apiConfigSchema.parse({
      ...validConfig,
      NODE_ENV: 'development',
      TRUST_PROXY_HOPS: '0',
      ENABLE_IN_PROCESS_SCHEDULERS: 'false',
    })
  ).toMatchObject({
    ENABLE_IN_PROCESS_SCHEDULERS: false,
  })
})

test('allows empty internal jobs OIDC config in development', () => {
  expect(
    apiConfigSchema.parse({
      ...validConfig,
      NODE_ENV: 'development',
      TRUST_PROXY_HOPS: '0',
      INTERNAL_JOBS_OIDC_AUDIENCE: '',
      INTERNAL_JOBS_OIDC_ALLOWED_SERVICE_ACCOUNTS: '',
    })
  ).toMatchObject({
    INTERNAL_JOBS_OIDC_AUDIENCE: '',
    INTERNAL_JOBS_OIDC_ALLOWED_SERVICE_ACCOUNTS: '',
  })
})

test('allows omitted internal jobs OIDC config in development', () => {
  const {
    INTERNAL_JOBS_OIDC_AUDIENCE: _audience,
    INTERNAL_JOBS_OIDC_ALLOWED_SERVICE_ACCOUNTS: _accounts,
    ...withoutOidc
  } = {
    ...validConfig,
    NODE_ENV: 'development',
    TRUST_PROXY_HOPS: '0',
  }

  expect(apiConfigSchema.parse(withoutOidc)).toMatchObject({
    INTERNAL_JOBS_OIDC_AUDIENCE: '',
    INTERNAL_JOBS_OIDC_ALLOWED_SERVICE_ACCOUNTS: '',
  })
})

test('allows empty internal jobs OIDC config in test', () => {
  expect(
    apiConfigSchema.parse({
      ...validConfig,
      NODE_ENV: 'test',
      INTERNAL_JOBS_OIDC_AUDIENCE: '',
      INTERNAL_JOBS_OIDC_ALLOWED_SERVICE_ACCOUNTS: '',
    })
  ).toMatchObject({
    INTERNAL_JOBS_OIDC_AUDIENCE: '',
    INTERNAL_JOBS_OIDC_ALLOWED_SERVICE_ACCOUNTS: '',
  })
})

function expectProductionOidcFailure(result: ReturnType<typeof apiConfigSchema.safeParse>): void {
  expect(result.success).toBe(false)
  if (result.success) {
    return
  }

  const issuePaths = result.error.issues.flatMap((issue) => issue.path.map(String))
  const issueMessages = result.error.issues.map((issue) => issue.message)
  expect(
    issuePaths.some((path) => path.includes('INTERNAL_JOBS_OIDC')) ||
      issueMessages.some((message) =>
        /INTERNAL_JOBS_OIDC|OIDC|audience|service account/i.test(message)
      )
  ).toBe(true)
}

test('rejects empty INTERNAL_JOBS_OIDC_AUDIENCE in production', () => {
  expectProductionOidcFailure(
    apiConfigSchema.safeParse({
      ...validConfig,
      INTERNAL_JOBS_OIDC_AUDIENCE: '',
    })
  )
})

test('rejects empty INTERNAL_JOBS_OIDC_ALLOWED_SERVICE_ACCOUNTS in production', () => {
  expectProductionOidcFailure(
    apiConfigSchema.safeParse({
      ...validConfig,
      INTERNAL_JOBS_OIDC_ALLOWED_SERVICE_ACCOUNTS: '',
    })
  )
})

test('rejects omitted internal jobs OIDC config in production', () => {
  const {
    INTERNAL_JOBS_OIDC_AUDIENCE: _audience,
    INTERNAL_JOBS_OIDC_ALLOWED_SERVICE_ACCOUNTS: _accounts,
    ...withoutOidc
  } = validConfig

  expectProductionOidcFailure(apiConfigSchema.safeParse(withoutOidc))
})

test('rejects whitespace-only INTERNAL_JOBS_OIDC_ALLOWED_SERVICE_ACCOUNTS in production', () => {
  expectProductionOidcFailure(
    apiConfigSchema.safeParse({
      ...validConfig,
      INTERNAL_JOBS_OIDC_ALLOWED_SERVICE_ACCOUNTS: '  ,  ',
    })
  )
})

test('rejects whitespace-only INTERNAL_JOBS_OIDC_AUDIENCE in production', () => {
  expectProductionOidcFailure(
    apiConfigSchema.safeParse({
      ...validConfig,
      INTERNAL_JOBS_OIDC_AUDIENCE: '   ',
    })
  )
})
