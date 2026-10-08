import type { Transaction } from '../../../client.ts'
import type { OtpSelect } from '../../../schema/otp.ts'
import type { OtpType } from '@repo/types'

export type MercadoPagoConnectionOtpOwnerInput = {
  ownerDocumentId: string
  organizationScope: string
  type?: OtpType
}

export type LockedMercadoPagoConnectionOtpInput = MercadoPagoConnectionOtpOwnerInput & {
  documentId: string
  now: Date
}

export type IssueMercadoPagoConnectionOtpInput = MercadoPagoConnectionOtpOwnerInput & {
  documentId?: string
  codeHash: string
  expiresAt: Date
  now: Date
  issuanceWindowStartedAt: Date
  maximumIssuances: number
}

export type IssueMercadoPagoConnectionOtpResult =
  | { kind: 'issued'; otp: OtpSelect }
  | { kind: 'issuance_limit_reached' }

export type OtpTransaction = Transaction
