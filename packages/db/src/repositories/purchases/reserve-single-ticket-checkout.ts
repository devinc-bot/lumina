import { eq, sql } from 'drizzle-orm'
import {
  INVENTORY_RESERVATION_STATUS,
  PAYMENT_ATTEMPT_STATUS,
  PAYMENT_PROVIDER,
  PURCHASE_STATUS,
} from '@repo/types'
import type { PaymentCredentialSource, PriceBreakdown } from '@repo/types'
import { db } from '../../client.ts'
import {
  inventoryReservations,
  type InventoryReservationSelect,
} from '../../schema/inventory-reservation.ts'
import { payments, type PaymentSelect } from '../../schema/payment.ts'
import { purchaseItems, type PurchaseItemSelect } from '../../schema/purchase-item.ts'
import { purchases, type PurchaseSelect } from '../../schema/purchase.ts'
import { tickets } from '../../schema/ticket.ts'

export type ReserveSingleTicketCheckoutInput = {
  userId: number
  ticketId: number
  quantity: number
  currency: string
  expiresAt: Date
  now: Date
  priceBreakdown: PriceBreakdown
  credentialSource: PaymentCredentialSource
  organizationPaymentConnectionId: number | null
  providerSellerId: string | null
  credentialAccessTokenEncrypted: string | null
  credentialRefreshTokenEncrypted: string | null
  credentialAccessTokenExpiresAt: Date | null
}

export type ReservedSingleTicketCheckout = {
  purchase: PurchaseSelect
  purchaseItem: PurchaseItemSelect
  reservation: InventoryReservationSelect
  payment: PaymentSelect
}

type TicketAllocation = {
  legacyCompletedQuantity: number | string
  normalizedConfirmedQuantity: number | string
  activeReservedQuantity: number | string
}

function toQuantity(value: number | string): number {
  return typeof value === 'number' ? value : Number(value)
}

export async function reserveSingleTicketCheckout(
  input: ReserveSingleTicketCheckoutInput
): Promise<ReservedSingleTicketCheckout | null> {
  return db.transaction(async (tx) => {
    await tx.execute(sql`select id from tickets where id = ${input.ticketId} for update`)

    const [ticket] = await tx.select().from(tickets).where(eq(tickets.id, input.ticketId)).limit(1)
    if (!ticket) return null

    const allocation = await tx.execute<TicketAllocation>(sql`
      select
        coalesce((
          select sum(o.quantity)
          from orders o
          where o.ticket_id = ${input.ticketId} and o.status = 'completed'
        ), 0) as "legacyCompletedQuantity",
        coalesce((
          select sum(pi.quantity)
          from purchase_items pi
          join purchases p on p.id = pi.purchase_id
          left join orders o on o.document_id = p.document_id
          where pi.ticket_id = ${input.ticketId}
            and p.status = ${PURCHASE_STATUS.CONFIRMED}
            and o.id is null
        ), 0) as "normalizedConfirmedQuantity",
        coalesce((
          select sum(r.quantity)
          from inventory_reservations r
          join purchase_items pi on pi.id = r.purchase_item_id
          where pi.ticket_id = ${input.ticketId}
            and r.status = ${INVENTORY_RESERVATION_STATUS.ACTIVE}
            and r.expires_at > ${input.now}
        ), 0) as "activeReservedQuantity"
    `)
    const quantities = allocation.rows[0]
    if (!quantities) throw new Error('Ticket allocation query returned no row')

    const allocatedQuantity =
      toQuantity(quantities.legacyCompletedQuantity) +
      toQuantity(quantities.normalizedConfirmedQuantity) +
      toQuantity(quantities.activeReservedQuantity)
    if (ticket.quantity - allocatedQuantity < input.quantity) return null

    const lineTotal = ticket.price * input.quantity
    const toMajorAmount = (amount: number) => amount / 100
    const [purchase] = await tx
      .insert(purchases)
      .values({
        userId: input.userId,
        status: PURCHASE_STATUS.PENDING,
        totalAmount: toMajorAmount(input.priceBreakdown.totalAmount),
        subtotalAmount: toMajorAmount(input.priceBreakdown.subtotalAmount),
        platformFeeAmount: toMajorAmount(input.priceBreakdown.platformFeeAmount),
        providerFeeQuotedAmount: toMajorAmount(input.priceBreakdown.providerFeeQuotedAmount),
        pricingPolicyVersion: input.priceBreakdown.pricingPolicyVersion,
        isProviderFeeEstimated: input.priceBreakdown.isProviderFeeEstimated ? 1 : 0,
        currency: input.currency,
        expiresAt: input.expiresAt,
        stateVersion: 0,
        updatedAt: input.now,
      })
      .returning()
    if (!purchase) throw new Error('Purchase insert returned no row')

    const [purchaseItem] = await tx
      .insert(purchaseItems)
      .values({
        purchaseId: purchase.id,
        ticketId: ticket.id,
        quantity: input.quantity,
        unitPrice: ticket.price,
        lineTotal,
        updatedAt: input.now,
      })
      .returning()
    if (!purchaseItem) throw new Error('Purchase item insert returned no row')

    const [reservation] = await tx
      .insert(inventoryReservations)
      .values({
        purchaseItemId: purchaseItem.id,
        quantity: input.quantity,
        status: INVENTORY_RESERVATION_STATUS.ACTIVE,
        expiresAt: input.expiresAt,
        updatedAt: input.now,
      })
      .returning()
    if (!reservation) throw new Error('Inventory reservation insert returned no row')

    const [payment] = await tx
      .insert(payments)
      .values({
        purchaseId: purchase.id,
        provider: PAYMENT_PROVIDER.MERCADO_PAGO,
        status: PAYMENT_ATTEMPT_STATUS.PENDING,
        amount: toMajorAmount(input.priceBreakdown.totalAmount),
        currency: input.currency,
        credentialSource: input.credentialSource,
        organizationPaymentConnectionId: input.organizationPaymentConnectionId,
        providerSellerId: input.providerSellerId,
        credentialAccessTokenEncrypted: input.credentialAccessTokenEncrypted,
        credentialRefreshTokenEncrypted: input.credentialRefreshTokenEncrypted,
        credentialAccessTokenExpiresAt: input.credentialAccessTokenExpiresAt,
        updatedAt: input.now,
      })
      .returning()
    if (!payment) throw new Error('Payment insert returned no row')

    return { purchase, purchaseItem, reservation, payment }
  })
}
