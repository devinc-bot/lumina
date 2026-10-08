import { expect, test } from 'vitest'
import { MAIL_SENDER_TYPE } from './mail-sender.ts'

test('exposes the supported internal mail sender types', () => {
  expect(MAIL_SENDER_TYPE).toEqual({
    NO_REPLY: 'no_reply',
    SUPPORT: 'support',
  })
})
