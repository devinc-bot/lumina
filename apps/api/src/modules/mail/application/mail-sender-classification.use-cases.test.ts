import { describe, expect, test, vi } from 'vitest'
import { MAIL_SENDER_TYPE } from '@repo/types'
import type { SendMailUseCase } from './send-mail.use-case'
import type { MailTemplatesService } from './services/mail-templates.service'
import { SendPasswordResetUseCase } from './send-password-reset.use-case.ts'
import { SendStaffInvitationUseCase } from './send-staff-invitation.use-case.ts'
import { SendUserRegistrationUseCase } from './send-user-registration.use-case.ts'
import { SendWelcomeUseCase } from './send-welcome.use-case.ts'

const rendered = {
  subject: 'Subject',
  html: '<p>Mail</p>',
  text: 'Mail',
} as const

function createDependencies() {
  return {
    templates: {
      renderPasswordReset: vi.fn().mockResolvedValue(rendered),
      renderStaffInvitation: vi.fn().mockResolvedValue(rendered),
      renderUserRegistration: vi.fn().mockResolvedValue(rendered),
      renderWelcome: vi.fn().mockResolvedValue(rendered),
    } as unknown as MailTemplatesService,
    sendMail: {
      execute: vi.fn().mockResolvedValue({ id: 'ses-message-id-1' }),
    } as unknown as SendMailUseCase,
  }
}

function expectNoReplyClassification(sendMail: SendMailUseCase, to: string) {
  expect(sendMail.execute).toHaveBeenCalledWith({
    to,
    ...rendered,
    senderType: MAIL_SENDER_TYPE.NO_REPLY,
  })
}

describe('automated mail sender classifications', () => {
  test('password-reset mail explicitly uses no-reply', async () => {
    const { templates, sendMail } = createDependencies()
    const useCase = new SendPasswordResetUseCase(templates, sendMail)

    await useCase.execute('user@example.test', {} as never)

    expectNoReplyClassification(sendMail, 'user@example.test')
  })

  test('user and owner registration verification mail explicitly uses no-reply', async () => {
    const { templates, sendMail } = createDependencies()
    const useCase = new SendUserRegistrationUseCase(templates, sendMail)

    await useCase.execute('owner@example.test', {} as never)

    expectNoReplyClassification(sendMail, 'owner@example.test')
  })

  test('staff invitation mail explicitly uses no-reply', async () => {
    const { templates, sendMail } = createDependencies()
    const useCase = new SendStaffInvitationUseCase(templates, sendMail)

    await useCase.execute('staff@example.test', {} as never)

    expectNoReplyClassification(sendMail, 'staff@example.test')
  })

  test('welcome mail explicitly uses no-reply', async () => {
    const { templates, sendMail } = createDependencies()
    const useCase = new SendWelcomeUseCase(templates, sendMail)

    await useCase.execute('user@example.test', {} as never)

    expectNoReplyClassification(sendMail, 'user@example.test')
  })
})
