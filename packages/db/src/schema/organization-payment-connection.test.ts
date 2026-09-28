import { expect, test } from 'vitest'
import { organizationPaymentConnections } from './organization-payment-connection.ts'

test('persists the Mercado Pago settlement term on every organization connection', () => {
  expect(organizationPaymentConnections.settlementTerm).toBeDefined()
})
