import { count } from 'drizzle-orm'
import { OTP_TYPE } from '@repo/types'
import { db } from '../../../client.ts'
import { otps } from '../../../schema/otp.ts'
import { withMercadoPagoConnectionOtpOwnerLock } from './owner-lock.ts'
import {
  getMercadoPagoConnectionOtpIssuanceWindowConditions,
  getPendingMercadoPagoConnectionOtpConditions,
} from './predicates.ts'
import type {
  IssueMercadoPagoConnectionOtpInput,
  IssueMercadoPagoConnectionOtpResult,
  MercadoPagoConnectionOtpOwnerInput,
  OtpTransaction,
} from './types.ts'

async function supersedePendingInTransaction(
  tx: OtpTransaction,
  input: MercadoPagoConnectionOtpOwnerInput & { now: Date }
): Promise<number> {
  const invalidated = await tx
    .update(otps)
    .set({ invalidatedAt: input.now, updatedAt: input.now })
    .where(getPendingMercadoPagoConnectionOtpConditions(input))
    .returning({ id: otps.id })
  return invalidated.length > 0 ? 1 : 0
}

/** Counts every issuance in the owner window, including consumed and invalidated challenges. */
export async function countMercadoPagoConnectionOtpIssuancesSince(input: {
  ownerDocumentId: string
  since: Date
}): Promise<number> {
  const [row] = await db
    .select({ count: count() })
    .from(otps)
    .where(getMercadoPagoConnectionOtpIssuanceWindowConditions(input))
  return Number(row?.count ?? 0)
}

/** Atomically checks the issuance budget, supersedes pending OTPs, and stores a replacement. */
export async function issueMercadoPagoConnectionOtp(
  input: IssueMercadoPagoConnectionOtpInput
): Promise<IssueMercadoPagoConnectionOtpResult> {
  return withMercadoPagoConnectionOtpOwnerLock(input.ownerDocumentId, async (tx) => {
    const [window] = await tx
      .select({ count: count() })
      .from(otps)
      .where(
        getMercadoPagoConnectionOtpIssuanceWindowConditions({
          ownerDocumentId: input.ownerDocumentId,
          since: input.issuanceWindowStartedAt,
        })
      )
    if (Number(window?.count ?? 0) >= input.maximumIssuances) {
      return { kind: 'issuance_limit_reached' }
    }

    await supersedePendingInTransaction(tx, input)
    const [otp] = await tx
      .insert(otps)
      .values({
        documentId: input.documentId,
        type: input.type ?? OTP_TYPE.MERCADO_PAGO_CONNECTION,
        subjectDocumentId: input.ownerDocumentId,
        scope: input.organizationScope,
        codeHash: input.codeHash,
        expiresAt: input.expiresAt,
        updatedAt: input.now,
      })
      .returning()
    if (!otp) throw new Error('Mercado Pago connection OTP insert did not return a row')
    return { kind: 'issued', otp }
  })
}

/** Invalidates every still-active Mercado Pago connection OTP before a new issuance. */
export async function supersedePendingMercadoPagoConnectionOtps(
  input: MercadoPagoConnectionOtpOwnerInput & { now: Date }
): Promise<number> {
  return withMercadoPagoConnectionOtpOwnerLock(input.ownerDocumentId, (tx) =>
    supersedePendingInTransaction(tx, input)
  )
}
