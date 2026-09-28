import { and, desc, eq, isNotNull } from 'drizzle-orm'
import { PAYMENT_CREDENTIAL_SOURCE } from '@repo/types'
import { db } from '../../client.ts'
import { payments } from '../../schema/payment.ts'

/** Finds a persisted seller credential snapshot for a marketplace webhook. */
export async function findMercadoPagoPaymentCredentialSnapshotBySellerId(sellerId: string) {
  const [payment] = await db
    .select({
      accessTokenEncrypted: payments.credentialAccessTokenEncrypted,
      refreshTokenEncrypted: payments.credentialRefreshTokenEncrypted,
      accessTokenExpiresAt: payments.credentialAccessTokenExpiresAt,
    })
    .from(payments)
    .where(
      and(
        eq(payments.providerSellerId, sellerId),
        eq(payments.credentialSource, PAYMENT_CREDENTIAL_SOURCE.ORGANIZATION_CONNECTION),
        isNotNull(payments.credentialAccessTokenEncrypted)
      )
    )
    .orderBy(desc(payments.createdAt))
    .limit(1)
  return payment ?? null
}
