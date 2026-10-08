import { InternalServerErrorException, ServiceUnavailableException } from '@nestjs/common'
import { beforeEach, describe, expect, test, vi } from 'vitest'
import { MAIL_ERROR_CODE } from '@repo/i18n/constants'
import type { TranslationService } from '@repo/i18n/server'
import { MAIL_SENDER_TYPE } from '@repo/types'

const envState = vi.hoisted(() => ({
  AWS_REGION: 'sa-east-1',
  AWS_ACCESS_KEY_ID: '',
  AWS_SECRET_ACCESS_KEY: '',
  MAIL_DOMAIN: 'dev.lumina-events.com',
  MAIL_REPLY_TO: 'luminaeventssupport@gmail.com',
}))

const ses = vi.hoisted(() => ({
  clientConfigs: [] as Array<Record<string, unknown>>,
  send: vi.fn(),
}))

vi.mock('../../../config/env', () => ({
  ENV: envState,
}))

vi.mock('@aws-sdk/client-sesv2', () => ({
  SESv2Client: class SESv2Client {
    constructor(config: Record<string, unknown>) {
      ses.clientConfigs.push(config)
    }

    send = ses.send
  },
  SendEmailCommand: class SendEmailCommand {
    constructor(public readonly input: unknown) {}
  },
}))

import { SesMailSender } from './ses.mail-sender.ts'

const translationService = {
  translateError: (code: string) => code,
} as TranslationService

const baseInput = {
  to: 'user@example.test',
  subject: 'Hello',
  html: '<p>Hello</p>',
  text: 'Hello',
  senderType: MAIL_SENDER_TYPE.NO_REPLY,
} as const

function createSender() {
  return new SesMailSender(translationService)
}

async function expectHttpError(
  action: () => Promise<unknown>,
  Exception: typeof ServiceUnavailableException | typeof InternalServerErrorException,
  code: string
) {
  try {
    await action()
    expect.unreachable('expected send to throw')
  } catch (error) {
    expect(error).toBeInstanceOf(Exception)
    const response = (error as InstanceType<typeof Exception>).getResponse()
    const message =
      typeof response === 'string' ? response : (response as { message: string }).message
    expect(message).toBe(code)
  }
}

describe('SesMailSender', () => {
  beforeEach(() => {
    envState.AWS_REGION = 'sa-east-1'
    envState.AWS_ACCESS_KEY_ID = ''
    envState.AWS_SECRET_ACCESS_KEY = ''
    envState.MAIL_DOMAIN = 'dev.lumina-events.com'
    envState.MAIL_REPLY_TO = 'luminaeventssupport@gmail.com'
    ses.clientConfigs.length = 0
    vi.clearAllMocks()
    ses.send.mockResolvedValue({ MessageId: 'ses-message-id-1' })
  })

  test('returns MessageId from SESv2 SendEmail as { id }', async () => {
    const sender = createSender()

    await expect(sender.send({ ...baseInput })).resolves.toEqual({ id: 'ses-message-id-1' })
  })

  test('maps no-reply mail to the derived sender and omits ReplyToAddresses despite configured support Gmail', async () => {
    const sender = createSender()

    await sender.send({ ...baseInput })

    expect(ses.clientConfigs.at(-1)).toMatchObject({ region: 'sa-east-1' })
    expect(ses.send).toHaveBeenCalledTimes(1)
    expect(ses.send.mock.calls[0]?.[0]?.input).toEqual({
      FromEmailAddress: 'no-reply@dev.lumina-events.com',
      Destination: {
        ToAddresses: ['user@example.test'],
      },
      Content: {
        Simple: {
          Subject: { Data: 'Hello', Charset: 'UTF-8' },
          Body: {
            Html: { Data: '<p>Hello</p>', Charset: 'UTF-8' },
            Text: { Data: 'Hello', Charset: 'UTF-8' },
          },
        },
      },
    })
  })

  test('maps to string[] into Destination.ToAddresses', async () => {
    const sender = createSender()

    await sender.send({
      ...baseInput,
      to: ['a@example.test', 'b@example.test'],
    })

    expect(ses.send.mock.calls[0]?.[0]?.input).toMatchObject({
      Destination: {
        ToAddresses: ['a@example.test', 'b@example.test'],
      },
    })
  })

  test('omits Body.Text when text is not provided', async () => {
    const sender = createSender()

    await sender.send({
      to: 'user@example.test',
      subject: 'Hello',
      html: '<p>Hello</p>',
      senderType: MAIL_SENDER_TYPE.NO_REPLY,
    })

    const body = ses.send.mock.calls[0]?.[0]?.input?.Content?.Simple?.Body
    expect(body).toEqual({
      Html: { Data: '<p>Hello</p>', Charset: 'UTF-8' },
    })
    expect(body).not.toHaveProperty('Text')
  })

  test('maps support mail to the derived sender and trimmed configured Gmail reply-to', async () => {
    envState.MAIL_REPLY_TO = '  luminaeventssupport@gmail.com  '
    const sender = createSender()

    await sender.send({ ...baseInput, senderType: MAIL_SENDER_TYPE.SUPPORT })

    const input = ses.send.mock.calls[0]?.[0]?.input
    expect(input).toEqual({
      FromEmailAddress: 'support@dev.lumina-events.com',
      Destination: {
        ToAddresses: ['user@example.test'],
      },
      ReplyToAddresses: ['luminaeventssupport@gmail.com'],
      Content: {
        Simple: {
          Subject: { Data: 'Hello', Charset: 'UTF-8' },
          Body: {
            Html: { Data: '<p>Hello</p>', Charset: 'UTF-8' },
            Text: { Data: 'Hello', Charset: 'UTF-8' },
          },
        },
      },
    })
  })

  test('keeps sender policy isolated across consecutive support and no-reply sends', async () => {
    const sender = createSender()

    await sender.send({ ...baseInput, senderType: MAIL_SENDER_TYPE.SUPPORT })
    await sender.send({ ...baseInput, senderType: MAIL_SENDER_TYPE.NO_REPLY })

    expect(ses.send.mock.calls[0]?.[0]?.input).toMatchObject({
      FromEmailAddress: 'support@dev.lumina-events.com',
      ReplyToAddresses: ['luminaeventssupport@gmail.com'],
    })
    expect(ses.send.mock.calls[1]?.[0]?.input).toMatchObject({
      FromEmailAddress: 'no-reply@dev.lumina-events.com',
    })
    expect(ses.send.mock.calls[1]?.[0]?.input).not.toHaveProperty('ReplyToAddresses')
  })

  test('constructs SESv2Client with explicit credentials when both AWS keys are set', () => {
    envState.AWS_ACCESS_KEY_ID = 'AKIATEST'
    envState.AWS_SECRET_ACCESS_KEY = 'secret-test'
    createSender()

    expect(ses.clientConfigs.at(-1)).toEqual({
      region: 'sa-east-1',
      credentials: {
        accessKeyId: 'AKIATEST',
        secretAccessKey: 'secret-test',
      },
    })
  })

  test('constructs SESv2Client without credentials when both AWS keys are empty', () => {
    createSender()

    expect(ses.clientConfigs.at(-1)).toEqual({ region: 'sa-east-1' })
  })

  test('throws NOT_CONFIGURED when MAIL_DOMAIN is empty', async () => {
    envState.MAIL_DOMAIN = ''
    const sender = createSender()

    await expectHttpError(
      () => sender.send({ ...baseInput }),
      ServiceUnavailableException,
      MAIL_ERROR_CODE.NOT_CONFIGURED
    )
    expect(ses.send).not.toHaveBeenCalled()
  })

  test('throws NOT_CONFIGURED when MAIL_DOMAIN is whitespace only', async () => {
    envState.MAIL_DOMAIN = '   '
    const sender = createSender()

    await expectHttpError(
      () => sender.send({ ...baseInput }),
      ServiceUnavailableException,
      MAIL_ERROR_CODE.NOT_CONFIGURED
    )
    expect(ses.send).not.toHaveBeenCalled()
  })

  test('throws NOT_CONFIGURED for support when MAIL_REPLY_TO is blank without disabling no-reply mail', async () => {
    envState.MAIL_REPLY_TO = '   '
    const sender = createSender()

    await expectHttpError(
      () => sender.send({ ...baseInput, senderType: MAIL_SENDER_TYPE.SUPPORT }),
      ServiceUnavailableException,
      MAIL_ERROR_CODE.NOT_CONFIGURED
    )
    await expect(
      sender.send({ ...baseInput, senderType: MAIL_SENDER_TYPE.NO_REPLY })
    ).resolves.toEqual({
      id: 'ses-message-id-1',
    })
  })

  test('throws SEND_FAILED when SES send rejects', async () => {
    ses.send.mockRejectedValue(new Error('SES rejected'))
    const sender = createSender()

    await expectHttpError(
      () => sender.send({ ...baseInput }),
      InternalServerErrorException,
      MAIL_ERROR_CODE.SEND_FAILED
    )
  })

  test('throws SEND_FAILED when SES response has no MessageId', async () => {
    ses.send.mockResolvedValue({})
    const sender = createSender()

    await expectHttpError(
      () => sender.send({ ...baseInput }),
      InternalServerErrorException,
      MAIL_ERROR_CODE.SEND_FAILED
    )
  })
})
