export const MAIL_SENDER_TYPE = {
  NO_REPLY: 'no_reply',
  SUPPORT: 'support',
} as const

export type MailSenderType = (typeof MAIL_SENDER_TYPE)[keyof typeof MAIL_SENDER_TYPE]
