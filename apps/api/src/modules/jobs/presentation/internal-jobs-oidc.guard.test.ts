import { ForbiddenException, UnauthorizedException, type ExecutionContext } from '@nestjs/common'
import { expect, test, vi } from 'vitest'
import type { GoogleOidcTokenVerifier } from '../google-oidc-token-verifier.port.ts'
import type { InternalJobsOidcOptions } from '../internal-jobs-oidc.options.ts'
import { InternalJobsOidcGuard } from './internal-jobs-oidc.guard.ts'

const ALLOWED_EMAIL = 'scheduler@proj.iam.gserviceaccount.com'
const OTHER_EMAIL = 'other@proj.iam.gserviceaccount.com'
const AUDIENCE = 'https://api.example.com'
const VALID_TOKEN = 'valid.oidc.jwt'

function createOptions(overrides: Partial<InternalJobsOidcOptions> = {}): InternalJobsOidcOptions {
  return {
    audience: AUDIENCE,
    allowedServiceAccounts: [ALLOWED_EMAIL],
    bypassAuth: false,
    ...overrides,
  }
}

function createVerifier(impl?: Partial<GoogleOidcTokenVerifier>): GoogleOidcTokenVerifier {
  return {
    verify: vi.fn(async () => ({ email: ALLOWED_EMAIL })),
    ...impl,
  }
}

function createContext(authorization?: string): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => ({
        headers: authorization === undefined ? {} : { authorization },
      }),
    }),
  } as unknown as ExecutionContext
}

function createGuard(
  options: InternalJobsOidcOptions,
  verifier: GoogleOidcTokenVerifier
): InternalJobsOidcGuard {
  return new InternalJobsOidcGuard(options, verifier)
}

test('rejects missing Authorization header with 401', async () => {
  const verifier = createVerifier()
  const guard = createGuard(createOptions(), verifier)

  await expect(guard.canActivate(createContext())).rejects.toBeInstanceOf(UnauthorizedException)
  expect(verifier.verify).not.toHaveBeenCalled()
})

test('rejects invalid Bearer scheme with 401', async () => {
  const verifier = createVerifier()
  const guard = createGuard(createOptions(), verifier)

  await expect(guard.canActivate(createContext('Basic abc'))).rejects.toBeInstanceOf(
    UnauthorizedException
  )
  await expect(guard.canActivate(createContext('Bearer'))).rejects.toBeInstanceOf(
    UnauthorizedException
  )
  expect(verifier.verify).not.toHaveBeenCalled()
})

test('rejects when verifier throws (invalid token / wrong audience / issuer)', async () => {
  const verifier = createVerifier({
    verify: vi.fn(async () => {
      throw new Error('Token used wrong audience')
    }),
  })
  const guard = createGuard(createOptions(), verifier)

  await expect(guard.canActivate(createContext(`Bearer ${VALID_TOKEN}`))).rejects.toBeInstanceOf(
    UnauthorizedException
  )
  expect(verifier.verify).toHaveBeenCalledWith(VALID_TOKEN, AUDIENCE)
})

test('rejects authenticated email that is not allowlisted with 403', async () => {
  const verifier = createVerifier({
    verify: vi.fn(async () => ({ email: OTHER_EMAIL })),
  })
  const guard = createGuard(createOptions(), verifier)

  await expect(guard.canActivate(createContext(`Bearer ${VALID_TOKEN}`))).rejects.toBeInstanceOf(
    ForbiddenException
  )
  expect(verifier.verify).toHaveBeenCalledWith(VALID_TOKEN, AUDIENCE)
})

test('allows when verifier returns an allowlisted email', async () => {
  const verifier = createVerifier({
    verify: vi.fn(async () => ({ email: ALLOWED_EMAIL })),
  })
  const guard = createGuard(createOptions(), verifier)

  await expect(guard.canActivate(createContext(`Bearer ${VALID_TOKEN}`))).resolves.toBe(true)
  expect(verifier.verify).toHaveBeenCalledWith(VALID_TOKEN, AUDIENCE)
})

test('local bypass: empty OIDC options allow without calling verifier', async () => {
  const verifier = createVerifier()
  const guard = createGuard(
    createOptions({
      audience: '',
      allowedServiceAccounts: [],
      bypassAuth: true,
    }),
    verifier
  )

  await expect(guard.canActivate(createContext())).resolves.toBe(true)
  expect(verifier.verify).not.toHaveBeenCalled()
})

test('partial OIDC config with only audience fails closed without calling verifier', async () => {
  const verifier = createVerifier()
  const guard = createGuard(
    createOptions({
      audience: AUDIENCE,
      allowedServiceAccounts: [],
      bypassAuth: false,
    }),
    verifier
  )

  await expect(guard.canActivate(createContext(`Bearer ${VALID_TOKEN}`))).rejects.toBeInstanceOf(
    UnauthorizedException
  )
  expect(verifier.verify).not.toHaveBeenCalled()
})

test('partial OIDC config with only allowed SAs fails closed without calling verifier', async () => {
  const verifier = createVerifier()
  const guard = createGuard(
    createOptions({
      audience: '',
      allowedServiceAccounts: [ALLOWED_EMAIL],
      bypassAuth: false,
    }),
    verifier
  )

  await expect(guard.canActivate(createContext(`Bearer ${VALID_TOKEN}`))).rejects.toBeInstanceOf(
    UnauthorizedException
  )
  expect(verifier.verify).not.toHaveBeenCalled()
})
