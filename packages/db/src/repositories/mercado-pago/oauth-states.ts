import { and, eq, gt, isNull, lte } from 'drizzle-orm'
import { db } from '../../client.ts'
import { mercadoPagoOAuthStates } from '../../schema/mercado-pago-oauth-state.ts'

export async function createMercadoPagoOAuthState(input: {
  organizationId: number
  ownerDocumentId: string
  stateHash: string
  codeVerifierEncrypted: string
  expiresAt: Date
  now: Date
}) {
  const [state] = await db
    .insert(mercadoPagoOAuthStates)
    .values({ ...input, updatedAt: input.now })
    .returning()
  if (!state) throw new Error('Mercado Pago OAuth state insert did not return a row')
  return state
}

/** Atomically consumes an unexpired OAuth state, making callbacks non-replayable. */
export async function consumeMercadoPagoOAuthState(input: { stateHash: string; now: Date }) {
  const [state] = await db
    .update(mercadoPagoOAuthStates)
    .set({ consumedAt: input.now, updatedAt: input.now })
    .where(
      and(
        eq(mercadoPagoOAuthStates.stateHash, input.stateHash),
        isNull(mercadoPagoOAuthStates.consumedAt),
        gt(mercadoPagoOAuthStates.expiresAt, input.now)
      )
    )
    .returning()
  return state ?? null
}

/** Deletes OAuth state and encrypted PKCE material after the retention cutoff. */
export async function deleteExpiredMercadoPagoOAuthStatesBefore(cutoff: Date): Promise<number> {
  const deleted = await db
    .delete(mercadoPagoOAuthStates)
    .where(lte(mercadoPagoOAuthStates.expiresAt, cutoff))
    .returning({ id: mercadoPagoOAuthStates.id })
  return deleted.length
}
