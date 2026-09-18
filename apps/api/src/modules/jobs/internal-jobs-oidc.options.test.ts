import { expect, test } from 'vitest'
import { parseInternalJobsOidcOptions } from './internal-jobs-oidc.options.ts'

test('parses comma-separated service accounts with trim', () => {
  const options = parseInternalJobsOidcOptions({
    audience: 'https://api.example.com',
    allowedServiceAccounts:
      ' scheduler@proj.iam.gserviceaccount.com , jobs@proj.iam.gserviceaccount.com ',
  })

  expect(options.audience).toBe('https://api.example.com')
  expect(options.allowedServiceAccounts).toEqual([
    'scheduler@proj.iam.gserviceaccount.com',
    'jobs@proj.iam.gserviceaccount.com',
  ])
  expect(options.bypassAuth).toBe(false)
})

test('ignores empty entries in the service-account list', () => {
  const options = parseInternalJobsOidcOptions({
    audience: 'https://api.example.com',
    allowedServiceAccounts: ' , scheduler@proj.iam.gserviceaccount.com,  , ',
  })

  expect(options.allowedServiceAccounts).toEqual(['scheduler@proj.iam.gserviceaccount.com'])
  expect(options.bypassAuth).toBe(false)
})

test('enables bypass only when audience and allowed SAs are both fully empty', () => {
  const options = parseInternalJobsOidcOptions({
    audience: '',
    allowedServiceAccounts: '',
  })

  expect(options.audience).toBe('')
  expect(options.allowedServiceAccounts).toEqual([])
  expect(options.bypassAuth).toBe(true)
})

test('treats whitespace-only audience and SA list as empty bypass', () => {
  const options = parseInternalJobsOidcOptions({
    audience: '   ',
    allowedServiceAccounts: '  ,  ',
  })

  expect(options.audience).toBe('')
  expect(options.allowedServiceAccounts).toEqual([])
  expect(options.bypassAuth).toBe(true)
})

test('disables bypass when only audience is set (partial config)', () => {
  const options = parseInternalJobsOidcOptions({
    audience: 'https://api.example.com',
    allowedServiceAccounts: '',
  })

  expect(options.audience).toBe('https://api.example.com')
  expect(options.allowedServiceAccounts).toEqual([])
  expect(options.bypassAuth).toBe(false)
})

test('disables bypass when only allowed SAs are set (partial config)', () => {
  const options = parseInternalJobsOidcOptions({
    audience: '',
    allowedServiceAccounts: 'scheduler@proj.iam.gserviceaccount.com',
  })

  expect(options.audience).toBe('')
  expect(options.allowedServiceAccounts).toEqual(['scheduler@proj.iam.gserviceaccount.com'])
  expect(options.bypassAuth).toBe(false)
})

test('normalizes allowed service-account emails to lowercase', () => {
  const options = parseInternalJobsOidcOptions({
    audience: 'https://api.example.com',
    allowedServiceAccounts: 'Scheduler@Proj.iam.gserviceaccount.com',
  })

  expect(options.allowedServiceAccounts).toEqual(['scheduler@proj.iam.gserviceaccount.com'])
})
