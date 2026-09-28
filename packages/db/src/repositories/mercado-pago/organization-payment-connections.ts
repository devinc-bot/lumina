import { and, eq, lt, or, isNull } from 'drizzle-orm'
import {
  DEFAULT_MERCADO_PAGO_SETTLEMENT_TERM,
  ORGANIZATION_PAYMENT_CONNECTION_STATUS,
  PAYMENT_PROVIDER,
  type MercadoPagoConnectionResponse,
  type MercadoPagoSettlementTerm,
  type OrganizationPaymentConnectionStatus,
} from '@repo/types'
import { db } from '../../client.ts'
import { organizationPaymentConnections } from '../../schema/organization-payment-connection.ts'

export async function findMercadoPagoConnectionByOrganizationId(organizationId: number) {
  const [connection] = await db
    .select()
    .from(organizationPaymentConnections)
    .where(
      and(
        eq(organizationPaymentConnections.organizationId, organizationId),
        eq(organizationPaymentConnections.provider, PAYMENT_PROVIDER.MERCADO_PAGO)
      )
    )
    .limit(1)
  return connection ?? null
}

export async function findMercadoPagoConnectionById(connectionId: number) {
  const [connection] = await db
    .select()
    .from(organizationPaymentConnections)
    .where(eq(organizationPaymentConnections.id, connectionId))
    .limit(1)
  return connection ?? null
}

export async function findConnectedMercadoPagoConnectionByOrganizationId(organizationId: number) {
  const [connection] = await db
    .select()
    .from(organizationPaymentConnections)
    .where(
      and(
        eq(organizationPaymentConnections.organizationId, organizationId),
        eq(organizationPaymentConnections.provider, PAYMENT_PROVIDER.MERCADO_PAGO),
        eq(organizationPaymentConnections.status, ORGANIZATION_PAYMENT_CONNECTION_STATUS.CONNECTED)
      )
    )
    .limit(1)
  return connection ?? null
}

export async function findConnectedMercadoPagoConnectionBySellerId(sellerId: string) {
  const [connection] = await db
    .select()
    .from(organizationPaymentConnections)
    .where(
      and(
        eq(organizationPaymentConnections.sellerId, sellerId),
        eq(organizationPaymentConnections.provider, PAYMENT_PROVIDER.MERCADO_PAGO),
        eq(organizationPaymentConnections.status, ORGANIZATION_PAYMENT_CONNECTION_STATUS.CONNECTED)
      )
    )
    .limit(1)
  return connection ?? null
}

export async function upsertMercadoPagoConnection(input: {
  organizationId: number
  sellerId: string
  isLiveMode: boolean
  grantedScopes: string[]
  accessTokenEncrypted: string
  refreshTokenEncrypted: string
  accessTokenExpiresAt: Date
  encryptionKeyVersion: string
  now: Date
}) {
  const [connection] = await db
    .insert(organizationPaymentConnections)
    .values({
      ...input,
      provider: PAYMENT_PROVIDER.MERCADO_PAGO,
      status: ORGANIZATION_PAYMENT_CONNECTION_STATUS.CONNECTED,
      isLiveMode: input.isLiveMode ? 1 : 0,
      connectedAt: input.now,
      refreshedAt: input.now,
      updatedAt: input.now,
    })
    .onConflictDoUpdate({
      target: [
        organizationPaymentConnections.organizationId,
        organizationPaymentConnections.provider,
      ],
      set: {
        sellerId: input.sellerId,
        status: ORGANIZATION_PAYMENT_CONNECTION_STATUS.CONNECTED,
        isLiveMode: input.isLiveMode ? 1 : 0,
        grantedScopes: input.grantedScopes,
        accessTokenEncrypted: input.accessTokenEncrypted,
        refreshTokenEncrypted: input.refreshTokenEncrypted,
        accessTokenExpiresAt: input.accessTokenExpiresAt,
        encryptionKeyVersion: input.encryptionKeyVersion,
        connectedAt: input.now,
        refreshedAt: input.now,
        reconnectRequiredAt: null,
        revokedAt: null,
        failureCode: null,
        updatedAt: input.now,
      },
    })
    .returning()
  if (!connection) throw new Error('Mercado Pago connection upsert did not return a row')
  return connection
}

export async function markMercadoPagoConnectionConnecting(organizationId: number, now: Date) {
  await db
    .insert(organizationPaymentConnections)
    .values({
      organizationId,
      provider: PAYMENT_PROVIDER.MERCADO_PAGO,
      status: ORGANIZATION_PAYMENT_CONNECTION_STATUS.CONNECTING,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: [
        organizationPaymentConnections.organizationId,
        organizationPaymentConnections.provider,
      ],
      set: {
        status: ORGANIZATION_PAYMENT_CONNECTION_STATUS.CONNECTING,
        failureCode: null,
        updatedAt: now,
      },
    })
}

export async function markMercadoPagoConnectionReconnectRequired(input: {
  organizationId: number
  now: Date
  failureCode: string
}) {
  await db
    .update(organizationPaymentConnections)
    .set({
      status: ORGANIZATION_PAYMENT_CONNECTION_STATUS.RECONNECT_REQUIRED,
      reconnectRequiredAt: input.now,
      failureCode: input.failureCode,
      updatedAt: input.now,
    })
    .where(
      and(
        eq(organizationPaymentConnections.organizationId, input.organizationId),
        eq(organizationPaymentConnections.provider, PAYMENT_PROVIDER.MERCADO_PAGO)
      )
    )
}

export async function rotateMercadoPagoConnectionCredentials(input: {
  connectionId: number
  refreshLockToken: string
  accessTokenEncrypted: string
  refreshTokenEncrypted: string
  accessTokenExpiresAt: Date
  now: Date
}) {
  const result = await db
    .update(organizationPaymentConnections)
    .set({
      accessTokenEncrypted: input.accessTokenEncrypted,
      refreshTokenEncrypted: input.refreshTokenEncrypted,
      accessTokenExpiresAt: input.accessTokenExpiresAt,
      refreshLockToken: null,
      refreshLockExpiresAt: null,
      refreshedAt: input.now,
      failureCode: null,
      updatedAt: input.now,
    })
    .where(
      and(
        eq(organizationPaymentConnections.id, input.connectionId),
        eq(organizationPaymentConnections.refreshLockToken, input.refreshLockToken)
      )
    )
    .returning({ id: organizationPaymentConnections.id })
  return { rotated: result.length === 1 }
}

/** Claims a short, durable lease before exchanging a one-time refresh token. */
export async function claimMercadoPagoConnectionRefreshLease(input: {
  connectionId: number
  refreshLockToken: string
  now: Date
  expiresAt: Date
}) {
  const [connection] = await db
    .update(organizationPaymentConnections)
    .set({
      refreshLockToken: input.refreshLockToken,
      refreshLockExpiresAt: input.expiresAt,
      updatedAt: input.now,
    })
    .where(
      and(
        eq(organizationPaymentConnections.id, input.connectionId),
        or(
          isNull(organizationPaymentConnections.refreshLockExpiresAt),
          lt(organizationPaymentConnections.refreshLockExpiresAt, input.now)
        )
      )
    )
    .returning()
  return connection ?? null
}

export async function releaseMercadoPagoConnectionRefreshLease(input: {
  connectionId: number
  refreshLockToken: string
  now: Date
}) {
  await db
    .update(organizationPaymentConnections)
    .set({ refreshLockToken: null, refreshLockExpiresAt: null, updatedAt: input.now })
    .where(
      and(
        eq(organizationPaymentConnections.id, input.connectionId),
        eq(organizationPaymentConnections.refreshLockToken, input.refreshLockToken)
      )
    )
}

export async function disconnectMercadoPagoConnection(organizationId: number, now: Date) {
  await db
    .update(organizationPaymentConnections)
    .set({
      status: ORGANIZATION_PAYMENT_CONNECTION_STATUS.DISCONNECTED,
      accessTokenEncrypted: null,
      refreshTokenEncrypted: null,
      revokedAt: now,
      updatedAt: now,
    })
    .where(
      and(
        eq(organizationPaymentConnections.organizationId, organizationId),
        eq(organizationPaymentConnections.provider, PAYMENT_PROVIDER.MERCADO_PAGO)
      )
    )
}

export async function updateMercadoPagoConnectionSettlementTerm(input: {
  organizationId: number
  settlementTerm: MercadoPagoSettlementTerm
  now: Date
}) {
  await db
    .update(organizationPaymentConnections)
    .set({ settlementTerm: input.settlementTerm, updatedAt: input.now })
    .where(
      and(
        eq(organizationPaymentConnections.organizationId, input.organizationId),
        eq(organizationPaymentConnections.provider, PAYMENT_PROVIDER.MERCADO_PAGO)
      )
    )
}

export function toMercadoPagoConnectionResponse(
  connection: Awaited<ReturnType<typeof findMercadoPagoConnectionByOrganizationId>>
): MercadoPagoConnectionResponse {
  return {
    status:
      (connection?.status as OrganizationPaymentConnectionStatus | undefined) ??
      ORGANIZATION_PAYMENT_CONNECTION_STATUS.DISCONNECTED,
    sellerId: connection?.sellerId ?? null,
    settlementTerm: connection?.settlementTerm ?? DEFAULT_MERCADO_PAGO_SETTLEMENT_TERM,
    connectedAt: connection?.connectedAt ?? null,
    refreshedAt: connection?.refreshedAt ?? null,
    reconnectRequiredAt: connection?.reconnectRequiredAt ?? null,
  }
}
