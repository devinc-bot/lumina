import { createElement } from 'react'
import { render } from 'react-email'
import { describe, expect, test } from 'vitest'
import { MercadoPagoConnectionOtpEmail } from './mercado-pago-connection-otp.tsx'

describe('Mercado Pago connection OTP email template', () => {
  test('renders a six-digit code as content without a link or URL fallback', async () => {
    const html = await render(
      createElement(MercadoPagoConnectionOtpEmail, {
        preview: 'Código de seguridad de Mercado Pago',
        title: 'Conectá Mercado Pago',
        brand: 'Lumina',
        body: 'Usá este código para conectar Mercado Pago.',
        codeLabel: 'Tu código de verificación',
        code: '007142',
        expires: 'Este código vence en 15 minutos.',
        ignore: 'Si no solicitaste este cambio, ignorá este correo.',
        footer: 'Este correo fue enviado por Lumina.',
        copyright: '© 2026 Lumina. Todos los derechos reservados.',
        lang: 'es',
      })
    )

    expect(html).toMatch(/<html[^>]*\slang="es"/i)
    expect(html).toContain('007142')
    expect(html).toContain('15 minutos')
    expect(html).not.toMatch(/href=/i)
  })
})
