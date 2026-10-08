export const OTP_TYPE = {
  MERCADO_PAGO_CONNECTION: 'mercado_pago_connection',
  MERCADO_PAGO_DISCONNECTION: 'mercado_pago_disconnection',
} as const

export type OtpType = (typeof OTP_TYPE)[keyof typeof OTP_TYPE]

export const OTP_MAX_FAILED_ATTEMPTS = 4

export const OTP_CODE_LENGTH = 6
export const OTP_TTL_MILLISECONDS = 15 * 60 * 1000
export const OTP_TTL_MINUTES = OTP_TTL_MILLISECONDS / (60 * 1000)
export const OTP_RESEND_COOLDOWN_MILLISECONDS = 60 * 1000
export const OTP_MAX_ISSUANCES_PER_WINDOW = 5

export const MERCADO_PAGO_OTP_ERROR_MESSAGE = {
  INVALID_OR_EXPIRED: 'Mercado Pago OTP is invalid or expired',
  REQUEST_LIMIT_REACHED: 'Too many Mercado Pago OTP requests',
} as const

export type OtpChallengeResponse = {
  otpDocumentId: string
  type: OtpType
  expiresAt: string
  maskedDestination: string
  resendAvailableAt: string
}

export type OtpVerificationInput = {
  otpDocumentId: string
  code: string
}

export const OTP_VERIFICATION_OUTCOME = {
  VERIFIED: 'verified',
  INVALID: 'invalid',
  EXPIRED: 'expired',
  ATTEMPT_LIMIT_REACHED: 'attempt_limit_reached',
} as const

export type OtpVerificationOutcome =
  (typeof OTP_VERIFICATION_OUTCOME)[keyof typeof OTP_VERIFICATION_OUTCOME]
