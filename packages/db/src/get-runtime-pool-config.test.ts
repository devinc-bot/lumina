import { expect, test } from 'vitest'
import { getRuntimePoolConfig } from './get-runtime-pool-config.ts'
import type { RuntimeDatabaseEnv } from './config/env.ts'

const DATABASE_URL = 'postgresql://runtime-user:runtime-password@postgres:5432/afterdark'

test('maps runtime env to Pool options with default max', () => {
  const env = {
    DATABASE_URL,
    DATABASE_POOL_MAX: 10,
  } satisfies RuntimeDatabaseEnv

  expect(getRuntimePoolConfig(env)).toEqual({
    connectionString: DATABASE_URL,
    max: 10,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 5_000,
  })
})

test('uses DATABASE_POOL_MAX from runtime env for Pool max', () => {
  const env = {
    DATABASE_URL,
    DATABASE_POOL_MAX: 3,
  } satisfies RuntimeDatabaseEnv

  expect(getRuntimePoolConfig(env)).toMatchObject({
    connectionString: DATABASE_URL,
    max: 3,
  })
})
