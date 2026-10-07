import { Inject, Injectable, ServiceUnavailableException } from '@nestjs/common'
import { MAIL_ERROR_CODE } from '@repo/i18n/constants'
import { TranslationService } from '@repo/i18n/server'
import type { MailSenderType } from '@repo/types'
import { ENV } from '../../../../config/env'
import { resolveMailSenderPolicy } from '../../mail-sender-policy'

@Injectable()
export class MailConfigService {
  constructor(@Inject(TranslationService) private readonly ts: TranslationService) {}

  isConfigured(senderType: MailSenderType): boolean {
    return resolveMailSenderPolicy(senderType, ENV.MAIL_DOMAIN, ENV.MAIL_REPLY_TO) !== null
  }

  assertConfigured(senderType: MailSenderType): void {
    if (!this.isConfigured(senderType)) {
      throw new ServiceUnavailableException(this.ts.translateError(MAIL_ERROR_CODE.NOT_CONFIGURED))
    }
  }
}
