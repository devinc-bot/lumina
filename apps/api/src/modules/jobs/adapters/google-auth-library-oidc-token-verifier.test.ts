import { beforeEach, expect, test, vi } from 'vitest'

const verifyIdToken = vi.fn()

vi.mock('google-auth-library', () => ({
  OAuth2Client: class {
    verifyIdToken = verifyIdToken
  },
}))

import { GoogleAuthLibraryOidcTokenVerifier } from './google-auth-library-oidc-token-verifier.ts'

beforeEach(() => {
  verifyIdToken.mockReset()
})

test('returns lowercase email when issuer and email_verified are valid', async () => {
  verifyIdToken.mockResolvedValue({
    getPayload: () => ({
      iss: 'https://accounts.google.com',
      email: 'Scheduler@Proj.iam.gserviceaccount.com',
      email_verified: true,
    }),
  })

  const verifier = new GoogleAuthLibraryOidcTokenVerifier()
  await expect(verifier.verify('token', 'https://api.example.com')).resolves.toEqual({
    email: 'scheduler@proj.iam.gserviceaccount.com',
  })
})

test('rejects when email_verified is not true', async () => {
  verifyIdToken.mockResolvedValue({
    getPayload: () => ({
      iss: 'https://accounts.google.com',
      email: 'scheduler@proj.iam.gserviceaccount.com',
      email_verified: false,
    }),
  })

  const verifier = new GoogleAuthLibraryOidcTokenVerifier()
  await expect(verifier.verify('token', 'https://api.example.com')).rejects.toThrow(
    /email is not verified/
  )
})

test('rejects disallowed issuer', async () => {
  verifyIdToken.mockResolvedValue({
    getPayload: () => ({
      iss: 'https://evil.example',
      email: 'scheduler@proj.iam.gserviceaccount.com',
      email_verified: true,
    }),
  })

  const verifier = new GoogleAuthLibraryOidcTokenVerifier()
  await expect(verifier.verify('token', 'https://api.example.com')).rejects.toThrow(
    /issuer not allowed/
  )
})
