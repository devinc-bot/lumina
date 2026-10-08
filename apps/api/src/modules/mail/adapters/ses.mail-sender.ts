import {
  Inject,
  Injectable,
  InternalServerErrorException,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common'
import { SESv2Client, SendEmailCommand } from '@aws-sdk/client-sesv2'
import { MAIL_ERROR_CODE } from '@repo/i18n/constants'
import { TranslationService } from '@repo/i18n/server'
import { ENV } from '../../../config/env'
import { resolveMailSenderPolicy } from '../mail-sender-policy'
import type { MailSender } from '../mail-sender.port'
import type { SendMailInput, SendMailResult } from '../types'

@Injectable()
export class SesMailSender implements MailSender {
  private readonly client: SESv2Client
  private readonly logger = new Logger(SesMailSender.name)

  constructor(@Inject(TranslationService) private readonly ts: TranslationService) {
    const hasExplicitCredentials =
      ENV.AWS_ACCESS_KEY_ID.length > 0 && ENV.AWS_SECRET_ACCESS_KEY.length > 0

    this.client = new SESv2Client(
      hasExplicitCredentials
        ? {
            region: ENV.AWS_REGION,
            credentials: {
              accessKeyId: ENV.AWS_ACCESS_KEY_ID,
              secretAccessKey: ENV.AWS_SECRET_ACCESS_KEY,
            },
          }
        : { region: ENV.AWS_REGION }
    )
  }

  async send(input: SendMailInput): Promise<SendMailResult> {
    const policy = resolveMailSenderPolicy(input.senderType, ENV.MAIL_DOMAIN, ENV.MAIL_REPLY_TO)
    if (policy === null) {
      throw new ServiceUnavailableException(this.ts.translateError(MAIL_ERROR_CODE.NOT_CONFIGURED))
    }

    const command = new SendEmailCommand({
      FromEmailAddress: policy.from,
      Destination: {
        ToAddresses: Array.isArray(input.to) ? input.to : [input.to],
      },
      ...(policy.replyTo !== undefined ? { ReplyToAddresses: [policy.replyTo] } : {}),
      Content: {
        Simple: {
          Subject: { Data: input.subject, Charset: 'UTF-8' },
          Body: {
            Html: { Data: input.html, Charset: 'UTF-8' },
            ...(input.text !== undefined ? { Text: { Data: input.text, Charset: 'UTF-8' } } : {}),
          },
        },
      },
    })

    try {
      const response = await this.client.send(command)
      if (!response.MessageId) {
        this.logger.error('SES send failed: missing MessageId')
        throw new InternalServerErrorException(this.ts.translateError(MAIL_ERROR_CODE.SEND_FAILED))
      }
      return { id: response.MessageId }
    } catch (error) {
      if (error instanceof InternalServerErrorException) {
        throw error
      }
      this.logger.error(
        `SES send failed: ${error instanceof Error ? error.message : 'unknown error'}`,
        error instanceof Error ? error.stack : undefined
      )
      throw new InternalServerErrorException(this.ts.translateError(MAIL_ERROR_CODE.SEND_FAILED))
    }
  }
}
