import { expect, test } from 'vitest'
import { runtimeDatabaseEnvSchema } from './env.ts'
import { loadDatabaseEnv, loadMigrationEnv, loadTestDatabaseEnv } from './env.loader.ts'

const DATABASE_URL = 'postgresql://runtime-user:runtime-password@postgres:5432/afterdark'
const DATABASE_MIGRATION_URL =
  'postgresql://migration-user:migration-password@postgres:5432/afterdark'
const DATABASE_TEST_URL = 'postgresql://test-user:test-password@postgres:5432/afterdark_test'

test('uses injected database URLs without reading a local environment file', () => {
  const environment: NodeJS.ProcessEnv = {
    DATABASE_URL,
    DATABASE_MIGRATION_URL,
  }

  const result = loadDatabaseEnv({
    environment,
    fileExists: () => true,
    loadEnvironmentFile: () => {
      throw new Error('The local environment file should not be loaded')
    },
  })

  expect(result).toEqual({
    DATABASE_URL,
    DATABASE_POOL_MAX: 10,
  })
})

test('loads an existing local environment file when database URLs are absent', () => {
  const environment: NodeJS.ProcessEnv = {}
  let loadedPath: string | undefined

  const result = loadDatabaseEnv({
    environment,
    environmentFilePath: 'local.env',
    fileExists: (path) => path === 'local.env',
    loadEnvironmentFile: (path) => {
      loadedPath = path
      environment.DATABASE_URL = DATABASE_URL
      environment.DATABASE_MIGRATION_URL = DATABASE_MIGRATION_URL
    },
  })

  expect(loadedPath).toBe('local.env')
  expect(result).toEqual({
    DATABASE_URL,
    DATABASE_POOL_MAX: 10,
  })
})

test('defaults DATABASE_POOL_MAX to 10 when omitted', () => {
  expect(
    runtimeDatabaseEnvSchema.parse({
      DATABASE_URL,
    })
  ).toMatchObject({
    DATABASE_URL,
    DATABASE_POOL_MAX: 10,
  })
})

test('accepts an explicit DATABASE_POOL_MAX override', () => {
  expect(
    loadDatabaseEnv({
      environment: {
        DATABASE_URL,
        DATABASE_POOL_MAX: '5',
      },
      fileExists: () => false,
    })
  ).toEqual({
    DATABASE_URL,
    DATABASE_POOL_MAX: 5,
  })
})

test('rejects a non-positive DATABASE_POOL_MAX', () => {
  const zero = runtimeDatabaseEnvSchema.safeParse({
    DATABASE_URL,
    DATABASE_POOL_MAX: '0',
  })
  const negative = runtimeDatabaseEnvSchema.safeParse({
    DATABASE_URL,
    DATABASE_POOL_MAX: '-1',
  })
  const nonInteger = runtimeDatabaseEnvSchema.safeParse({
    DATABASE_URL,
    DATABASE_POOL_MAX: '1.5',
  })

  expect(zero.success).toBe(false)
  expect(negative.success).toBe(false)
  expect(nonInteger.success).toBe(false)
})

test('uses the injected direct migration URL without reading a local environment file', () => {
  const environment: NodeJS.ProcessEnv = {
    DATABASE_MIGRATION_URL,
  }

  const result = loadMigrationEnv({
    environment,
    fileExists: () => true,
    loadEnvironmentFile: () => {
      throw new Error('The local environment file should not be loaded')
    },
  })

  expect(result).toEqual({
    DATABASE_MIGRATION_URL,
  })
})

test('rejects migration configuration without a direct database URL', () => {
  expect(() => loadMigrationEnv({ environment: {}, fileExists: () => false })).toThrow(
    /DATABASE_MIGRATION_URL/
  )
})

test('requires an explicitly injected isolated test database URL', () => {
  expect(loadTestDatabaseEnv({ DATABASE_TEST_URL })).toEqual({ DATABASE_TEST_URL })
  expect(() => loadTestDatabaseEnv({})).toThrow(/DATABASE_TEST_URL/)
  expect(() =>
    loadTestDatabaseEnv({
      DATABASE_TEST_URL: 'postgresql://test-user:test-password@postgres:5432/afterdark',
    })
  ).toThrow(/ending in "_test"/)
  expect(() =>
    loadTestDatabaseEnv({
      DATABASE_URL: DATABASE_TEST_URL,
      DATABASE_TEST_URL,
    })
  ).toThrow(/must differ/)
})
