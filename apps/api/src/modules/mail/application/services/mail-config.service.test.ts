import { beforeEach, describe, expect, test, vi } from 'vitest'
import { MAIL_ERROR_CODE } from '@repo/i18n/constants'
import type { TranslationService } from '@repo/i18n/server'
import { MAIL_SENDER_TYPE } from '@repo/types'

const envState = vi.hoisted(() => ({
  MAIL_DOMAIN: 'dev.lumina-events.com',
  MAIL_REPLY_TO: 'luminaeventssupport@gmail.com',
}))

vi.mock('../../../../config/env', () => ({
  ENV: envState,
}))

import { MailConfigService } from './mail-config.service.ts'

const translationService = {
  translateError: (code: string) => code,
} as TranslationService

describe('MailConfigService', () => {
  beforeEach(() => {
    envState.MAIL_DOMAIN = 'dev.lumina-events.com'
    envState.MAIL_REPLY_TO = 'luminaeventssupport@gmail.com'
  })

  test('isConfigured is true for no-reply when MAIL_DOMAIN is non-empty', () => {
    const service = new MailConfigService(translationService)

    expect(service.isConfigured(MAIL_SENDER_TYPE.NO_REPLY)).toBe(true)
  })

  test('isConfigured is false for no-reply when MAIL_DOMAIN is empty', () => {
    envState.MAIL_DOMAIN = ''
    const service = new MailConfigService(translationService)

    expect(service.isConfigured(MAIL_SENDER_TYPE.NO_REPLY)).toBe(false)
  })

  test('isConfigured is false for no-reply when MAIL_DOMAIN is whitespace only', () => {
    envState.MAIL_DOMAIN = '   '
    const service = new MailConfigService(translationService)

    expect(service.isConfigured(MAIL_SENDER_TYPE.NO_REPLY)).toBe(false)
  })

  test('isConfigured is false for support when MAIL_REPLY_TO is blank', () => {
    envState.MAIL_REPLY_TO = '   '
    const service = new MailConfigService(translationService)

    expect(service.isConfigured(MAIL_SENDER_TYPE.SUPPORT)).toBe(false)
  })

  test('assertConfigured keeps no-reply configured when MAIL_REPLY_TO is blank', () => {
    envState.MAIL_REPLY_TO = ''
    const service = new MailConfigService(translationService)

    expect(() => service.assertConfigured(MAIL_SENDER_TYPE.NO_REPLY)).not.toThrow()
  })

  test('assertConfigured rejects support when MAIL_REPLY_TO is blank', () => {
    envState.MAIL_REPLY_TO = ''
    const service = new MailConfigService(translationService)

    expect(() => service.assertConfigured(MAIL_SENDER_TYPE.SUPPORT)).toThrow(
      MAIL_ERROR_CODE.NOT_CONFIGURED
    )
  })
})
