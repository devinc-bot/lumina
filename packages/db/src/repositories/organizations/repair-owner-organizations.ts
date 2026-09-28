import { eq, isNull } from 'drizzle-orm'
import { db, type Transaction } from '../../client.ts'
import { accounts } from '../../schema/account.ts'
import { organizationAccountsLnk } from '../../schema/organization-account-lnk.ts'
import { ownerAccountsLnk } from '../../schema/owner-account-lnk.ts'
import { owners } from '../../schema/owner.ts'
import { provisionOwnerOrganization } from './provision-owner-organization.ts'

export async function repairOwnerOrganizations(
  { apply }: { apply: boolean },
  database: typeof db = db
): Promise<{ orphanCount: number; repairedCount: number }> {
  const orphans = await database
    .select({
      ownerDocumentId: owners.documentId,
      accountId: ownerAccountsLnk.accountId,
      name: owners.name,
      lastName: owners.lastName,
    })
    .from(owners)
    .innerJoin(ownerAccountsLnk, eq(ownerAccountsLnk.ownerId, owners.id))
    .leftJoin(
      organizationAccountsLnk,
      eq(organizationAccountsLnk.accountId, ownerAccountsLnk.accountId)
    )
    .where(isNull(organizationAccountsLnk.id))

  let repairedCount = 0
  if (apply) {
    for (const owner of orphans) {
      const repaired = await database.transaction(async (tx: Transaction) => {
        // Serialize repairs for this account, then read membership in a fresh statement.
        const [account] = await tx
          .select({ id: accounts.id })
          .from(accounts)
          .where(eq(accounts.id, owner.accountId))
          .for('update')
        if (!account) return false

        const memberships = await tx
          .select({ id: organizationAccountsLnk.id })
          .from(organizationAccountsLnk)
          .where(eq(organizationAccountsLnk.accountId, owner.accountId))
          .limit(1)
        if (memberships.length > 0) return false

        await provisionOwnerOrganization(tx, owner.accountId, {
          ...owner,
          documentId: owner.ownerDocumentId,
        })
        return true
      })
      if (repaired) repairedCount += 1
    }
  }

  return { orphanCount: orphans.length, repairedCount }
}
