import type { Transaction } from '../../client.ts'
import { ownerAccountsLnk } from '../../schema/owner-account-lnk.ts'
import { owners } from '../../schema/owner.ts'
import type { OwnerProfileSeed } from '@repo/types'
import { provisionOwnerOrganization } from '../organizations/provision-owner-organization.ts'

export async function createOwnerWithAccountLink(
  tx: Transaction,
  accountId: number,
  profile: OwnerProfileSeed
): Promise<string> {
  const [owner] = await tx
    .insert(owners)
    .values({
      name: profile.name,
      lastName: profile.lastName,
      phone: profile.phone,
      avatarId: profile.avatarId ?? null,
    })
    .returning()

  if (!owner) {
    throw new Error('Owner insert returned no row')
  }

  await tx.insert(ownerAccountsLnk).values({
    ownerId: owner.id,
    accountId,
  })

  await provisionOwnerOrganization(tx, accountId, { ...profile, documentId: owner.documentId })

  return owner.documentId
}
