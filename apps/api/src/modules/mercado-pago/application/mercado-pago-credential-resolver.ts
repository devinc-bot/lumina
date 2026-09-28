import {
  claimMercadoPagoConnectionRefreshLease,
  findMercadoPagoConnectionById,
  markMercadoPagoConnectionReconnectRequired,
  releaseMercadoPagoConnectionRefreshLease,
  rotateMercadoPagoConnectionCredentials,
} from '@repo/db'
import type { OrganizationPaymentConnectionSelect } from '@repo/db'
import { randomUUID } from 'node:crypto'
import {
  decryptMercadoPagoCredential,
  encryptMercadoPagoCredential,
} from '../mercado-pago-credential-crypto'
import type { MercadoPagoOAuthPort } from '../mercado-pago-oauth.port'

const REFRESH_SKEW_MS = 60_000
const REFRESH_LEASE_MS = 30_000
const REFRESH_LEASE_RETRY_MS = 100
const MAX_REFRESH_LEASE_RETRIES = 10

/** Resolves one seller credential using a durable cross-instance refresh lease. */
export class MercadoPagoCredentialResolver {
  private readonly refreshes = new Map<number, Promise<string>>()

  constructor(private readonly oauth: MercadoPagoOAuthPort) {}

  resolve(
    connection: Pick<
      OrganizationPaymentConnectionSelect,
      | 'id'
      | 'organizationId'
      | 'accessTokenEncrypted'
      | 'refreshTokenEncrypted'
      | 'accessTokenExpiresAt'
    >,
    now = new Date()
  ): Promise<string> {
    if (!connection.accessTokenEncrypted || !connection.refreshTokenEncrypted) {
      return Promise.reject(new Error('Mercado Pago connection requires reconnection'))
    }
    if (
      connection.accessTokenExpiresAt &&
      connection.accessTokenExpiresAt.getTime() > now.getTime() + REFRESH_SKEW_MS
    ) {
      return Promise.resolve(decryptMercadoPagoCredential(connection.accessTokenEncrypted))
    }
    const activeRefresh = this.refreshes.get(connection.id)
    if (activeRefresh) return activeRefresh
    const refresh = this.refresh(connection, now).finally(() =>
      this.refreshes.delete(connection.id)
    )
    this.refreshes.set(connection.id, refresh)
    return refresh
  }

  private async refresh(
    connection: Pick<
      OrganizationPaymentConnectionSelect,
      'id' | 'organizationId' | 'refreshTokenEncrypted'
    >,
    now: Date
  ): Promise<string> {
    const refreshLockToken = randomUUID()
    const lease = await this.acquireRefreshLease(connection.id, refreshLockToken, now)
    if (!lease) {
      const current = await findMercadoPagoConnectionById(connection.id)
      if (
        current?.accessTokenEncrypted &&
        current.accessTokenExpiresAt &&
        current.accessTokenExpiresAt.getTime() > now.getTime() + REFRESH_SKEW_MS
      ) {
        return decryptMercadoPagoCredential(current.accessTokenEncrypted)
      }
      throw new Error('Mercado Pago credential refresh is already in progress')
    }
    try {
      if (!lease.refreshTokenEncrypted) throw new Error('missing refresh token')
      const tokens = await this.oauth.refresh(
        decryptMercadoPagoCredential(lease.refreshTokenEncrypted)
      )
      const rotated = await rotateMercadoPagoConnectionCredentials({
        connectionId: connection.id,
        refreshLockToken,
        accessTokenEncrypted: encryptMercadoPagoCredential(tokens.accessToken),
        refreshTokenEncrypted: encryptMercadoPagoCredential(tokens.refreshToken),
        accessTokenExpiresAt: new Date(now.getTime() + tokens.expiresInSeconds * 1000),
        now,
      })
      if (!rotated.rotated) throw new Error('Mercado Pago credential refresh lease was lost')
      return tokens.accessToken
    } catch {
      await markMercadoPagoConnectionReconnectRequired({
        organizationId: connection.organizationId,
        now,
        failureCode: 'refresh_failed',
      })
      throw new Error('Mercado Pago connection requires reconnection')
    } finally {
      await releaseMercadoPagoConnectionRefreshLease({
        connectionId: connection.id,
        refreshLockToken,
        now,
      })
    }
  }

  private async acquireRefreshLease(connectionId: number, refreshLockToken: string, now: Date) {
    for (let attempt = 0; attempt < MAX_REFRESH_LEASE_RETRIES; attempt += 1) {
      const lease = await claimMercadoPagoConnectionRefreshLease({
        connectionId,
        refreshLockToken,
        now,
        expiresAt: new Date(now.getTime() + REFRESH_LEASE_MS),
      })
      if (lease) return lease
      await new Promise<void>((resolve) => setTimeout(resolve, REFRESH_LEASE_RETRY_MS))
    }
    return null
  }
}
