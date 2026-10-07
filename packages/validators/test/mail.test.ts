import { expect, test } from 'vitest'
import { mailDomainSchema, mailReplyToSchema } from '../src/mail.ts'

test('normalizes valid mail domains including subdomains', () => {
  expect(mailDomainSchema.parse('  DEV.Lumina-Events.Com  ')).toBe('dev.lumina-events.com')
  expect(mailDomainSchema.parse('mail.eu.example.com')).toBe('mail.eu.example.com')
})

test.each([
  'support@example.com',
  'https://example.com',
  'example.com:2525',
  'example.com/path',
  'mail example.com',
  '-mail.example.com',
  'mail-.example.com',
  'mail..example.com',
  `${'a'.repeat(64)}.example.com`,
  `${'a'.repeat(64)}.${'b'.repeat(64)}.${'c'.repeat(64)}.${'d'.repeat(61)}.com`,
  `${'a'.repeat(63)}.${'b'.repeat(63)}.${'c'.repeat(63)}.${'d'.repeat(54)}`,
])('rejects invalid mail domain %s', (value) => {
  expect(mailDomainSchema.safeParse(value).success).toBe(false)
})

test('accepts the longest domain that still produces a valid no-reply address', () => {
  const domain = `${'a'.repeat(63)}.${'b'.repeat(63)}.${'c'.repeat(63)}.${'d'.repeat(53)}`

  expect(domain).toHaveLength(245)
  expect(mailDomainSchema.parse(domain)).toBe(domain)
})

test('trims valid external reply-to addresses and permits blank values', () => {
  expect(mailReplyToSchema.parse('  luminaeventssupport@gmail.com  ')).toBe(
    'luminaeventssupport@gmail.com'
  )
  expect(mailReplyToSchema.parse('')).toBe('')
  expect(mailReplyToSchema.parse('   ')).toBe('')
})

test.each(['support@example', 'support@example.com,other@example.com', 'support @example.com'])(
  'rejects invalid reply-to address %s',
  (value) => {
    expect(mailReplyToSchema.safeParse(value).success).toBe(false)
  }
)
