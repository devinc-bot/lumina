import { IMAGE_OPTIMIZATION, IMAGE_UPLOAD_MAX_BYTES } from '@repo/validators'
import { getDomain } from 'tldts'
import { z } from 'zod'
import { RATE_LIMIT_POLICY_DEFAULTS, RATE_LIMIT_PROFILE } from './rate-limit.policy'

export const googleOauthEnvSchema = z.object({
  GOOGLE_CLIENT_ID: z.string(),
  GOOGLE_CLIENT_SECRET: z.string(),
})

export const mailEnvSchema = z
  .object({
    AWS_REGION: z.string().min(1),
    AWS_ACCESS_KEY_ID: z.string().default(''),
    AWS_SECRET_ACCESS_KEY: z.string().default(''),
    MAIL_FROM: z.string(),
    MAIL_REPLY_TO: z.string().default(''),
    MAIL_SMOKE_TO: z.string(),
  })
  .superRefine((config, context) => {
    const hasAccessKeyId = config.AWS_ACCESS_KEY_ID.length > 0
    const hasSecretAccessKey = config.AWS_SECRET_ACCESS_KEY.length > 0

    if (hasAccessKeyId === hasSecretAccessKey) {
      return
    }

    if (hasAccessKeyId) {
      context.addIssue({
        code: 'custom',
        path: ['AWS_SECRET_ACCESS_KEY'],
        message:
          'AWS_SECRET_ACCESS_KEY must be set together with AWS_ACCESS_KEY_ID (pair both or leave both empty).',
      })
      return
    }

    context.addIssue({
      code: 'custom',
      path: ['AWS_ACCESS_KEY_ID'],
      message:
        'AWS_ACCESS_KEY_ID must be set together with AWS_SECRET_ACCESS_KEY (pair both or leave both empty).',
    })
  })

export const mercadoPagoEnvSchema = z.object({
  MERCADOPAGO_ACCESS_TOKEN: z.string(),
  MERCADOPAGO_WEBHOOK_SECRET: z.string(),
  MERCADOPAGO_TEST_MODE: z.string().transform((value) => value === 'true' || value === '1'),
})

export const uploadEnvSchema = z.object({
  UPLOAD_MAX_BYTES: z.coerce.number().int().positive().default(IMAGE_UPLOAD_MAX_BYTES),
  IMAGE_MAX_DIMENSION: z.coerce.number().int().positive().default(IMAGE_OPTIMIZATION.MAX_DIMENSION),
  IMAGE_QUALITY: z.coerce.number().int().min(1).max(100).default(IMAGE_OPTIMIZATION.QUALITY),
  R2_ACCOUNT_ID: z.string().min(1),
  R2_ACCESS_KEY_ID: z.string().min(1),
  R2_SECRET_ACCESS_KEY: z.string().min(1),
  R2_BUCKET: z.string().min(1),
  R2_PUBLIC_BASE_URL: z.url(),
})

export const MODE = {
  DEVELOPMENT: 'development',
  PRODUCTION: 'production',
  TEST: 'test',
} as const

const positiveInt = (defaultValue: number) =>
  z.coerce.number().int().positive().default(defaultValue)

const rateLimitEnvSchema = {
  RATE_LIMIT_PUBLIC_LIMIT: positiveInt(RATE_LIMIT_POLICY_DEFAULTS[RATE_LIMIT_PROFILE.PUBLIC].limit),
  RATE_LIMIT_PUBLIC_TTL_MS: positiveInt(
    RATE_LIMIT_POLICY_DEFAULTS[RATE_LIMIT_PROFILE.PUBLIC].ttlMs
  ),
  RATE_LIMIT_AUTHENTICATED_LIMIT: positiveInt(
    RATE_LIMIT_POLICY_DEFAULTS[RATE_LIMIT_PROFILE.AUTHENTICATED].limit
  ),
  RATE_LIMIT_AUTHENTICATED_TTL_MS: positiveInt(
    RATE_LIMIT_POLICY_DEFAULTS[RATE_LIMIT_PROFILE.AUTHENTICATED].ttlMs
  ),
  RATE_LIMIT_LOGIN_LIMIT: positiveInt(RATE_LIMIT_POLICY_DEFAULTS[RATE_LIMIT_PROFILE.LOGIN].limit),
  RATE_LIMIT_LOGIN_TTL_MS: positiveInt(RATE_LIMIT_POLICY_DEFAULTS[RATE_LIMIT_PROFILE.LOGIN].ttlMs),
  RATE_LIMIT_AUTH_SENSITIVE_LIMIT: positiveInt(
    RATE_LIMIT_POLICY_DEFAULTS[RATE_LIMIT_PROFILE.AUTH_SENSITIVE].limit
  ),
  RATE_LIMIT_AUTH_SENSITIVE_TTL_MS: positiveInt(
    RATE_LIMIT_POLICY_DEFAULTS[RATE_LIMIT_PROFILE.AUTH_SENSITIVE].ttlMs
  ),
  RATE_LIMIT_AUTH_CONFIRM_LIMIT: positiveInt(
    RATE_LIMIT_POLICY_DEFAULTS[RATE_LIMIT_PROFILE.AUTH_CONFIRM].limit
  ),
  RATE_LIMIT_AUTH_CONFIRM_TTL_MS: positiveInt(
    RATE_LIMIT_POLICY_DEFAULTS[RATE_LIMIT_PROFILE.AUTH_CONFIRM].ttlMs
  ),
  RATE_LIMIT_REFRESH_LIMIT: positiveInt(
    RATE_LIMIT_POLICY_DEFAULTS[RATE_LIMIT_PROFILE.REFRESH].limit
  ),
  RATE_LIMIT_REFRESH_TTL_MS: positiveInt(
    RATE_LIMIT_POLICY_DEFAULTS[RATE_LIMIT_PROFILE.REFRESH].ttlMs
  ),
  RATE_LIMIT_PURCHASE_LIMIT: positiveInt(
    RATE_LIMIT_POLICY_DEFAULTS[RATE_LIMIT_PROFILE.PURCHASE].limit
  ),
  RATE_LIMIT_PURCHASE_TTL_MS: positiveInt(
    RATE_LIMIT_POLICY_DEFAULTS[RATE_LIMIT_PROFILE.PURCHASE].ttlMs
  ),
  RATE_LIMIT_QR_LIMIT: positiveInt(RATE_LIMIT_POLICY_DEFAULTS[RATE_LIMIT_PROFILE.QR].limit),
  RATE_LIMIT_QR_TTL_MS: positiveInt(RATE_LIMIT_POLICY_DEFAULTS[RATE_LIMIT_PROFILE.QR].ttlMs),
  RATE_LIMIT_CHECK_IN_LIMIT: positiveInt(
    RATE_LIMIT_POLICY_DEFAULTS[RATE_LIMIT_PROFILE.CHECK_IN].limit
  ),
  RATE_LIMIT_CHECK_IN_TTL_MS: positiveInt(
    RATE_LIMIT_POLICY_DEFAULTS[RATE_LIMIT_PROFILE.CHECK_IN].ttlMs
  ),
  RATE_LIMIT_GEO_LIMIT: positiveInt(RATE_LIMIT_POLICY_DEFAULTS[RATE_LIMIT_PROFILE.GEO].limit),
  RATE_LIMIT_GEO_TTL_MS: positiveInt(RATE_LIMIT_POLICY_DEFAULTS[RATE_LIMIT_PROFILE.GEO].ttlMs),
} as const

function getSchemefulSite(url: string): string {
  const { protocol, hostname } = new URL(url)
  // Resolve the registrable domain so api.example.com and dashboard.example.com
  // share https://example.com, while api.foo.co.uk and bar.co.uk do not share a site.
  const registrableDomain = getDomain(hostname) ?? hostname

  return `${protocol}//${registrableDomain}`
}

function parseCorsOrigins(value: string): string[] {
  return value
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean)
}

function hasNonEmptyServiceAccount(value: string): boolean {
  return value
    .split(',')
    .map((entry) => entry.trim())
    .some((entry) => entry.length > 0)
}

export const apiConfigSchema = z
  .object({
    PORT: z.coerce.number().default(3000),
    JWT_SECRET: z.string(),
    REFRESH_TOKEN_SECRET: z.string().min(1),
    API_PUBLIC_URL: z.url(),
    DASHBOARD_URL: z.url(),
    WEB_URL: z.url(),
    ADMIN_URL: z.url(),
    CORS_ALLOWED_ORIGINS: z.string().default(''),
    // Number of trusted reverse-proxy hops before the client; use 0 for local direct access.
    TRUST_PROXY_HOPS: z.coerce.number().int().nonnegative(),
    ...rateLimitEnvSchema,
    NODE_ENV: z.enum([MODE.DEVELOPMENT, MODE.PRODUCTION, MODE.TEST]).default(MODE.DEVELOPMENT),
    INTERNAL_JOBS_OIDC_AUDIENCE: z.string().default(''),
    INTERNAL_JOBS_OIDC_ALLOWED_SERVICE_ACCOUNTS: z.string().default(''),
    ENABLE_IN_PROCESS_SCHEDULERS: z
      .enum(['true', 'false'])
      .default('false')
      .transform((value) => value === 'true'),
    DATABASE_POOL_MAX: positiveInt(10),
  })
  .superRefine((config, context) => {
    const origins = [config.API_PUBLIC_URL, config.WEB_URL, config.DASHBOARD_URL, config.ADMIN_URL]
    const expectedSite = getSchemefulSite(config.API_PUBLIC_URL)
    const isLocalDevelopmentTopology = config.NODE_ENV === MODE.DEVELOPMENT

    if (
      !isLocalDevelopmentTopology &&
      origins.some((origin) => getSchemefulSite(origin) !== expectedSite)
    ) {
      context.addIssue({
        code: 'custom',
        message:
          'API_PUBLIC_URL, WEB_URL, DASHBOARD_URL, and ADMIN_URL must share a schemeful site.',
      })
    }

    if (config.NODE_ENV === MODE.PRODUCTION && config.TRUST_PROXY_HOPS === 0) {
      context.addIssue({
        code: 'custom',
        path: ['TRUST_PROXY_HOPS'],
        message: 'TRUST_PROXY_HOPS must be at least 1 in production.',
      })
    }

    if (config.NODE_ENV === MODE.PRODUCTION) {
      if (config.INTERNAL_JOBS_OIDC_AUDIENCE.trim().length === 0) {
        context.addIssue({
          code: 'custom',
          path: ['INTERNAL_JOBS_OIDC_AUDIENCE'],
          message: 'INTERNAL_JOBS_OIDC_AUDIENCE must be set to a non-empty value in production.',
        })
      }

      if (!hasNonEmptyServiceAccount(config.INTERNAL_JOBS_OIDC_ALLOWED_SERVICE_ACCOUNTS)) {
        context.addIssue({
          code: 'custom',
          path: ['INTERNAL_JOBS_OIDC_ALLOWED_SERVICE_ACCOUNTS'],
          message:
            'INTERNAL_JOBS_OIDC_ALLOWED_SERVICE_ACCOUNTS must include at least one service account in production.',
        })
      }
    }
  })
  .transform((config) => {
    const requiredOrigins = [config.WEB_URL, config.DASHBOARD_URL, config.ADMIN_URL]

    return {
      ...config,
      CORS_ALLOWED_ORIGINS: [
        ...new Set([...requiredOrigins, ...parseCorsOrigins(config.CORS_ALLOWED_ORIGINS)]),
      ],
    }
  })
