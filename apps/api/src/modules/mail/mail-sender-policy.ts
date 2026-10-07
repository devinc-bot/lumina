import { MAIL_SENDER_TYPE, type MailSenderType } from '@repo/types'

const MAIL_SENDER_LOCAL_PART = {
  [MAIL_SENDER_TYPE.NO_REPLY]: 'no-reply',
  [MAIL_SENDER_TYPE.SUPPORT]: 'support',
} as const

export type MailSenderPolicy = {
  from: string
  replyTo?: string
}

export function resolveMailSenderPolicy(
  senderType: MailSenderType,
  mailDomain: string,
  mailReplyTo: string
): MailSenderPolicy | null {
  const domain = mailDomain.trim()
  if (domain === '') {
    return null
  }

  if (senderType === MAIL_SENDER_TYPE.NO_REPLY) {
    return { from: `${MAIL_SENDER_LOCAL_PART[senderType]}@${domain}` }
  }

  const replyTo = mailReplyTo.trim()
  if (replyTo === '') {
    return null
  }

  return {
    from: `${MAIL_SENDER_LOCAL_PART[senderType]}@${domain}`,
    replyTo,
  }
}
