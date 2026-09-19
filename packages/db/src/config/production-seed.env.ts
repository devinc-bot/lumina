import { resolve } from 'node:path'
import { loadEnvFile } from 'node:process'
import { fileURLToPath } from 'node:url'
import { productionSeedEnvSchema } from '@repo/validators'

loadEnvFile(resolve(fileURLToPath(new URL('.', import.meta.url)), '../../.env'))

const result = productionSeedEnvSchema.safeParse(process.env)

if (!result.success) {
  throw new Error(`Invalid production seed environment variables:\n${result.error.message}`)
}

export const productionSeedEnv = result.data
