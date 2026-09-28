import { beforeEach, describe, expect, test, vi } from 'vitest'
import { PgDialect } from 'drizzle-orm/pg-core'
import { organizationAccountsLnk } from '../../schema/organization-account-lnk.ts'
import { organizations } from '../../schema/organization.ts'

const state = vi.hoisted(() => ({
  transaction: vi.fn(),
  select: vi.fn(),
  insert: vi.fn(),
  where: vi.fn(),
  orphanRows: [] as (typeof ORPHAN)[],
  membershipRows: [] as { id: number }[],
}))

vi.mock('../../client.ts', () => ({ db: state }))

import { repairOwnerOrganizations } from './repair-owner-organizations.ts'

const ORPHAN = {
  ownerDocumentId: 'ec17cfa8-1561-4aac-bca5-406f866580bd',
  accountId: 7,
  name: 'Ana',
  lastName: 'García',
}

let writes: { table: unknown; values: Record<string, unknown> }[]

beforeEach(() => {
  vi.resetAllMocks()
  writes = []
  state.orphanRows = [ORPHAN]
  state.membershipRows = []
  let selectCall = 0
  const repairQuery = {
    from: vi.fn().mockReturnThis(),
    innerJoin: vi.fn().mockReturnThis(),
    leftJoin: vi.fn().mockReturnThis(),
    where: vi.fn((predicate: unknown) => {
      state.where(predicate)
      return Promise.resolve(state.orphanRows)
    }),
  }
  const accountQuery = {
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnValue({ for: vi.fn().mockResolvedValue([{ id: ORPHAN.accountId }]) }),
  }
  const membershipQuery = {
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnValue({
      limit: vi.fn().mockImplementation(() => Promise.resolve(state.membershipRows)),
    }),
  }
  state.select.mockImplementation(() => {
    const query = [repairQuery, accountQuery, membershipQuery][selectCall]
    selectCall += 1
    return query ?? repairQuery
  })
  state.transaction.mockImplementation(async (callback) => callback(state))
  state.insert.mockImplementation((table: unknown) => ({
    values: (values: Record<string, unknown>) => {
      writes.push({ table, values })
      const promise = Promise.resolve([{ id: 45, ...values }])
      return Object.assign(promise, { returning: () => promise })
    },
  }))
})

describe('repairOwnerOrganizations', () => {
  test('previews orphaned accounts without inserting or changing data', async () => {
    await expect(repairOwnerOrganizations({ apply: false })).resolves.toEqual({
      orphanCount: 1,
      repairedCount: 0,
    })
    expect(state.insert).not.toHaveBeenCalled()
  })

  test('limits repair selection to accounts without organization membership', async () => {
    await repairOwnerOrganizations({ apply: false })
    const predicate = state.where.mock.calls[0]?.[0]
    expect(predicate).toBeDefined()
    const sql = new PgDialect().sqlToQuery(predicate).sql.toLowerCase()
    expect(sql).toContain('organization_accounts_lnk')
    expect(sql).toMatch(/not exists|is null/)
  })

  test('provisions the orphan and does not insert again when repeated after repair', async () => {
    await expect(repairOwnerOrganizations({ apply: true })).resolves.toEqual({
      orphanCount: 1,
      repairedCount: 1,
    })
    expect(writes.filter(({ table }) => table === organizations)).toHaveLength(1)
    expect(writes.find(({ table }) => table === organizationAccountsLnk)?.values).toEqual({
      organizationId: 45,
      accountId: ORPHAN.accountId,
    })

    state.orphanRows = []
    await expect(repairOwnerOrganizations({ apply: true })).resolves.toEqual({
      orphanCount: 0,
      repairedCount: 0,
    })
    expect(writes).toHaveLength(2)
    expect(state.transaction).toHaveBeenCalled()
  })

  test('skips an orphan that gains a membership while its account is locked', async () => {
    state.membershipRows = [{ id: 9 }]

    await expect(repairOwnerOrganizations({ apply: true })).resolves.toEqual({
      orphanCount: 1,
      repairedCount: 0,
    })
    expect(writes).toEqual([])
  })
})
