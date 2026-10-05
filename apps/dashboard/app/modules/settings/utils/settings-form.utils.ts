import type { ZodError, ZodType } from 'zod'

export type SettingsFieldErrors<TField extends string = string> = {
  profile?: Partial<Record<TField, string>>
}

export function mapSettingsFormErrors<TField extends string = string>(
  error: ZodError,
  resolveMessage: (message: string) => string = (message) => message
): SettingsFieldErrors<TField> {
  const fieldErrors: SettingsFieldErrors<TField> = {}

  for (const issue of error.issues) {
    const [section, field] = issue.path

    if (typeof section !== 'string' || typeof field !== 'string') {
      continue
    }

    if (section === 'profile') {
      fieldErrors.profile ??= {}
      fieldErrors.profile[field as TField] = resolveMessage(issue.message)
    }
  }

  return fieldErrors
}

export function validateSettingsForm<TValues>(schema: ZodType<TValues>, values: TValues) {
  return schema.safeParse(values)
}

/** Convert camelCase to kebab-case. */
function camelToKebab(value: string): string {
  return value.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase()
}

export function fieldToInputId(field: string): string {
  return `settings-${camelToKebab(field)}`
}

export function getFirstInvalidFieldId<TField extends string>(
  errors: SettingsFieldErrors<TField>,
  fieldOrder: readonly TField[]
): string | null {
  for (const field of fieldOrder) {
    if (errors.profile?.[field]) {
      return fieldToInputId(field)
    }
  }

  return null
}

/** Focus DOM element by id on next animation frame. */
export function focusSettingsField(fieldId: string) {
  requestAnimationFrame(() => {
    document.getElementById(fieldId)?.focus()
  })
}

export function resolveSaveErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message) {
    return error.message
  }

  return fallback
}

/** Night-hours success copy for after-hours saves (local time). */
export function resolveSaveSuccessMessageKey(
  now = new Date()
): 'shared.messages.saveSuccess' | 'shared.messages.saveSuccessNight' {
  const hour = now.getHours()
  const isNight = hour >= 22 || hour < 6
  return isNight ? 'shared.messages.saveSuccessNight' : 'shared.messages.saveSuccess'
}
