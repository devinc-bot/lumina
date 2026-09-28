import { beforeEach, expect, test, vi } from 'vitest'
import { ORGANIZATION_PAYMENT_CONNECTION_STATUS } from '@repo/types'

const repositories = vi.hoisted(() => ({
  claimMercadoPagoConnectionRefreshLease: vi.fn(),
  findMercadoPagoConnectionById: vi.fn(),
  markMercadoPagoConnectionReconnectRequired: vi.fn(),
  releaseMercadoPagoConnectionRefreshLease: vi.fn(),
  rotateMercadoPagoConnectionCredentials: vi.fn(),
}))

vi.mock('@repo/db', () => repositories)
vi.mock('../mercado-pago-credential-crypto', () => ({
  decryptMercadoPagoCredential: (value: string) => `decrypted:${value}`,
  encryptMercadoPagoCredential: (value: string) => `encrypted:${value}`,
}))

import { MercadoPagoCredentialResolver } from './mercado-pago-credential-resolver.ts'

const now = new Date('2026-09-25T15:00:00.000Z')
const expiredConnection = {
  id: 91,
  organizationId: 44,
  status: ORGANIZATION_PAYMENT_CONNECTION_STATUS.CONNECTED,
  accessTokenEncrypted: 'expired-access-token',
  refreshTokenEncrypted: 'refresh-token',
  accessTokenExpiresAt: new Date('2026-09-25T14:59:59.000Z'),
  encryptionKeyVersion: 'v1',
}

beforeEach(() => {
  vi.clearAllMocks()
  repositories.claimMercadoPagoConnectionRefreshLease.mockResolvedValue(expiredConnection)
  repositories.releaseMercadoPagoConnectionRefreshLease.mockResolvedValue(undefined)
  repositories.rotateMercadoPagoConnectionCredentials.mockResolvedValue({ rotated: true })
  repositories.markMercadoPagoConnectionReconnectRequired.mockResolvedValue(undefined)
})

test('refreshes an expired seller token and atomically rotates the encrypted credential snapshot', async () => {
  const oauth = {
    refresh: vi.fn().mockResolvedValue({
      accessToken: 'fresh-access-token',
      refreshToken: 'fresh-refresh-token',
      sellerId: 'seller-44',
      isLiveMode: true,
      expiresInSeconds: 3600,
      scopes: ['offline_access', 'payments', 'write'],
    }),
  }
  const resolver = new MercadoPagoCredentialResolver(oauth as never)

  await expect(resolver.resolve(expiredConnection, now)).resolves.toBe('fresh-access-token')

  expect(oauth.refresh).toHaveBeenCalledWith('decrypted:refresh-token')
  expect(repositories.rotateMercadoPagoConnectionCredentials).toHaveBeenCalledWith(
    expect.objectContaining({
      connectionId: 91,
      accessTokenEncrypted: 'encrypted:fresh-access-token',
      refreshTokenEncrypted: 'encrypted:fresh-refresh-token',
      accessTokenExpiresAt: new Date('2026-09-25T16:00:00.000Z'),
      now,
    })
  )
})

test('marks the organization connection reconnect-required when refreshing its expired token fails', async () => {
  const oauth = {
    refresh: vi.fn().mockRejectedValue(new Error('invalid_grant')),
  }
  const resolver = new MercadoPagoCredentialResolver(oauth as never)

  await expect(resolver.resolve(expiredConnection, now)).rejects.toThrow(
    'Mercado Pago connection requires reconnection'
  )

  expect(repositories.markMercadoPagoConnectionReconnectRequired).toHaveBeenCalledWith({
    organizationId: 44,
    now,
    failureCode: 'refresh_failed',
  })
})
