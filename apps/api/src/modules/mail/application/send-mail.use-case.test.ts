import { expect, test, vi } from 'vitest'
import { MAIL_SENDER_TYPE } from '@repo/types'
import type { MailSender } from '../mail-sender.port'
import type { SendMailInput } from '../types'
import { SendMailUseCase } from './send-mail.use-case.ts'
import type { MailConfigService } from './services/mail-config.service'

test('checks the selected sender type before forwarding mail to the provider', async () => {
  const input: SendMailInput = {
    to: 'user@example.test',
    subject: 'Support request',
    html: '<p>Support request</p>',
    senderType: MAIL_SENDER_TYPE.SUPPORT,
  }
  const mailSender = {
    send: vi.fn().mockResolvedValue({ id: 'ses-message-id-1' }),
  } as unknown as MailSender
  const mailConfig = {
    assertConfigured: vi.fn(),
  } as unknown as MailConfigService
  const useCase = new SendMailUseCase(mailSender, mailConfig)

  await expect(useCase.execute(input)).resolves.toEqual({ id: 'ses-message-id-1' })

  expect(mailConfig.assertConfigured).toHaveBeenCalledWith(MAIL_SENDER_TYPE.SUPPORT)
  expect(mailSender.send).toHaveBeenCalledWith(input)
})
