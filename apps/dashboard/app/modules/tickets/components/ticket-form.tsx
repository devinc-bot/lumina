import { useEffect } from 'react'
import { useForm } from '@tanstack/react-form'
import { useTranslation } from 'react-i18next'
import type { TFunction } from 'i18next'
import { Image } from 'lucide-react'
import { TICKET_STATUS, type TicketStatus } from '@repo/types'
import {
  parseTicketFormToCreateInput,
  parseTicketFormToUpdateInput,
  ticketFormSchema,
  type TicketFormValues,
} from '@repo/validators'
import { useResolveFieldError } from '@repo/i18n/client'
import {
  Button,
  cn,
  DialogClose,
  DialogFooter,
  DateTimeInput,
  Field,
  Input,
  requiredFieldLabel,
  SelectField,
  SelectItem,
  Textarea,
  toast,
} from '@repo/ui'
import { FormSection } from '~/modules/common/components/form-section'
import { useCreateTicket, useUpdateTicket } from '~/modules/tickets/mutation/use-ticket-mutations'
import { useOwnerEventsForSelect } from '~/modules/tickets/queries/use-owner-events'
import { TicketTypeCreateDialog } from '~/modules/ticket-types/components/ticket-type-create-dialog'
import { useTicketTypes } from '~/modules/ticket-types/queries/use-ticket-type-queries'
import { EMPTY_TICKET_FORM_VALUES } from '~/modules/tickets/utils/ticket-form.formatter'
import { TicketCommercialBreakdown } from '~/modules/tickets/components/ticket-commercial-breakdown'

export const TICKET_FORM_MODE = {
  CREATE: 'create',
  EDIT: 'edit',
} as const

export type TicketFormMode = (typeof TICKET_FORM_MODE)[keyof typeof TICKET_FORM_MODE]

export const TICKET_FORM_ID = 'ticket-form'

const DEFAULT_TICKET_FORM_BODY_CLASS = 'flex-1 overflow-y-auto px-6 py-6 sm:px-8'

type TicketFormSubmitButtonProps = {
  mode: TicketFormMode
  isSubmitting: boolean
  className?: string
  disabled?: boolean
  variant?: 'default' | 'outline'
}

export function TicketFormSubmitButton({
  mode,
  isSubmitting,
  className,
  disabled = false,
  variant = 'default',
}: TicketFormSubmitButtonProps) {
  const { t } = useTranslation('tickets')
  const isEdit = mode === TICKET_FORM_MODE.EDIT

  return (
    <Button
      type="submit"
      form={TICKET_FORM_ID}
      variant={variant}
      loading={isSubmitting}
      disabled={disabled || isSubmitting}
      className={cn('w-full sm:w-auto', className)}
    >
      {isSubmitting
        ? isEdit
          ? t('form.submittingEdit')
          : t('form.submittingCreate')
        : isEdit
          ? t('form.submitEdit')
          : t('form.submitCreate')}
    </Button>
  )
}

type EventSelectFieldDisplayInput = {
  isLoading: boolean
  isError: boolean
  eventCount: number
  fieldError: string | null
  t: TFunction<'tickets'>
}

type EventSelectFieldDisplay = {
  placeholder: string
  error: string | undefined
}

function getEventSelectFieldDisplay({
  isLoading,
  isError,
  eventCount,
  fieldError,
  t,
}: EventSelectFieldDisplayInput): EventSelectFieldDisplay {
  if (isLoading) {
    return { placeholder: t('form.eventLoading'), error: fieldError ?? undefined }
  }

  if (isError) {
    return {
      placeholder: t('form.eventPlaceholder'),
      error: t('form.eventsLoadError'),
    }
  }

  if (eventCount === 0) {
    return { placeholder: t('form.eventEmpty'), error: fieldError ?? undefined }
  }

  return {
    placeholder: t('form.eventPlaceholder'),
    error: fieldError ?? undefined,
  }
}

function sanitizeNonNegativeDigits(value: string): string {
  return value.replace(/\D/g, '')
}

function sanitizePrice(value: string): string {
  return value.replace(/[^\d.,]/g, '')
}

function TicketFormDirtyReporter({
  isDirty,
  onDirtyChange,
}: {
  isDirty: boolean
  onDirtyChange?: (isDirty: boolean) => void
}) {
  useEffect(() => {
    onDirtyChange?.(isDirty)
  }, [isDirty, onDirtyChange])

  return null
}

type TicketFormFooterState = {
  isSubmitting: boolean
}

type TicketFormProps = {
  mode: TicketFormMode
  documentId?: string
  defaultValues?: TicketFormValues
  onSuccess: () => void
  bodyClassName?: string
  renderFooter?: (state: TicketFormFooterState) => React.ReactNode
  onSubmittingChange?: (isSubmitting: boolean) => void
  onDirtyChange?: (isDirty: boolean) => void
}

export function TicketForm({
  mode,
  documentId,
  defaultValues,
  onSuccess,
  bodyClassName,
  renderFooter,
  onSubmittingChange,
  onDirtyChange,
}: TicketFormProps) {
  const { t } = useTranslation('tickets')
  const resolveFieldError = useResolveFieldError()
  const createTicketMutation = useCreateTicket()
  const updateTicketMutation = useUpdateTicket()
  const {
    data: eventsData,
    isLoading: isEventsLoading,
    isError: isEventsError,
  } = useOwnerEventsForSelect()
  const ticketTypesQuery = useTicketTypes()
  const events = eventsData?.data ?? []
  const ticketTypes = ticketTypesQuery.data ?? []

  const isEdit = mode === TICKET_FORM_MODE.EDIT
  const initialValues = defaultValues ?? EMPTY_TICKET_FORM_VALUES

  const form = useForm({
    defaultValues: initialValues,
    validators: {
      onSubmit: ticketFormSchema,
    },
    onSubmit: async ({ value }) => {
      try {
        if (isEdit) {
          if (!documentId) return
          await updateTicketMutation.mutateAsync({
            documentId,
            input: parseTicketFormToUpdateInput(value),
          })
          toast.success(t('form.successEdit'))
        } else {
          await createTicketMutation.mutateAsync(parseTicketFormToCreateInput(value))
          toast.success(t('form.successCreate'))
        }

        form.reset()
        onSuccess()
      } catch (error) {
        const fallbackMessage = isEdit ? t('form.errorEdit') : t('form.errorCreate')
        toast.error(error instanceof Error ? error.message : fallbackMessage)
      }
    },
  })

  const ticketStatusOptions: { value: TicketStatus; label: string }[] = [
    { value: TICKET_STATUS.ACTIVE, label: t('form.statusActive') },
    { value: TICKET_STATUS.INACTIVE, label: t('form.statusInactive') },
  ]

  const isSubmitting = createTicketMutation.isPending || updateTicketMutation.isPending

  useEffect(() => {
    onSubmittingChange?.(isSubmitting)
  }, [isSubmitting, onSubmittingChange])

  return (
    <>
      <form.Subscribe selector={(state) => state.isDirty}>
        {(isDirty) => <TicketFormDirtyReporter isDirty={isDirty} onDirtyChange={onDirtyChange} />}
      </form.Subscribe>
      <div className={bodyClassName ?? DEFAULT_TICKET_FORM_BODY_CLASS}>
        <form
          id={TICKET_FORM_ID}
          noValidate
          className="flex flex-col gap-12"
          onSubmit={(event) => {
            event.preventDefault()
            event.stopPropagation()
            void form.handleSubmit()
          }}
        >
          <FormSection
            id="ticket-event"
            title={t('form.eventSectionTitle')}
            description={t('form.eventSectionDescription')}
          >
            <p className="text-xs text-ink-muted">{t('form.requiredFieldsHint')}</p>

            <form.Field name="eventId" validators={{ onSubmit: ticketFormSchema.shape.eventId }}>
              {(field) => {
                const error = resolveFieldError(field.state.meta.errors)
                const { placeholder: eventPlaceholder, error: eventFieldError } =
                  getEventSelectFieldDisplay({
                    isLoading: isEventsLoading,
                    isError: isEventsError,
                    eventCount: events.length,
                    fieldError: error,
                    t,
                  })
                const selectedEvent = events.find((event) => event.documentId === field.state.value)
                const selectedEventImage = selectedEvent?.images[0]

                return (
                  <SelectField
                    label={requiredFieldLabel(t('form.event'))}
                    value={field.state.value || undefined}
                    onValueChange={(value) => field.handleChange(value)}
                    placeholder={eventPlaceholder}
                    error={eventFieldError}
                    disabled={isEventsLoading || events.length === 0}
                    valueContent={
                      selectedEvent ? (
                        <span className="flex min-w-0 items-center gap-3">
                          <span
                            aria-hidden="true"
                            className="flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-md bg-surface-container-high"
                          >
                            {selectedEventImage?.url ? (
                              <img
                                src={selectedEventImage.url}
                                alt=""
                                className="size-full object-cover"
                              />
                            ) : (
                              <Image className="size-5 text-ink-muted" />
                            )}
                          </span>
                          <span className="truncate">
                            {`${selectedEvent.name} - ${selectedEvent.locationName}`}
                          </span>
                        </span>
                      ) : undefined
                    }
                  >
                    {events.map((event) => {
                      const eventLabel = `${event.name} - ${event.locationName}`

                      return (
                        <SelectItem
                          key={event.documentId}
                          value={event.documentId}
                          textValue={eventLabel}
                          leadingContent={
                            event.images[0]?.url ? (
                              <img
                                src={event.images[0].url}
                                alt=""
                                className="object-cover p-0"
                                loading="lazy"
                                decoding="async"
                              />
                            ) : (
                              <Image className="size-5 text-ink-muted" />
                            )
                          }
                        >
                          <span className="block min-w-0 truncate">{eventLabel}</span>
                        </SelectItem>
                      )
                    })}
                  </SelectField>
                )
              }}
            </form.Field>
          </FormSection>

          <FormSection
            id="ticket-details"
            title={t('form.detailsSectionTitle')}
            description={t('form.detailsSectionDescription')}
          >
            <div className="grid gap-5 sm:grid-cols-2">
              <form.Field
                name="ticketTypeId"
                validators={{ onSubmit: ticketFormSchema.shape.ticketTypeId }}
              >
                {(field) => {
                  const error = resolveFieldError(field.state.meta.errors)
                  const ticketTypesError = ticketTypesQuery.isError
                    ? t('ticketTypes.loadError')
                    : ticketTypes.length === 0
                      ? t('ticketTypes.empty')
                      : error

                  return (
                    <div className="flex flex-col gap-2">
                      <SelectField
                        label={t('form.type')}
                        value={field.state.value || undefined}
                        onValueChange={field.handleChange}
                        placeholder={
                          ticketTypesQuery.isLoading
                            ? t('ticketTypes.loading')
                            : t('form.typePlaceholder')
                        }
                        error={ticketTypesError ?? undefined}
                        disabled={
                          ticketTypesQuery.isLoading ||
                          ticketTypesQuery.isError ||
                          ticketTypes.length === 0
                        }
                      >
                        {ticketTypes.map((ticketType) => (
                          <SelectItem key={ticketType.documentId} value={ticketType.documentId}>
                            {ticketType.name}
                          </SelectItem>
                        ))}
                      </SelectField>
                      <TicketTypeCreateDialog
                        onCreated={(ticketType) => field.handleChange(ticketType.documentId)}
                      />
                    </div>
                  )
                }}
              </form.Field>

              <form.Field name="status" validators={{ onSubmit: ticketFormSchema.shape.status }}>
                {(field) => {
                  const error = resolveFieldError(field.state.meta.errors)

                  return (
                    <SelectField
                      label={t('form.status')}
                      value={field.state.value}
                      onValueChange={(value) => field.handleChange(value as TicketStatus)}
                      placeholder={t('form.statusPlaceholder')}
                      error={error ?? undefined}
                    >
                      {ticketStatusOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectField>
                  )
                }}
              </form.Field>
            </div>

            <form.Field
              name="description"
              validators={{ onSubmit: ticketFormSchema.shape.description }}
            >
              {(field) => {
                const error = resolveFieldError(field.state.meta.errors)

                return (
                  <Field
                    label={requiredFieldLabel(t('form.details'))}
                    htmlFor={field.name}
                    error={error}
                  >
                    <Textarea
                      id={field.name}
                      name={field.name}
                      value={field.state.value}
                      placeholder={t('form.detailsPlaceholder')}
                      onBlur={field.handleBlur}
                      onChange={(event) => field.handleChange(event.target.value)}
                      aria-invalid={error ? true : undefined}
                      rows={3}
                    />
                  </Field>
                )
              }}
            </form.Field>
          </FormSection>

          <FormSection
            id="ticket-sales"
            title={t('form.salesSectionTitle')}
            description={t('form.salesSectionDescription')}
          >
            <div className="grid gap-5 sm:grid-cols-2">
              <form.Field name="price" validators={{ onSubmit: ticketFormSchema.shape.price }}>
                {(field) => {
                  const error = resolveFieldError(field.state.meta.errors)

                  return (
                    <Field
                      label={requiredFieldLabel(t('form.price'))}
                      htmlFor={field.name}
                      error={error}
                    >
                      <Input
                        id={field.name}
                        name={field.name}
                        inputMode="decimal"
                        value={field.state.value}
                        placeholder={t('form.pricePlaceholder')}
                        onBlur={field.handleBlur}
                        onChange={(event) => field.handleChange(sanitizePrice(event.target.value))}
                        aria-invalid={error ? true : undefined}
                      />
                    </Field>
                  )
                }}
              </form.Field>

              <form.Field
                name="quantity"
                validators={{ onSubmit: ticketFormSchema.shape.quantity }}
              >
                {(field) => {
                  const error = resolveFieldError(field.state.meta.errors)

                  return (
                    <Field
                      label={requiredFieldLabel(t('form.quantity'))}
                      htmlFor={field.name}
                      error={error}
                    >
                      <Input
                        id={field.name}
                        name={field.name}
                        inputMode="numeric"
                        value={field.state.value}
                        placeholder={t('form.quantityPlaceholder')}
                        onBlur={field.handleBlur}
                        onChange={(event) =>
                          field.handleChange(sanitizeNonNegativeDigits(event.target.value))
                        }
                        aria-invalid={error ? true : undefined}
                      />
                    </Field>
                  )
                }}
              </form.Field>
            </div>

            <p className="text-xs text-ink-muted">{t('form.saleDatesHint')}</p>

            <div className="grid gap-5 sm:grid-cols-2">
              <form.Field
                name="saleStartsAt"
                validators={{ onSubmit: ticketFormSchema.shape.saleStartsAt }}
              >
                {(field) => {
                  const error = resolveFieldError(field.state.meta.errors)

                  return (
                    <Field
                      label={requiredFieldLabel(t('form.saleStartsAt'))}
                      htmlFor={field.name}
                      error={error}
                    >
                      <DateTimeInput
                        id={field.name}
                        name={field.name}
                        value={field.state.value}
                        onBlur={field.handleBlur}
                        onChange={(event) => field.handleChange(event.target.value)}
                        aria-invalid={error ? true : undefined}
                      />
                    </Field>
                  )
                }}
              </form.Field>

              <form.Field
                name="saleEndsAt"
                validators={{ onSubmit: ticketFormSchema.shape.saleEndsAt }}
              >
                {(field) => {
                  const error = resolveFieldError(field.state.meta.errors)

                  return (
                    <Field
                      label={requiredFieldLabel(t('form.saleEndsAt'))}
                      htmlFor={field.name}
                      error={error}
                    >
                      <DateTimeInput
                        id={field.name}
                        name={field.name}
                        value={field.state.value}
                        onBlur={field.handleBlur}
                        onChange={(event) => field.handleChange(event.target.value)}
                        aria-invalid={error ? true : undefined}
                      />
                    </Field>
                  )
                }}
              </form.Field>
            </div>
            <form.Subscribe selector={(state) => state.values.price}>
              {(price) => <TicketCommercialBreakdown price={price} />}
            </form.Subscribe>
          </FormSection>
        </form>
      </div>

      {renderFooter ? (
        renderFooter({ isSubmitting })
      ) : (
        <DialogFooter className="mx-0 mb-0 mt-0 shrink-0 flex-col gap-3 border-t border-hairline px-6 py-6 sm:flex-row sm:justify-end sm:px-8">
          <DialogClose asChild>
            <Button
              type="button"
              variant="outline"
              size="default"
              disabled={isSubmitting}
              className="min-w-36 sm:min-w-40"
            >
              {t('form.cancel')}
            </Button>
          </DialogClose>
          <TicketFormSubmitButton mode={mode} isSubmitting={isSubmitting} />
        </DialogFooter>
      )}
    </>
  )
}
