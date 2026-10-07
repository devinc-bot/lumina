import { Inject, Injectable } from '@nestjs/common'
import { DEFAULT_LANGUAGE, type Language } from '@repo/i18n'
import { MAIL_SENDER_TYPE } from '@repo/types'
import type { SendMailResult, WelcomeRenderInput } from '../types'
import { MailTemplatesService } from './services/mail-templates.service'
import { SendMailUseCase } from './send-mail.use-case'

@Injectable()
export class SendWelcomeUseCase {
  constructor(
    @Inject(MailTemplatesService) private readonly templates: MailTemplatesService,
    @Inject(SendMailUseCase) private readonly sendMail: SendMailUseCase
  ) {}

  async execute(
    to: string,
    input: WelcomeRenderInput,
    language: Language = DEFAULT_LANGUAGE
  ): Promise<SendMailResult> {
    const rendered = await this.templates.renderWelcome(input, language)
    return this.sendMail.execute({ to, ...rendered, senderType: MAIL_SENDER_TYPE.NO_REPLY })
  }
}
