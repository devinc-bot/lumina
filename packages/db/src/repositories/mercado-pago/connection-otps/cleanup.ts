import { asc, inArray, lte } from 'drizzle-orm'
import { db } from '../../../client.ts'
import { otps } from '../../../schema/otp.ts'
import type { OtpTransaction } from './types.ts'

/** Deletes expired challenges, including challenges already consumed or invalidated. */
export async function deleteExpiredMercadoPagoConnectionOtps(cutoff: Date): Promise<number> {
  const deleted = await db
    .delete(otps)
    .where(lte(otps.expiresAt, cutoff))
    .returning({ id: otps.id })
  return deleted.length
}

/** Deletes a bounded batch so a scheduled cleanup can report whether work remains. */
export async function deleteExpiredMercadoPagoConnectionOtpBatch(input: {
  cutoff: Date
  limit: number
}): Promise<{ deletedCount: number; hasMore: boolean }> {
  return db.transaction(async (tx: OtpTransaction) => {
    const candidates = await tx
      .select({ id: otps.id })
      .from(otps)
      .where(lte(otps.expiresAt, input.cutoff))
      .orderBy(asc(otps.expiresAt))
      .limit(input.limit + 1)
    const ids = candidates.slice(0, input.limit).map((candidate) => candidate.id)
    if (ids.length === 0) return { deletedCount: 0, hasMore: false }
    const deleted = await tx.delete(otps).where(inArray(otps.id, ids)).returning({ id: otps.id })
    return { deletedCount: deleted.length, hasMore: candidates.length > input.limit }
  })
}
