import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto'
import { ENV } from '../../config/env'

const ALGORITHM = 'aes-256-gcm'
const IV_BYTES = 12

function getKey(): Buffer {
  const key = Buffer.from(ENV.MERCADOPAGO_CREDENTIAL_ENCRYPTION_KEY, 'base64')
  if (key.length !== 32)
    throw new Error('Mercado Pago credential encryption key must decode to 32 bytes')
  return key
}

export function encryptMercadoPagoCredential(value: string): string {
  const iv = randomBytes(IV_BYTES)
  const cipher = createCipheriv(ALGORITHM, getKey(), iv)
  const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return [iv, tag, encrypted].map((part) => part.toString('base64url')).join('.')
}

export function decryptMercadoPagoCredential(payload: string): string {
  const [ivEncoded, tagEncoded, encryptedEncoded] = payload.split('.')
  if (!ivEncoded || !tagEncoded || !encryptedEncoded)
    throw new Error('Invalid encrypted Mercado Pago credential')
  const decipher = createDecipheriv(ALGORITHM, getKey(), Buffer.from(ivEncoded, 'base64url'))
  decipher.setAuthTag(Buffer.from(tagEncoded, 'base64url'))
  return Buffer.concat([
    decipher.update(Buffer.from(encryptedEncoded, 'base64url')),
    decipher.final(),
  ]).toString('utf8')
}
