import { and, eq, gt, isNotNull, isNull, lte } from 'drizzle-orm'
import { db, type Transaction } from '../../client.ts'
import { mercadoPagoOAuthStates } from '../../schema/mercado-pago-oauth-state.ts'

export async function createMercadoPagoOAuthState(
  input: {
    organizationId: number
    ownerDocumentId: string
    stateHash: string
    codeVerifierEncrypted: string
    expiresAt: Date
    otpVerifiedAt?: Date
    now: Date
  },
  transaction?: Pick<Transaction, 'insert'>
) {
  const client = transaction ?? db
  const [state] = await client
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
        isNotNull(mercadoPagoOAuthStates.otpVerifiedAt),
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

/** Creates an OAuth state within the caller's transaction when OTP consumption must be atomic. */
export async function createMercadoPagoOAuthStateInTransaction(
  transaction: import('../../client.ts').Transaction,
  input: {
    organizationId: number
    ownerDocumentId: string
    stateHash: string
    codeVerifierEncrypted: string
    expiresAt: Date
    otpVerifiedAt: Date
    now: Date
  }
) {
  const [state] = await transaction
    .insert(mercadoPagoOAuthStates)
    .values({ ...input, updatedAt: input.now })
    .returning()
  if (!state) throw new Error('Mercado Pago OAuth state insert did not return a row')
  return state
}
