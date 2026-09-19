import { resolve } from 'node:path'
import { loadEnvFile } from 'node:process'
import { fileURLToPath } from 'node:url'
import { seedEnvSchema } from '@repo/validators'

loadEnvFile(resolve(fileURLToPath(new URL('.', import.meta.url)), '../../.env'))

const result = seedEnvSchema.safeParse(process.env)

if (!result.success) {
  throw new Error(`Invalid seed environment variables:\n${result.error.message}`)
}

export const seedEnv = result.data
