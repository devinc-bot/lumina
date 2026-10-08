import { describe, expect, test, vi } from 'vitest'
import { MAIL_SENDER_TYPE, OTP_TYPE } from '@repo/types'
import type { MailTemplatesService } from './services/mail-templates.service'
import type { SendMailUseCase } from './send-mail.use-case'
import { SendMercadoPagoConnectionOtpUseCase } from './send-mercado-pago-connection-otp.use-case'

const rendered = {
  subject: 'Mercado Pago security code',
  html: '<p>007142</p>',
  text: '007142',
} as const

function createDependencies() {
  return {
    templates: {
      renderMercadoPagoConnectionOtp: vi.fn().mockResolvedValue(rendered),
    } as unknown as MailTemplatesService,
    sendMail: {
      execute: vi.fn().mockResolvedValue({ id: 'ses-message-id-1' }),
    } as unknown as SendMailUseCase,
  }
}

describe('SendMercadoPagoConnectionOtpUseCase', () => {
  test('renders a connection code in the recipient language and explicitly uses no-reply', async () => {
    const { templates, sendMail } = createDependencies()
    const useCase = new SendMercadoPagoConnectionOtpUseCase(templates, sendMail)

    await expect(
      useCase.execute(
        'owner@example.test',
        { code: '007142', type: OTP_TYPE.MERCADO_PAGO_CONNECTION },
        'en'
      )
    ).resolves.toEqual({ id: 'ses-message-id-1' })

    expect(templates.renderMercadoPagoConnectionOtp).toHaveBeenCalledWith(
      { code: '007142', type: OTP_TYPE.MERCADO_PAGO_CONNECTION },
      'en'
    )
    expect(sendMail.execute).toHaveBeenCalledWith({
      to: 'owner@example.test',
      ...rendered,
      senderType: MAIL_SENDER_TYPE.NO_REPLY,
    })
  })

  test('preserves a mail-provider failure for the OTP issuer to invalidate the exact challenge', async () => {
    const { templates, sendMail } = createDependencies()
    const providerError = new Error('mail provider rejected the message')
    vi.mocked(sendMail.execute).mockRejectedValueOnce(providerError)
    const useCase = new SendMercadoPagoConnectionOtpUseCase(templates, sendMail)

    await expect(
      useCase.execute('owner@example.test', {
        code: '007142',
        type: OTP_TYPE.MERCADO_PAGO_DISCONNECTION,
      })
    ).rejects.toBe(providerError)
  })
})
