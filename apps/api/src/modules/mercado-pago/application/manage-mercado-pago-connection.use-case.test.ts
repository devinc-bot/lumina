import { beforeEach, expect, test, vi } from 'vitest'

const repositories = vi.hoisted(() => ({
  consumeMercadoPagoOAuthState: vi.fn(),
  createMercadoPagoOAuthState: vi.fn(),
  disconnectMercadoPagoConnection: vi.fn(),
  findMercadoPagoConnectionByOrganizationId: vi.fn(),
  findSoleOrganizationByOwnerDocumentId: vi.fn(),
  toMercadoPagoConnectionResponse: vi.fn(),
  updateMercadoPagoConnectionSettlementTerm: vi.fn(),
  upsertMercadoPagoConnection: vi.fn(),
}))

const crypto = vi.hoisted(() => ({
  decryptMercadoPagoCredential: vi.fn((value: string) => `decrypted:${value}`),
  encryptMercadoPagoCredential: vi.fn((value: string) => `encrypted:${value}`),
}))

vi.mock('@repo/db', () => repositories)
vi.mock('../../../config/env', () => ({
  ENV: {
    MERCADOPAGO_CREDENTIAL_ENCRYPTION_KEY: 'test-key',
    MERCADOPAGO_CREDENTIAL_ENCRYPTION_KEY_VERSION: 'v1',
    MERCADOPAGO_MARKETPLACE_CLIENT_ID: 'client-id',
    MERCADOPAGO_MARKETPLACE_CLIENT_SECRET: 'client-secret',
    MERCADOPAGO_MARKETPLACE_ENABLED: true,
    MERCADOPAGO_OAUTH_REDIRECT_URI: 'https://dashboard.lumina.test/callback',
  },
}))
vi.mock('../mercado-pago-credential-crypto', () => crypto)

import { ManageMercadoPagoConnectionUseCase } from './manage-mercado-pago-connection.use-case.ts'

const OWNER_DOCUMENT_ID = 'owner-document-id'
const oauthTokens = {
  accessToken: 'seller-access-token',
  refreshToken: 'seller-refresh-token',
  sellerId: 'seller-1',
  expiresInSeconds: 3600,
  isLiveMode: true,
  scopes: ['offline_access', 'payments', 'write'],
}

beforeEach(() => {
  vi.clearAllMocks()
  repositories.findSoleOrganizationByOwnerDocumentId.mockResolvedValue({ id: 44 })
  repositories.createMercadoPagoOAuthState.mockResolvedValue({ id: 17 })
  repositories.consumeMercadoPagoOAuthState.mockResolvedValue(null)
  repositories.upsertMercadoPagoConnection.mockResolvedValue({ id: 23 })
  repositories.updateMercadoPagoConnectionSettlementTerm.mockResolvedValue(undefined)
  repositories.toMercadoPagoConnectionResponse.mockReturnValue({ status: 'connected' })
})

test('does not expose an ungated OAuth-start method', () => {
  expect(ManageMercadoPagoConnectionUseCase.prototype).not.toHaveProperty('start')
})

test('exchanges an authorization code with the verifier from the atomically consumed state only once', async () => {
  repositories.consumeMercadoPagoOAuthState.mockResolvedValue({
    organizationId: 44,
    ownerDocumentId: OWNER_DOCUMENT_ID,
    codeVerifierEncrypted: 'encrypted:original-verifier',
  })
  const oauth = {
    getAuthorizationUrl: vi.fn(),
    exchangeAuthorizationCode: vi.fn().mockResolvedValue(oauthTokens),
  }
  const useCase = new ManageMercadoPagoConnectionUseCase(oauth as never)

  await useCase.complete({ code: 'authorization-code', state: 'opaque-state' })

  expect(repositories.consumeMercadoPagoOAuthState).toHaveBeenCalledTimes(1)
  expect(oauth.exchangeAuthorizationCode).toHaveBeenCalledWith(
    'authorization-code',
    'decrypted:encrypted:original-verifier'
  )
})

test('lets an owner update the settlement term only for their own organization', async () => {
  const useCase = new ManageMercadoPagoConnectionUseCase({} as never)

  await useCase.updateSettlementTerm(OWNER_DOCUMENT_ID, '10_days')

  expect(repositories.updateMercadoPagoConnectionSettlementTerm).toHaveBeenCalledWith(
    expect.objectContaining({
      organizationId: 44,
      settlementTerm: '10_days',
    })
  )
})

test('does not update a settlement term when the caller has no owner organization', async () => {
  repositories.findSoleOrganizationByOwnerDocumentId.mockResolvedValue(null)
  const useCase = new ManageMercadoPagoConnectionUseCase({} as never)

  await expect(useCase.updateSettlementTerm('another-owner', 'instant')).rejects.toMatchObject({
    name: 'NotFoundException',
  })

  expect(repositories.updateMercadoPagoConnectionSettlementTerm).not.toHaveBeenCalled()
})
