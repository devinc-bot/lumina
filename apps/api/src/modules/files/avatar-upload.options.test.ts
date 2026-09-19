import { expect, test } from 'vitest'
import { AVATAR_UPLOAD_MAX_BYTES } from '@repo/validators'
import { avatarUploadOptions } from './avatar-upload.options.ts'

function createFile(mimetype: string): Express.Multer.File {
  return {
    fieldname: 'avatar',
    originalname: 'avatar.png',
    encoding: '7bit',
    mimetype,
    size: 1,
    buffer: Buffer.from('image'),
    destination: '',
    filename: '',
    path: '',
    stream: undefined as never,
  }
}

test('accepts supported image MIME types and enforces the dedicated avatar size limit', () => {
  expect(avatarUploadOptions.limits?.fileSize).toBe(AVATAR_UPLOAD_MAX_BYTES)

  const callback = (error: Error | null, accepted: boolean) => {
    expect(error).toBeNull()
    expect(accepted).toBe(true)
  }

  avatarUploadOptions.fileFilter?.({} as never, createFile('image/png'), callback)
})

test('rejects unsupported MIME types with Multer unexpected-file errors', () => {
  const callback = (error: Error | null, accepted: boolean) => {
    expect(error).toMatchObject({ code: 'LIMIT_UNEXPECTED_FILE', field: 'avatar' })
    expect(accepted).toBe(false)
  }

  avatarUploadOptions.fileFilter?.({} as never, createFile('image/gif'), callback)
})
