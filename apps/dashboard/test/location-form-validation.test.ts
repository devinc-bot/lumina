import { strict as assert } from 'node:assert'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const formModuleUrl = new URL(
  '../app/modules/locations/components/location-form.tsx',
  import.meta.url
)

test('resolves location validation keys through the shared i18n error resolver', async () => {
  const source = await readFile(formModuleUrl, 'utf8')

  assert.match(source, /import \{ useResolveFieldError \} from '@repo\/i18n\/client'/)
  assert.match(source, /const resolveFieldError = useResolveFieldError\(\)/)
  assert.match(source, /error=\{resolveFieldError\(field\.state\.meta\.errors\)\}/)
  assert.doesNotMatch(source, /fieldErrorMessage\(field\.state\.meta\.errors\)/)
})
