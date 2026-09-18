import type { RuntimeDatabaseEnv } from './config/env.ts'

export function getRuntimePoolConfig(env: RuntimeDatabaseEnv) {
  return {
    connectionString: env.DATABASE_URL,
    max: env.DATABASE_POOL_MAX,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 5_000,
  }
}
