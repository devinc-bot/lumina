import { strict as assert } from 'node:assert'
import test from 'node:test'
import { z } from 'zod'
import { mapSettingsFormErrors } from '../app/modules/settings/utils/settings-form.utils.ts'

test('maps nested settings validation keys to localized profile field errors', () => {
  const validation = z
    .object({
      profile: z.object({ phone: z.string().regex(/^\+\d+$/, 'validation:field.phone.invalid') }),
    })
    .safeParse({ profile: { phone: 'not-a-phone' } })

  assert.equal(validation.success, false)
  if (validation.success) return

  const errors = mapSettingsFormErrors(validation.error, (message) => {
    if (message === 'validation:field.phone.invalid') return 'El teléfono no es válido.'
    return message
  })

  assert.equal(errors.profile?.phone, 'El teléfono no es válido.')
})

test('maps nested address validation keys to localized profile field errors', () => {
  const validation = z
    .object({
      profile: z.object({
        address: z
          .object({ street: z.string(), city: z.string() })
          .refine((address) => Boolean(address.street) === Boolean(address.city), {
            message: 'validation:field.address.allOrNone',
          }),
      }),
    })
    .safeParse({ profile: { address: { street: 'Main St', city: '' } } })

  assert.equal(validation.success, false)
  if (validation.success) return

  const errors = mapSettingsFormErrors(validation.error, (message) =>
    message.startsWith('validation:') ? 'Localized address error' : message
  )

  assert.equal(errors.profile?.address, 'Localized address error')
})

test('preserves ordinary settings validation messages', () => {
  const validation = z
    .object({ profile: z.object({ phone: z.string().min(1, 'Phone is required') }) })
    .safeParse({ profile: { phone: '' } })

  assert.equal(validation.success, false)
  if (validation.success) return

  const errors = mapSettingsFormErrors(validation.error, (message) =>
    message.startsWith('validation:') ? 'localized' : message
  )

  assert.equal(errors.profile?.phone, 'Phone is required')
})
