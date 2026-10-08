import { eq } from 'drizzle-orm'
import { OTP_MAX_FAILED_ATTEMPTS } from '@repo/types'
import { db } from '../../../client.ts'
import { otps, type OtpSelect } from '../../../schema/otp.ts'
import { withMercadoPagoConnectionOtpOwnerLock } from './owner-lock.ts'
import {
  getActiveMercadoPagoConnectionOtpConditions,
  getMercadoPagoConnectionOtpDeliveryFailureConditions,
} from './predicates.ts'
import type { LockedMercadoPagoConnectionOtpInput, OtpTransaction } from './types.ts'

type LockedOtpContext = {
  tx: OtpTransaction
  challenge: OtpSelect
  now: Date
}

/** Runs a callback while holding an owner lock and an active owner-bound challenge row. */
export async function withLockedActiveMercadoPagoConnectionOtp<TResult>(
  input: LockedMercadoPagoConnectionOtpInput,
  callback: (context: LockedOtpContext) => Promise<TResult>
): Promise<TResult | null> {
  return withMercadoPagoConnectionOtpOwnerLock(input.ownerDocumentId, async (tx) => {
    const now = new Date()
    const [challenge] = await tx
      .select()
      .from(otps)
      .where(getActiveMercadoPagoConnectionOtpConditions({ ...input, now }))
      .for('update')
    if (!challenge) return null
    return callback({ tx, challenge, now })
  })
}

/** Invalidates only the newly issued challenge whose mail delivery failed. */
export async function invalidateMercadoPagoConnectionOtpForDeliveryFailure(
  input: LockedMercadoPagoConnectionOtpInput
): Promise<boolean> {
  const invalidated = await db
    .update(otps)
    .set({ invalidatedAt: input.now, updatedAt: input.now })
    .where(getMercadoPagoConnectionOtpDeliveryFailureConditions(input))
    .returning({ id: otps.id })
  return invalidated.length > 0
}

/** Consumes a locked challenge after dependent writes succeed in the same transaction. */
export async function consumeLockedMercadoPagoConnectionOtp<TResult>(
  input: LockedMercadoPagoConnectionOtpInput,
  callback: (context: LockedOtpContext) => Promise<TResult>
): Promise<TResult | null> {
  return withLockedActiveMercadoPagoConnectionOtp(input, async ({ tx, challenge, now }) => {
    const result = await callback({ tx, challenge, now })
    const [consumed] = await tx
      .update(otps)
      .set({ consumedAt: now, updatedAt: now })
      .where(eq(otps.id, challenge.id))
      .returning({ id: otps.id })
    if (!consumed) throw new Error('Locked Mercado Pago connection OTP could not be consumed')
    return result
  })
}

/** Records a failed active verification and invalidates the fourth failure. */
export async function recordMercadoPagoConnectionOtpFailure(
  input: LockedMercadoPagoConnectionOtpInput
): Promise<{ failedAttempts: number; invalidated: boolean } | null> {
  return withLockedActiveMercadoPagoConnectionOtp(input, async ({ tx, challenge, now }) => {
    const failedAttempts = challenge.failedAttempts + 1
    const invalidated = failedAttempts >= OTP_MAX_FAILED_ATTEMPTS
    const [updated] = await tx
      .update(otps)
      .set({ failedAttempts, invalidatedAt: invalidated ? now : null, updatedAt: now })
      .where(eq(otps.id, challenge.id))
      .returning({ id: otps.id })
    if (!updated) throw new Error('Locked Mercado Pago connection OTP could not record a failure')
    return { failedAttempts, invalidated }
  })
}
