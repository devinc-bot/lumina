import type { MailSenderType } from '@repo/types'

export type SendMailInput = {
  to: string | string[]
  subject: string
  html: string
  text?: string
  senderType: MailSenderType
}

export type SendMailResult = {
  id: string
}

export type RenderedMail = {
  subject: string
  html: string
  text: string
}
