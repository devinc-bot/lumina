import { OTP_CODE_LENGTH, OTP_TYPE } from '@repo/types'
import { z } from 'zod'

const OTP_CODE_PATTERN = new RegExp(`^\\d{${OTP_CODE_LENGTH}}$`)

export const otpTypeSchema = z.enum(OTP_TYPE)

export const otpCodeSchema = z.string().regex(OTP_CODE_PATTERN)

export const verifyOtpSchema = z
  .object({
    otpDocumentId: z.uuid(),
    code: otpCodeSchema,
  })
  .strict()

export type VerifyOtpInput = z.infer<typeof verifyOtpSchema>

export const otpChallengeResponseSchema = z
  .object({
    otpDocumentId: z.uuid(),
    type: otpTypeSchema,
    expiresAt: z.iso.datetime(),
    maskedDestination: z.string().min(1),
    resendAvailableAt: z.iso.datetime(),
  })
  .strict()

export type OtpChallengeResponseInput = z.infer<typeof otpChallengeResponseSchema>
