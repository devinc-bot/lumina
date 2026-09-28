import { afterEach, expect, test, vi } from 'vitest'

vi.mock('../../../config/env', () => ({
  ENV: {
    MERCADOPAGO_MARKETPLACE_CLIENT_ID: 'marketplace-client-id',
    MERCADOPAGO_MARKETPLACE_CLIENT_SECRET: 'marketplace-client-secret',
    MERCADOPAGO_OAUTH_REDIRECT_URI: 'https://dashboard.lumina.test/settings/mercado-pago/callback',
  },
}))

import { MercadoPagoOAuthHttpAdapter } from './mercado-pago-oauth.http-adapter.ts'

const CODE_VERIFIER = 'dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk'
const CODE_CHALLENGE = 'E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM'

afterEach(() => {
  vi.unstubAllGlobals()
})

test('builds an OAuth authorization URL with an S256 PKCE challenge', () => {
  const adapter = new MercadoPagoOAuthHttpAdapter()

  const url = new URL(adapter.getAuthorizationUrl('opaque-state', CODE_VERIFIER))

  expect(url.origin + url.pathname).toBe('https://auth.mercadopago.com/authorization')
  expect(url.searchParams.get('client_id')).toBe('marketplace-client-id')
  expect(url.searchParams.get('response_type')).toBe('code')
  expect(url.searchParams.get('state')).toBe('opaque-state')
  expect(url.searchParams.get('code_challenge')).toBe(CODE_CHALLENGE)
  expect(url.searchParams.get('code_challenge_method')).toBe('S256')
})

test('sends the one-time PKCE verifier when exchanging an authorization code', async () => {
  const fetchMock = vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({
      access_token: 'seller-access-token',
      refresh_token: 'seller-refresh-token',
      user_id: 987,
      expires_in: 3600,
      live_mode: true,
      scope: 'offline_access payments write',
    }),
  })
  vi.stubGlobal('fetch', fetchMock)
  const adapter = new MercadoPagoOAuthHttpAdapter()

  await expect(
    adapter.exchangeAuthorizationCode('authorization-code', CODE_VERIFIER)
  ).resolves.toEqual({
    accessToken: 'seller-access-token',
    refreshToken: 'seller-refresh-token',
    sellerId: '987',
    expiresInSeconds: 3600,
    isLiveMode: true,
    scopes: ['offline_access', 'payments', 'write'],
  })

  expect(fetchMock).toHaveBeenCalledTimes(1)
  const [url, request] = fetchMock.mock.calls[0] as [string, RequestInit]
  expect(url).toBe('https://api.mercadopago.com/oauth/token')
  expect(request).toMatchObject({
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
  })
  const body = new URLSearchParams(request.body as URLSearchParams)
  expect(body.get('grant_type')).toBe('authorization_code')
  expect(body.get('code')).toBe('authorization-code')
  expect(body.get('code_verifier')).toBe(CODE_VERIFIER)
})
