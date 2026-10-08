import { expect, test } from 'vitest'
import { otps } from './otp.ts'

test('stores typed, reusable OTP challenges without a plaintext code', () => {
  expect(otps.documentId).toBeDefined()
  expect(otps.type).toBeDefined()
  expect(otps.subjectDocumentId).toBeDefined()
  expect(otps.scope).toBeDefined()
  expect(otps.codeHash).toBeDefined()
  expect(otps.expiresAt).toBeDefined()
  expect(otps.failedAttempts).toBeDefined()
  expect(otps.consumedAt).toBeDefined()
  expect(otps.invalidatedAt).toBeDefined()
  expect(otps).not.toHaveProperty('code')
})
