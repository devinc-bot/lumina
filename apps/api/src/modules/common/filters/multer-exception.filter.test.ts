import type { ArgumentsHost } from '@nestjs/common'
import { expect, test } from 'vitest'
import { MulterError } from 'multer'
import { FILE_ERROR_CODE } from '@repo/i18n/constants'
import { MulterExceptionFilter } from './multer-exception.filter.ts'

function createHost(): {
  host: ArgumentsHost
  response: { statusCode: number | undefined; body: unknown }
} {
  const response = {
    statusCode: undefined as number | undefined,
    body: undefined as unknown,
    status(statusCode: number) {
      this.statusCode = statusCode
      return this
    },
    json(body: unknown) {
      this.body = body
    },
  }

  return {
    host: {
      switchToHttp: () => ({ getResponse: () => response }),
    } as ArgumentsHost,
    response,
  }
}

test('maps a Multer file-size error to the localized 413 response', () => {
  const { host, response } = createHost()

  new MulterExceptionFilter().catch(new MulterError('LIMIT_FILE_SIZE'), host)

  expect(response.statusCode).toBe(413)
  expect(response.body).toEqual({ statusCode: 413, message: FILE_ERROR_CODE.FILE_TOO_LARGE })
})

test('maps other Multer errors to the localized invalid-image response', () => {
  const { host, response } = createHost()

  new MulterExceptionFilter().catch(new MulterError('LIMIT_UNEXPECTED_FILE', 'avatar'), host)

  expect(response.statusCode).toBe(400)
  expect(response.body).toEqual({ statusCode: 400, message: FILE_ERROR_CODE.INVALID_IMAGE_TYPE })
})
