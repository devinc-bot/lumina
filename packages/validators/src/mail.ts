import { z } from 'zod'

const DNS_DOMAIN_LABEL = '[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?'
const MAX_EMAIL_ADDRESS_LENGTH = 254
const NO_REPLY_LOCAL_PART = 'no-reply'
const MAX_MAIL_DOMAIN_LENGTH = MAX_EMAIL_ADDRESS_LENGTH - NO_REPLY_LOCAL_PART.length - 1
const dnsDomainPattern = new RegExp(
  `^(?=.{1,${MAX_MAIL_DOMAIN_LENGTH}}$)(?:${DNS_DOMAIN_LABEL}\\.)+${DNS_DOMAIN_LABEL}$`
)
const emailSchema = z.email()

export const mailDomainSchema = z
  .string()
  .trim()
  .toLowerCase()
  .refine(
    (value) => value === '' || dnsDomainPattern.test(value),
    'validation:field.mailDomain.invalid'
  )

export const mailReplyToSchema = z
  .string()
  .trim()
  .refine(
    (value) => value === '' || emailSchema.safeParse(value).success,
    'validation:field.mailReplyTo.invalid'
  )
