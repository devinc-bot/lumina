import { useForm } from '@tanstack/react-form'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate } from '@tanstack/react-router'
import type { StaffInvitationPublicResponse } from '@repo/types'
import {
  acceptStaffInvitationBaseSchema,
  acceptStaffInvitationSchema,
  verifyStaffInvitationSecurityWordSchema,
} from '@repo/validators'
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  Field,
  fieldErrorMessage,
  Input,
  toast,
} from '@repo/ui'
import { DASHBOARD_ROUTES } from '~/modules/common/constants/routes'
import { acceptStaffInvitation } from '~/modules/staff/services/staff-invitations.service'

type StaffInvitationAcceptViewProps = {
  invitation: StaffInvitationPublicResponse
  token: string
}

export function StaffInvitationAcceptView({ invitation, token }: StaffInvitationAcceptViewProps) {
  const { t } = useTranslation('staff')
  const { t: tCommon } = useTranslation('common')
  const { t: tValidation } = useTranslation('validation', { useSuspense: false })
  const navigate = useNavigate()

  const resolveError = (errors: ReadonlyArray<unknown>): string | null => {
    const raw = fieldErrorMessage(errors)
    if (!raw) return null
    if (raw.includes(':')) return tValidation(raw.split(':').slice(1).join(':') as never)
    return raw
  }
  const requiresSecurityWord = invitation.hasSecurityWord

  const form = useForm({
    defaultValues: {
      name: '',
      lastName: '',
      phone: '',
      securityWord: '',
      password: '',
      confirmPassword: '',
    },
    onSubmit: async ({ value }) => {
      if (requiresSecurityWord) {
        const securityParsed = verifyStaffInvitationSecurityWordSchema.safeParse({
          securityWord: value.securityWord,
        })
        if (!securityParsed.success) return
      }

      const parsed = acceptStaffInvitationSchema.safeParse(value)
      if (!parsed.success) return

      try {
        await acceptStaffInvitation(invitation.slug, token, {
          name: parsed.data.name,
          lastName: parsed.data.lastName,
          phone: parsed.data.phone,
          password: parsed.data.password,
          securityWord: parsed.data.securityWord,
        })

        toast.success(t('invitation.accept.success'))
        void navigate({ to: DASHBOARD_ROUTES.login(), replace: true })
      } catch (error) {
        toast.error(error instanceof Error ? error.message : t('invitation.accept.error'))
      }
    },
  })

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <header className="px-6 py-5 sm:px-8">
        <Link
          to={DASHBOARD_ROUTES.login()}
          className="text-lg tracking-tight text-ink transition-colors duration-150 hover:text-primary"
        >
          {tCommon('appNameDisplay')}
        </Link>
      </header>

      <main className="grid flex-1 place-items-center px-6 py-12">
        <div className="motion-reduce:animate-none animate-fade-up w-full max-w-md">
          <Card variant="gradient">
            <CardHeader className="sm:p-8">
              <h1 className="text-balance font-heading text-2xl font-bold text-ink">
                {t('invitation.accept.title')}
              </h1>
              <CardDescription className="text-pretty text-sm">
                {t('invitation.accept.description')}
              </CardDescription>
            </CardHeader>

            <CardContent className="sm:px-8 sm:pb-8">
              <dl className="flex flex-wrap gap-5 rounded-lg bg-surface-container-high p-4 text-sm">
                <div>
                  <dt className="text-ink-muted">{t('invitation.accept.invitedAs')}</dt>
                  <dd className="mt-1 font-medium text-ink">{invitation.email}</dd>
                </div>
                <div>
                  <dt className="text-ink-muted">{t('invitation.accept.organizationLabel')}</dt>
                  <dd className="mt-1">
                    <Badge variant="outline" size="sm">
                      {invitation.organizationName}
                    </Badge>
                  </dd>
                </div>
              </dl>

              <form
                noValidate
                className="mt-6 space-y-4"
                onSubmit={(event) => {
                  event.preventDefault()
                  event.stopPropagation()
                  void form.handleSubmit()
                }}
              >
                <form.Field
                  name="name"
                  validators={{ onSubmit: acceptStaffInvitationBaseSchema.shape.name }}
                >
                  {(field) => {
                    const error = resolveError(field.state.meta.errors)

                    return (
                      <Field label={t('invitation.accept.name')} htmlFor={field.name} error={error}>
                        <Input
                          id={field.name}
                          name={field.name}
                          type="text"
                          autoComplete="given-name"
                          value={field.state.value}
                          placeholder={t('invitation.accept.namePlaceholder')}
                          onBlur={field.handleBlur}
                          onChange={(event) => field.handleChange(event.target.value)}
                          aria-invalid={error ? true : undefined}
                        />
                      </Field>
                    )
                  }}
                </form.Field>

                <form.Field
                  name="lastName"
                  validators={{ onSubmit: acceptStaffInvitationBaseSchema.shape.lastName }}
                >
                  {(field) => {
                    const error = resolveError(field.state.meta.errors)

                    return (
                      <Field
                        label={t('invitation.accept.lastName')}
                        htmlFor={field.name}
                        error={error}
                      >
                        <Input
                          id={field.name}
                          name={field.name}
                          type="text"
                          autoComplete="family-name"
                          value={field.state.value}
                          placeholder={t('invitation.accept.lastNamePlaceholder')}
                          onBlur={field.handleBlur}
                          onChange={(event) => field.handleChange(event.target.value)}
                          aria-invalid={error ? true : undefined}
                        />
                      </Field>
                    )
                  }}
                </form.Field>

                <form.Field
                  name="phone"
                  validators={{ onSubmit: acceptStaffInvitationBaseSchema.shape.phone }}
                >
                  {(field) => {
                    const error = resolveError(field.state.meta.errors)

                    return (
                      <Field
                        label={t('invitation.accept.phone')}
                        htmlFor={field.name}
                        error={error}
                      >
                        <Input
                          id={field.name}
                          name={field.name}
                          type="tel"
                          autoComplete="tel"
                          value={field.state.value}
                          placeholder={t('invitation.accept.phonePlaceholder')}
                          onBlur={field.handleBlur}
                          onChange={(event) => field.handleChange(event.target.value)}
                          aria-invalid={error ? true : undefined}
                        />
                      </Field>
                    )
                  }}
                </form.Field>

                {requiresSecurityWord ? (
                  <form.Field
                    name="securityWord"
                    validators={{
                      onSubmit: verifyStaffInvitationSecurityWordSchema.shape.securityWord,
                    }}
                  >
                    {(field) => {
                      const error = resolveError(field.state.meta.errors)

                      return (
                        <Field
                          label={t('invitation.accept.securityWord')}
                          htmlFor={field.name}
                          error={error}
                        >
                          <Input
                            id={field.name}
                            name={field.name}
                            type="password"
                            autoComplete="off"
                            value={field.state.value}
                            placeholder={t('invitation.accept.securityWordPlaceholder')}
                            onBlur={field.handleBlur}
                            onChange={(event) => field.handleChange(event.target.value)}
                            aria-invalid={error ? true : undefined}
                          />
                        </Field>
                      )
                    }}
                  </form.Field>
                ) : null}

                <form.Field
                  name="password"
                  validators={{ onSubmit: acceptStaffInvitationBaseSchema.shape.password }}
                >
                  {(field) => {
                    const error = resolveError(field.state.meta.errors)

                    return (
                      <Field
                        label={t('invitation.accept.password')}
                        htmlFor={field.name}
                        error={error}
                      >
                        <Input
                          id={field.name}
                          name={field.name}
                          type="password"
                          autoComplete="new-password"
                          value={field.state.value}
                          placeholder={t('invitation.accept.passwordPlaceholder')}
                          onBlur={field.handleBlur}
                          onChange={(event) => field.handleChange(event.target.value)}
                          aria-invalid={error ? true : undefined}
                        />
                      </Field>
                    )
                  }}
                </form.Field>

                <form.Field
                  name="confirmPassword"
                  validators={{
                    onSubmit: ({ value, fieldApi }) => {
                      const password = fieldApi.form.getFieldValue('password')
                      const result = acceptStaffInvitationSchema.safeParse({
                        name: fieldApi.form.getFieldValue('name'),
                        lastName: fieldApi.form.getFieldValue('lastName'),
                        phone: fieldApi.form.getFieldValue('phone'),
                        securityWord: fieldApi.form.getFieldValue('securityWord'),
                        password,
                        confirmPassword: value,
                      })
                      if (!result.success) {
                        return result.error.issues
                          .filter((issue) => issue.path[0] === 'confirmPassword')
                          .map((issue) => issue.message)
                      }
                      return undefined
                    },
                  }}
                >
                  {(field) => {
                    const error = resolveError(field.state.meta.errors)

                    return (
                      <Field
                        label={t('invitation.accept.confirmPassword')}
                        htmlFor={field.name}
                        error={error}
                      >
                        <Input
                          id={field.name}
                          name={field.name}
                          type="password"
                          autoComplete="new-password"
                          value={field.state.value}
                          placeholder={t('invitation.accept.confirmPasswordPlaceholder')}
                          onBlur={field.handleBlur}
                          onChange={(event) => field.handleChange(event.target.value)}
                          aria-invalid={error ? true : undefined}
                        />
                      </Field>
                    )
                  }}
                </form.Field>

                <form.Subscribe selector={(state) => state.isSubmitting}>
                  {(isSubmitting) => (
                    <Button type="submit" className="w-full" loading={isSubmitting}>
                      {isSubmitting
                        ? t('invitation.accept.submitting')
                        : t('invitation.accept.submit')}
                    </Button>
                  )}
                </form.Subscribe>
              </form>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
