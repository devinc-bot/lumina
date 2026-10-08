import { and, eq, gt, gte, isNull } from 'drizzle-orm'
import { OTP_TYPE } from '@repo/types'
import { otps } from '../../../schema/otp.ts'
import type {
  LockedMercadoPagoConnectionOtpInput,
  MercadoPagoConnectionOtpOwnerInput,
} from './types.ts'

export function getMercadoPagoConnectionOtpOwnerConditions(
  input: MercadoPagoConnectionOtpOwnerInput
) {
  return and(
    eq(otps.type, input.type ?? OTP_TYPE.MERCADO_PAGO_CONNECTION),
    eq(otps.subjectDocumentId, input.ownerDocumentId),
    eq(otps.scope, input.organizationScope)
  )
}

export function getActiveMercadoPagoConnectionOtpConditions(
  input: LockedMercadoPagoConnectionOtpInput
) {
  return and(
    getMercadoPagoConnectionOtpOwnerConditions(input),
    eq(otps.documentId, input.documentId),
    isNull(otps.consumedAt),
    isNull(otps.invalidatedAt),
    gt(otps.expiresAt, input.now)
  )
}

export function getPendingMercadoPagoConnectionOtpConditions(
  input: MercadoPagoConnectionOtpOwnerInput & { now: Date }
) {
  return and(
    getMercadoPagoConnectionOtpOwnerConditions(input),
    isNull(otps.consumedAt),
    isNull(otps.invalidatedAt),
    gt(otps.expiresAt, input.now)
  )
}

export function getMercadoPagoConnectionOtpDeliveryFailureConditions(
  input: LockedMercadoPagoConnectionOtpInput
) {
  return and(
    getMercadoPagoConnectionOtpOwnerConditions(input),
    eq(otps.documentId, input.documentId),
    isNull(otps.consumedAt),
    isNull(otps.invalidatedAt)
  )
}

export function getMercadoPagoConnectionOtpIssuanceWindowConditions(input: {
  ownerDocumentId: string
  since: Date
}) {
  return and(eq(otps.subjectDocumentId, input.ownerDocumentId), gte(otps.createdAt, input.since))
}
