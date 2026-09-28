import { loadMigrationEnv } from '../config/env.loader.ts'

const APPLY_FLAG = '--apply'

async function main() {
  const args = process.argv.slice(2)
  if (args.some((arg) => arg !== APPLY_FLAG)) {
    throw new Error('Usage: pnpm db:repair:owner-organizations [--apply]')
  }

  // Administrative work must use the direct migration connection.
  const { DATABASE_MIGRATION_URL } = loadMigrationEnv()
  process.env.DATABASE_URL = DATABASE_MIGRATION_URL
  const { closeDatabaseConnection } = await import('../client.ts')
  try {
    const { repairOwnerOrganizations } =
      await import('../repositories/organizations/repair-owner-organizations.ts')
    const result = await repairOwnerOrganizations({ apply: args.includes(APPLY_FLAG) })
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`)
  } finally {
    await closeDatabaseConnection()
  }
}

void main().catch(() => {
  process.stderr.write(
    'Owner organization repair failed. No credentials or profile data were logged.\n'
  )
  process.exitCode = 1
})
