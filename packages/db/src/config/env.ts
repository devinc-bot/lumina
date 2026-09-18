import { z } from 'zod'

export const databaseEnvSchema = z.object({
  DATABASE_URL: z.url(),
  DATABASE_MIGRATION_URL: z.url(),
})

export type DatabaseEnv = z.infer<typeof databaseEnvSchema>

export const runtimeDatabaseEnvSchema = databaseEnvSchema
  .pick({
    DATABASE_URL: true,
  })
  .extend({
    DATABASE_POOL_MAX: z.coerce.number().int().positive().default(10),
  })

export type RuntimeDatabaseEnv = z.infer<typeof runtimeDatabaseEnvSchema>

export const migrationEnvSchema = databaseEnvSchema.pick({
  DATABASE_MIGRATION_URL: true,
})

export type MigrationEnv = z.infer<typeof migrationEnvSchema>

export const testDatabaseEnvSchema = z.object({
  DATABASE_TEST_URL: z.url(),
})

export type TestDatabaseEnv = z.infer<typeof testDatabaseEnvSchema>
