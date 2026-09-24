import { describe, expect, test, vi } from 'vitest'
import type { Transaction } from '../../client.ts'
import { organizationAccountsLnk } from '../../schema/organization-account-lnk.ts'
import { organizations } from '../../schema/organization.ts'
import { ownerAccountsLnk } from '../../schema/owner-account-lnk.ts'
import { owners } from '../../schema/owner.ts'
import { createOwnerWithAccountLink } from './create-owner-with-account-link.ts'

const PROFILE = { name: 'Ana', lastName: 'García', phone: '+541155551234' }
const OWNER = { id: 12, documentId: 'ec17cfa8-1561-4aac-bca5-406f866580bd' }

function createTransaction(
  options: { owner?: typeof OWNER; failedTable?: unknown; emptyOwner?: boolean } = {}
) {
  const writes: { table: unknown; values: Record<string, unknown> }[] = []
  const insert = vi.fn((table: unknown) => ({
    values: (values: Record<string, unknown>) => {
      writes.push({ table, values })
      const result =
        table === owners
          ? options.emptyOwner
            ? []
            : [options.owner ?? OWNER]
          : [{ id: 45, ...values }]
      const promise =
        table === options.failedTable
          ? Promise.reject(new Error('Persistence failed'))
          : Promise.resolve(result)
      return Object.assign(promise, { returning: () => promise })
    },
  }))
  return { tx: { insert } as unknown as Transaction, writes }
}

describe('createOwnerWithAccountLink', () => {
  test('creates an organization and account membership in the supplied registration transaction', async () => {
    const { tx, writes } = createTransaction()

    await expect(createOwnerWithAccountLink(tx, 7, PROFILE)).resolves.toBe(OWNER.documentId)

    expect(writes).toContainEqual({ table: owners, values: { ...PROFILE, avatarId: null } })
    expect(writes).toContainEqual({
      table: ownerAccountsLnk,
      values: { ownerId: OWNER.id, accountId: 7 },
    })
    expect(writes).toContainEqual({
      table: organizations,
      values: expect.objectContaining({
        name: expect.stringContaining(PROFILE.name),
        slug: expect.any(String),
      }),
    })
    expect(writes).toContainEqual({
      table: organizationAccountsLnk,
      values: { organizationId: 45, accountId: 7 },
    })
  })

  test('allocates distinct nonempty organization slugs for owners with the same name', async () => {
    const first = createTransaction()
    const second = createTransaction({
      owner: { id: 13, documentId: 'a9b8545b-acbe-4882-90fa-48d2544f23cf' },
    })

    await createOwnerWithAccountLink(first.tx, 7, PROFILE)
    await createOwnerWithAccountLink(second.tx, 8, PROFILE)

    const firstSlug = first.writes.find(({ table }) => table === organizations)?.values.slug
    const secondSlug = second.writes.find(({ table }) => table === organizations)?.values.slug
    expect(firstSlug).toEqual(expect.stringMatching(/^[a-z0-9]+(?:-[a-z0-9]+)*$/))
    expect(secondSlug).toEqual(expect.stringMatching(/^[a-z0-9]+(?:-[a-z0-9]+)*$/))
    expect(firstSlug).not.toBe(secondSlug)
  })

  test.each([organizations, organizationAccountsLnk])(
    'propagates provisioning failure so the caller rolls back registration',
    async (failedTable) => {
      const { tx } = createTransaction({ failedTable })
      await expect(createOwnerWithAccountLink(tx, 7, PROFILE)).rejects.toThrow('Persistence failed')
    }
  )

  test('preserves the avatar and public owner identifier contract', async () => {
    const { tx, writes } = createTransaction()
    await expect(createOwnerWithAccountLink(tx, 7, { ...PROFILE, avatarId: 22 })).resolves.toBe(
      OWNER.documentId
    )
    expect(writes).toContainEqual({ table: owners, values: { ...PROFILE, avatarId: 22 } })
  })

  test('stops when the owner insert returns no row', async () => {
    const { tx, writes } = createTransaction({ emptyOwner: true })
    await expect(createOwnerWithAccountLink(tx, 7, PROFILE)).rejects.toThrow(
      'Owner insert returned no row'
    )
    expect(writes).toHaveLength(1)
  })
})
