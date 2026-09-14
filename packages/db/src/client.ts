import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'
import * as schema from './schema/index.ts'
import { serverEnv } from './config/env.server.ts'
import { getRuntimePoolConfig } from './get-runtime-pool-config.ts'

export const pool = new Pool(getRuntimePoolConfig(serverEnv))

export const db = drizzle(pool, { schema })

export async function closeDatabaseConnection() {
  await pool.end()
}

export type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0]
