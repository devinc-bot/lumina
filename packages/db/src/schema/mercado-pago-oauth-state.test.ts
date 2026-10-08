import { expect, test } from 'vitest'
import { mercadoPagoOAuthStates } from './mercado-pago-oauth-state.ts'

test('persists only an encrypted PKCE verifier on the one-time Mercado Pago OAuth state', () => {
  expect(mercadoPagoOAuthStates.codeVerifierEncrypted).toBeDefined()
  expect(mercadoPagoOAuthStates).not.toHaveProperty('codeVerifier')
  expect(mercadoPagoOAuthStates.stateHash).toBeDefined()
  expect(mercadoPagoOAuthStates.consumedAt).toBeDefined()
  expect(mercadoPagoOAuthStates.otpVerifiedAt).toBeDefined()
})
