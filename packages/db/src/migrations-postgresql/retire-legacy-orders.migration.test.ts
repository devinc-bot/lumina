import { readFile, readdir } from 'node:fs/promises'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { beforeAll, expect, test } from 'vitest'

type MigrationFile = {
  name: string
  sql: string
}

const migrationDirectory = fileURLToPath(new URL('.', import.meta.url))
let retirementMigration: MigrationFile | undefined

beforeAll(async () => {
  const migrationFiles = (await readdir(migrationDirectory))
    .filter((name) => name.endsWith('.sql'))
    .sort()

  const migrations = await Promise.all(
    migrationFiles.map(async (name) => ({
      name,
      sql: await readFile(join(migrationDirectory, name), 'utf8'),
    }))
  )

  const retirementMigrations = migrations.filter(({ sql }) =>
    /drop\s+table\s+(?:if\s+exists\s+)?["`]?orders["`]?/i.test(sql)
  )

  expect(retirementMigrations).toHaveLength(1)
  retirementMigration = retirementMigrations[0]
})

function getRetirementMigration(): MigrationFile {
  if (!retirementMigration) throw new Error('Expected the legacy orders retirement migration')
  return retirementMigration
}

test('guards retirement against pending orders and normalized parity mismatches', () => {
  const { sql } = getRetirementMigration()

  expect(sql).toMatch(/do\s+\$\$/i)
  expect(sql).toMatch(/from\s+orders(?:\s+\w+)?\s+where\s+(?:\w+\.)?status\s*=\s*'pending'/i)
  expect(sql).toContain('purchase_items')
  expect(sql).toContain('purchases')
  expect(sql).toContain('payments')
  expect(sql).toMatch(/raise\s+exception/i)
})

test('guards issued tickets and removes the compatibility relationship before orders', () => {
  const { sql } = getRetirementMigration()
  const ticketForeignKeyDrop = sql.search(
    /alter\s+table\s+(?:only\s+)?tickets_sold\s+drop\s+constraint/i
  )
  const orderIdDrop = sql.search(
    /alter\s+table\s+(?:only\s+)?tickets_sold\s+drop\s+column\s+(?:if\s+exists\s+)?order_id/i
  )
  const ordersDrop = sql.search(/drop\s+table\s+(?:if\s+exists\s+)?["`]?orders["`]?/i)

  expect(sql).toContain('tickets_sold')
  expect(sql).toContain('purchase_item_id')
  expect(sql).toContain('unit_index')
  expect(ticketForeignKeyDrop).toBeGreaterThanOrEqual(0)
  expect(orderIdDrop).toBeGreaterThan(ticketForeignKeyDrop)
  expect(ordersDrop).toBeGreaterThan(orderIdDrop)
})
