import { expect, test } from 'vitest'
import { OTP_MAX_FAILED_ATTEMPTS, OTP_TTL_MINUTES, OTP_TYPE } from '@repo/types'
import {
  otpChallengeResponseSchema,
  otpCodeSchema,
  otpTypeSchema,
  verifyOtpSchema,
} from '../src/otp.ts'

test('accepts a six-digit OTP code including leading zeros', () => {
  expect(otpCodeSchema.safeParse('001234').success).toBe(true)
})

test('rejects malformed OTP codes', () => {
  expect(otpCodeSchema.safeParse('12345').success).toBe(false)
  expect(otpCodeSchema.safeParse('1234567').success).toBe(false)
  expect(otpCodeSchema.safeParse('12a456').success).toBe(false)
})

test('limits OTP types to approved shared actions', () => {
  expect(otpTypeSchema.safeParse(OTP_TYPE.MERCADO_PAGO_CONNECTION).success).toBe(true)
  expect(otpTypeSchema.safeParse(OTP_TYPE.MERCADO_PAGO_DISCONNECTION).success).toBe(true)
  expect(otpTypeSchema.safeParse('password_reset').success).toBe(false)
})

test('validates an OTP verification payload without accepting an action override', () => {
  expect(
    verifyOtpSchema.safeParse({
      otpDocumentId: '8057ac1b-2cea-4c02-9428-450d906b9b03',
      code: '001234',
    }).success
  ).toBe(true)
  expect(
    verifyOtpSchema.safeParse({
      otpDocumentId: '8057ac1b-2cea-4c02-9428-450d906b9b03',
      code: '001234',
      type: OTP_TYPE.MERCADO_PAGO_DISCONNECTION,
    }).success
  ).toBe(false)
})

test('rejects malformed OTP verification payloads', () => {
  expect(
    verifyOtpSchema.safeParse({
      otpDocumentId: 'not-a-uuid',
      code: '001234',
    }).success
  ).toBe(false)
  expect(
    verifyOtpSchema.safeParse({
      otpDocumentId: '8057ac1b-2cea-4c02-9428-450d906b9b03',
      code: 123456,
    }).success
  ).toBe(false)
})

test('defines the confirmed OTP security policy in shared constants', () => {
  expect(OTP_TTL_MINUTES).toBe(15)
  expect(OTP_MAX_FAILED_ATTEMPTS).toBe(4)
})

test('validates a safe challenge response without exposing sensitive OTP data', () => {
  const response = {
    otpDocumentId: '8057ac1b-2cea-4c02-9428-450d906b9b03',
    type: OTP_TYPE.MERCADO_PAGO_CONNECTION,
    expiresAt: '2026-10-07T00:15:00.000Z',
    maskedDestination: 'f***@example.com',
    resendAvailableAt: '2026-10-07T00:01:00.000Z',
  }

  expect(otpChallengeResponseSchema.safeParse(response).success).toBe(true)
  expect(
    otpChallengeResponseSchema.safeParse({
      ...response,
      code: '001234',
      codeHash: 'bcrypt-hash',
      recipientEmail: 'full-address@example.com',
    }).success
  ).toBe(false)
})
