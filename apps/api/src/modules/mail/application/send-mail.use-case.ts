import { Inject, Injectable } from '@nestjs/common'
import type { MailSender } from '../mail-sender.port'
import type { SendMailInput, SendMailResult } from '../types'
import { MAIL_SENDER } from '../mail.tokens'
import { MailConfigService } from './services/mail-config.service'

@Injectable()
export class SendMailUseCase {
  constructor(
    @Inject(MAIL_SENDER) private readonly mailSender: MailSender,
    @Inject(MailConfigService) private readonly mailConfig: MailConfigService
  ) {}

  async execute(input: SendMailInput): Promise<SendMailResult> {
    this.mailConfig.assertConfigured(input.senderType)
    return this.mailSender.send(input)
  }
}
