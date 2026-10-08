import { sql } from 'drizzle-orm'
import { db } from '../../../client.ts'
import type { OtpTransaction } from './types.ts'

/** Locks the actor before a challenge row to serialize issuance and verification across instances. */
export async function withMercadoPagoConnectionOtpOwnerLock<TResult>(
  ownerDocumentId: string,
  callback: (tx: OtpTransaction) => Promise<TResult>
): Promise<TResult> {
  return db.transaction(async (tx: OtpTransaction) => {
    if (typeof tx.execute === 'function') {
      await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${ownerDocumentId}))`)
    }
    return callback(tx)
  })
}
