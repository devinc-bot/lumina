import { expect, test } from 'vitest'
import {
  AUTH_ERROR_CODE,
  LEGAL_DOCUMENT_ERROR_CODE,
  RATE_LIMIT_ERROR_CODE,
  TICKET_ERROR_CODE,
} from './error-codes.ts'
import enErrors from '../locales/errors/en.json' with { type: 'json' }
import esErrors from '../locales/errors/es.json' with { type: 'json' }

function nestedCopy(locale: unknown, code: string): unknown {
  return code.split('.').reduce<unknown>((current, part) => {
    if (!current || typeof current !== 'object') return undefined
    return (current as Record<string, unknown>)[part]
  }, locale)
}

test('exposes the generic HTTP 429 code for in-memory throttling', () => {
  expect(RATE_LIMIT_ERROR_CODE.TOO_MANY_REQUESTS).toBe('rateLimit.TOO_MANY_REQUESTS')
})

test('exposes the fail-closed client IP code', () => {
  expect(RATE_LIMIT_ERROR_CODE.CLIENT_IP_REQUIRED).toBe('rateLimit.CLIENT_IP_REQUIRED')
})

test('keeps daily auth 429 codes on their existing domain keys', () => {
  expect(AUTH_ERROR_CODE.USER_REGISTRATION_RATE_LIMITED).toBe('auth.USER_REGISTRATION_RATE_LIMITED')
  expect(AUTH_ERROR_CODE.PASSWORD_RESET_RATE_LIMITED).toBe('auth.PASSWORD_RESET_RATE_LIMITED')
})

test('localizes the generic 429 copy in Spanish and English', () => {
  expect(nestedCopy(esErrors, 'rateLimit.TOO_MANY_REQUESTS')).toBe(
    'Demasiadas solicitudes. Esperá un momento e intentá de nuevo.'
  )
  expect(nestedCopy(enErrors, 'rateLimit.TOO_MANY_REQUESTS')).toBe(
    'Too many requests. Please wait a moment and try again.'
  )
})

test('localizes the fail-closed client IP copy in Spanish and English', () => {
  expect(nestedCopy(esErrors, 'rateLimit.CLIENT_IP_REQUIRED')).toBe(
    'No pudimos identificar tu dirección IP.'
  )
  expect(nestedCopy(enErrors, 'rateLimit.CLIENT_IP_REQUIRED')).toBe(
    'We could not determine your client IP address.'
  )
})

test('exposes published legal document not-found in Spanish and English', () => {
  expect(LEGAL_DOCUMENT_ERROR_CODE.PUBLISHED_NOT_FOUND).toBe('legalDocument.PUBLISHED_NOT_FOUND')
  expect(nestedCopy(esErrors, LEGAL_DOCUMENT_ERROR_CODE.PUBLISHED_NOT_FOUND)).toBe(
    'No encontramos un documento legal publicado.'
  )
  expect(nestedCopy(enErrors, LEGAL_DOCUMENT_ERROR_CODE.PUBLISHED_NOT_FOUND)).toBe(
    'We could not find a published legal document.'
  )
})

test('exposes required legal reacceptance in Spanish and English', () => {
  expect(LEGAL_DOCUMENT_ERROR_CODE.ACCEPTANCE_REQUIRED).toBe('legalDocument.ACCEPTANCE_REQUIRED')
  expect(nestedCopy(esErrors, LEGAL_DOCUMENT_ERROR_CODE.ACCEPTANCE_REQUIRED)).toBe(
    'Tenés que aceptar la versión vigente de los documentos legales.'
  )
  expect(nestedCopy(enErrors, LEGAL_DOCUMENT_ERROR_CODE.ACCEPTANCE_REQUIRED)).toBe(
    'You must accept the current version of the legal documents.'
  )
})

test('exposes legal acceptance persist failure in Spanish and English', () => {
  expect(LEGAL_DOCUMENT_ERROR_CODE.ACCEPT_FAILED).toBe('legalDocument.ACCEPT_FAILED')
  expect(nestedCopy(esErrors, LEGAL_DOCUMENT_ERROR_CODE.ACCEPT_FAILED)).toBe(
    'No pudimos registrar la aceptación. Intentá de nuevo.'
  )
  expect(nestedCopy(enErrors, LEGAL_DOCUMENT_ERROR_CODE.ACCEPT_FAILED)).toBe(
    'We could not record your acceptance. Try again.'
  )
})

test('exposes invalid legal acceptance types in Spanish and English', () => {
  expect(LEGAL_DOCUMENT_ERROR_CODE.INVALID_TYPES).toBe('legalDocument.INVALID_TYPES')
  expect(nestedCopy(esErrors, LEGAL_DOCUMENT_ERROR_CODE.INVALID_TYPES)).toBe(
    'Esos documentos no aplican a tu cuenta.'
  )
  expect(nestedCopy(enErrors, LEGAL_DOCUMENT_ERROR_CODE.INVALID_TYPES)).toBe(
    'Those documents do not apply to your account.'
  )
})

test('localizes ticket capacity validation in Spanish and English', () => {
  expect(TICKET_ERROR_CODE.CAPACITY_EXCEEDED).toBe('ticket.CAPACITY_EXCEEDED')
  expect(nestedCopy(esErrors, TICKET_ERROR_CODE.CAPACITY_EXCEEDED)).toBe(
    'La cantidad total de tickets supera la capacidad de la ubicación.'
  )
  expect(nestedCopy(enErrors, TICKET_ERROR_CODE.CAPACITY_EXCEEDED)).toBe(
    'The total ticket quantity exceeds the location capacity.'
  )
})
