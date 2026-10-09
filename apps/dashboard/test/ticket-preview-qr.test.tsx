// @vitest-environment jsdom
import { createElement } from 'react'
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, expect, test, vi } from 'vitest'
import type { TicketRecordItem } from '../app/modules/tickets/components/ticket-record'
import en from '../../../packages/i18n/src/locales/tickets/en.json'
import es from '../../../packages/i18n/src/locales/tickets/es.json'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    i18n: { language: 'es' },
    t: (key: string) =>
      ({
        'preview.qrNotValid': 'Muestra: no válido para ingresar',
      })[key] ?? key,
  }),
}))

vi.mock('react-qr-code', () => ({
  default: ({ value }: { value: string }) =>
    createElement('svg', { 'data-testid': 'sample-qr', 'data-value': value }),
}))

vi.mock('~/modules/tickets/components/ticket-dither-canvas', () => ({
  TicketDitherCanvas: () => null,
}))

import { TicketPreviewCard } from '../app/modules/tickets/components/ticket-preview-card'

const record: TicketRecordItem = {
  id: 'ticket-record-123',
  clubName: 'Sample Location',
  eventName: 'Sample Event',
  eventImageUrl: null,
  ticketType: 'General',
  description: '',
  price: 100,
  quantity: 10,
  totalSold: 0,
  revenue: 0,
  status: 'active',
}

afterEach(cleanup)

test('preview QR uses a fixed non-credential sample and labels it invalid for admission', () => {
  window.matchMedia = vi.fn().mockReturnValue({
    matches: true,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  })

  const first = render(createElement(TicketPreviewCard, { record }))
  const firstQr = screen.getByTestId('sample-qr')
  const payload = firstQr.getAttribute('data-value')
  expect(payload).toMatch(/^lumina:preview:/)
  expect(payload).not.toContain(record.id)
  expect(payload).not.toContain(record.eventName)
  expect(payload).not.toContain(record.ticketType)
  expect(screen.getByText('Muestra: no válido para ingresar')).toBeTruthy()
  expect(screen.getByRole('img', { name: 'Muestra: no válido para ingresar' })).toBeTruthy()

  first.unmount()
  render(createElement(TicketPreviewCard, { record: { ...record, id: 'another-ticket' } }))
  expect(screen.getByTestId('sample-qr').getAttribute('data-value')).toBe(payload)
  expect(es.preview.qrNotValid).toMatch(/no v[aá]lido/i)
  expect(en.preview.qrNotValid).toMatch(/not valid/i)
})
