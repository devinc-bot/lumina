import { describe, expect, test, vi } from 'vitest'
import { OTP_TYPE } from '@repo/types'
import type { Language } from '@repo/i18n'
import type { TranslationService } from '@repo/i18n/server'
import { MailTemplatesService } from './mail-templates.service'

const localizedCopy = {
  es: {
    connection: 'Conectá tu cuenta de Mercado Pago',
    disconnection: 'Desconectá tu cuenta de Mercado Pago',
    expires: 'Este código vence en 15 minutos.',
  },
  en: {
    connection: 'Connect your Mercado Pago account',
    disconnection: 'Disconnect your Mercado Pago account',
    expires: 'This code expires in 15 minutes.',
  },
} as const

function createTemplates() {
  const translations = {
    translateEmail: vi.fn((key: string, _vars: Record<string, unknown>, language: Language) => {
      const copy = localizedCopy[language]
      if (key === 'common.brand') return 'Lumina'
      if (key === 'common.footer')
        return language === 'es' ? 'Correo de Lumina.' : 'Email from Lumina.'
      if (key === 'common.copyright') return '© 2026 Lumina'
      if (key.includes('disconnect')) return copy.disconnection
      if (key.includes('expires')) return copy.expires
      return copy.connection
    }),
  } as unknown as TranslationService

  return { templates: new MailTemplatesService(translations), translations }
}

describe('Mercado Pago OTP mail rendering', () => {
  test('renders a Spanish connection code with a 15-minute expiry and no action URL', async () => {
    const { templates } = createTemplates()
    const rendered = await templates.renderMercadoPagoConnectionOtp(
      { code: '007142', type: OTP_TYPE.MERCADO_PAGO_CONNECTION },
      'es'
    )

    expect(rendered.subject).toContain('Mercado Pago')
    expect(rendered.text).toContain(localizedCopy.es.connection)
    expect(rendered.text).toContain('007142')
    expect(rendered.text).toContain('15 minutos')
    expect(rendered.html).toMatch(/<html[^>]*\slang="es"/i)
    expect(rendered.html).not.toMatch(/href=/i)
  })

  test('renders English disconnect copy rather than connection copy', async () => {
    const { templates } = createTemplates()
    const rendered = await templates.renderMercadoPagoConnectionOtp(
      { code: '007142', type: OTP_TYPE.MERCADO_PAGO_DISCONNECTION },
      'en'
    )

    expect(rendered.subject).toContain('Mercado Pago')
    expect(rendered.text).toContain(localizedCopy.en.disconnection)
    expect(rendered.text).toContain('007142')
    expect(rendered.text).toContain('15 minutes')
    expect(rendered.html).toMatch(/<html[^>]*\slang="en"/i)
    expect(rendered.html).not.toMatch(/href=/i)
  })
})
