import type { Transaction } from '../../client.ts'
import { organizationAccountsLnk } from '../../schema/organization-account-lnk.ts'
import { organizations } from '../../schema/organization.ts'
import type { OwnerSelect } from '../../schema/owner.ts'
import { normalizeSlug } from '../slug.ts'

export async function provisionOwnerOrganization(
  tx: Transaction,
  accountId: number,
  owner: Pick<OwnerSelect, 'documentId' | 'name' | 'lastName'>
): Promise<void> {
  const name = `${owner.name} ${owner.lastName}`.trim()
  const [organization] = await tx
    .insert(organizations)
    .values({ name, slug: `${normalizeSlug(name)}-${owner.documentId}` })
    .returning({ id: organizations.id })

  if (!organization) {
    throw new Error('Organization insert returned no row')
  }

  await tx.insert(organizationAccountsLnk).values({ organizationId: organization.id, accountId })
}
