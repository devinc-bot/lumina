import { useEffect, useImperativeHandle, useState } from 'react'
import { useForm } from '@tanstack/react-form'
import { useTranslation } from 'react-i18next'
import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react'
import {
  EVENT_FAQ_MAX_COUNT,
  eventFaqItemSchema,
  eventFieldSchemas,
  type EventFormValues,
} from '@repo/validators'
import { useResolveFieldError } from '@repo/i18n/client'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
  Button,
  Field,
  Input,
  Textarea,
} from '@repo/ui'
import { FormSection } from '~/modules/common/components/form-section'

type EventFaqItem = EventFormValues['faqs'][number]

type EventFaqFormItem = EventFaqItem & { id: string }

export type EventFaqFormHandle = {
  validate: () => Promise<boolean>
  getValues: () => EventFaqItem[]
}

type EventFaqFormProps = {
  ref?: React.Ref<EventFaqFormHandle>
  defaultFaqs: EventFaqItem[]
  onDirtyChange?: (isDirty: boolean) => void
}

function createFaqItem(item: EventFaqItem = { question: '', answer: '' }): EventFaqFormItem {
  return {
    id: crypto.randomUUID(),
    question: item.question,
    answer: item.answer,
  }
}

function toFormItems(faqs: EventFaqItem[]): EventFaqFormItem[] {
  return faqs.map((faq) => createFaqItem(faq))
}

function toPayload(faqs: EventFaqFormItem[]): EventFaqItem[] {
  return faqs.map(({ question, answer }) => ({ question, answer }))
}

function snapshotFaqs(faqs: EventFaqItem[]): string {
  return JSON.stringify(faqs)
}

function moveFaq(faqs: EventFaqFormItem[], from: number, to: number): EventFaqFormItem[] {
  if (to < 0 || to >= faqs.length) {
    return faqs
  }

  const next = [...faqs]
  const [item] = next.splice(from, 1)
  if (!item) {
    return faqs
  }
  next.splice(to, 0, item)
  return next
}

function faqTriggerLabel(faq: EventFaqFormItem, emptyLabel: string): string {
  const trimmed = faq.question.trim()
  return trimmed.length > 0 ? trimmed : emptyLabel
}

export function EventFaqForm({ ref, defaultFaqs, onDirtyChange }: EventFaqFormProps) {
  const { t } = useTranslation('events')
  const resolveFieldError = useResolveFieldError()
  const [initialSnapshot] = useState(() => snapshotFaqs(defaultFaqs))
  const [initialFaqs] = useState(() => toFormItems(defaultFaqs))
  const [hasSubmitted, setHasSubmitted] = useState(false)
  const [openItems, setOpenItems] = useState<string[]>(() => {
    const firstId = initialFaqs[0]?.id
    return firstId ? [firstId] : []
  })

  const form = useForm({
    defaultValues: { faqs: initialFaqs },
    onSubmit: () => {
      // Submission is orchestrated by the parent page; this form only validates.
    },
  })

  useImperativeHandle(ref, () => ({
    validate: async () => {
      setHasSubmitted(true)
      await form.handleSubmit()

      const faqs = form.state.values.faqs
      const invalidIds = faqs
        .filter((faq) => !eventFaqItemSchema.safeParse(faq).success)
        .map((faq) => faq.id)

      if (invalidIds.length > 0) {
        setOpenItems((current) => [...new Set([...current, ...invalidIds])])
      }

      return form.state.isValid
    },
    getValues: () => toPayload(form.state.values.faqs),
  }))

  return (
    <>
      <form.Subscribe selector={(state) => state.values.faqs}>
        {(faqs) => (
          <FaqDirtyReporter
            faqs={toPayload(faqs)}
            initialSnapshot={initialSnapshot}
            onDirtyChange={onDirtyChange}
          />
        )}
      </form.Subscribe>

      <form
        noValidate
        onSubmit={(event) => {
          event.preventDefault()
          event.stopPropagation()
        }}
      >
        <FormSection
          id="event-faq-form"
          title={t('sections.faqTitle')}
          description={t('sections.faqDescription')}
        >
          <form.Field
            name="faqs"
            validators={{
              onSubmit: ({ value }) => {
                const parsed = eventFieldSchemas.faqs.safeParse(toPayload(value))
                if (!parsed.success) {
                  return parsed.error.issues[0]?.message
                }
                return undefined
              },
            }}
          >
            {(field) => {
              const listError = resolveFieldError(field.state.meta.errors)
              const faqs = field.state.value
              const atMax = faqs.length >= EVENT_FAQ_MAX_COUNT

              return (
                <div className="flex flex-col gap-5">
                  {faqs.length === 0 ? (
                    <p className="text-sm text-ink-muted">{t('faq.emptyHint')}</p>
                  ) : (
                    <Accordion
                      type="multiple"
                      value={openItems}
                      onValueChange={setOpenItems}
                      className="w-full"
                    >
                      {faqs.map((faq, index) => {
                        const questionResult = eventFaqItemSchema.shape.question.safeParse(
                          faq.question
                        )
                        const answerResult = eventFaqItemSchema.shape.answer.safeParse(faq.answer)
                        const questionError = hasSubmitted
                          ? resolveFieldError(
                              questionResult.success
                                ? []
                                : [questionResult.error.issues[0]?.message]
                            )
                          : null
                        const answerError = hasSubmitted
                          ? resolveFieldError(
                              answerResult.success ? [] : [answerResult.error.issues[0]?.message]
                            )
                          : null

                        const questionId = `faq-${faq.id}-question`
                        const answerId = `faq-${faq.id}-answer`

                        return (
                          <AccordionItem key={faq.id} value={faq.id}>
                            <div className="flex w-full items-center gap-1 py-1">
                              <AccordionTrigger className="text-base hover:no-underline">
                                {faqTriggerLabel(faq, t('faq.itemLabel', { index: index + 1 }))}
                              </AccordionTrigger>
                              <div className="flex shrink-0 items-center gap-1">
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  disabled={index === 0}
                                  aria-label={t('faq.moveUp')}
                                  onClick={() =>
                                    field.handleChange(moveFaq(faqs, index, index - 1))
                                  }
                                >
                                  <ArrowUp className="size-4" />
                                </Button>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  disabled={index === faqs.length - 1}
                                  aria-label={t('faq.moveDown')}
                                  onClick={() =>
                                    field.handleChange(moveFaq(faqs, index, index + 1))
                                  }
                                >
                                  <ArrowDown className="size-4" />
                                </Button>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  aria-label={t('faq.remove')}
                                  onClick={() => {
                                    setOpenItems((current) => current.filter((id) => id !== faq.id))
                                    field.handleChange(faqs.filter((item) => item.id !== faq.id))
                                  }}
                                >
                                  <Trash2 className="size-4" />
                                </Button>
                              </div>
                            </div>
                            <AccordionContent>
                              <div className="flex flex-col gap-4">
                                <Field
                                  label={t('faq.question')}
                                  htmlFor={questionId}
                                  error={questionError}
                                >
                                  <Input
                                    id={questionId}
                                    value={faq.question}
                                    placeholder={t('faq.questionPlaceholder')}
                                    onChange={(event) => {
                                      const next = [...faqs]
                                      next[index] = { ...faq, question: event.target.value }
                                      field.handleChange(next)
                                    }}
                                    aria-invalid={questionError ? true : undefined}
                                  />
                                </Field>

                                <Field
                                  label={t('faq.answer')}
                                  htmlFor={answerId}
                                  error={answerError}
                                >
                                  <Textarea
                                    id={answerId}
                                    value={faq.answer}
                                    placeholder={t('faq.answerPlaceholder')}
                                    rows={3}
                                    onChange={(event) => {
                                      const next = [...faqs]
                                      next[index] = { ...faq, answer: event.target.value }
                                      field.handleChange(next)
                                    }}
                                    aria-invalid={answerError ? true : undefined}
                                  />
                                </Field>
                              </div>
                            </AccordionContent>
                          </AccordionItem>
                        )
                      })}
                    </Accordion>
                  )}

                  {listError ? <p className="text-sm text-destructive">{listError}</p> : null}

                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                    <Button
                      type="button"
                      variant="outline"
                      disabled={atMax}
                      onClick={() => {
                        const nextItem = createFaqItem()
                        field.handleChange([...faqs, nextItem])
                        setOpenItems((current) => [...current, nextItem.id])
                      }}
                    >
                      <Plus className="size-4" />
                      {t('faq.add')}
                    </Button>
                    {atMax ? (
                      <p className="text-sm text-ink-muted">
                        {t('faq.maxReached', { max: EVENT_FAQ_MAX_COUNT })}
                      </p>
                    ) : null}
                  </div>
                </div>
              )
            }}
          </form.Field>
        </FormSection>
      </form>
    </>
  )
}

function FaqDirtyReporter({
  faqs,
  initialSnapshot,
  onDirtyChange,
}: {
  faqs: EventFaqItem[]
  initialSnapshot: string
  onDirtyChange?: (isDirty: boolean) => void
}) {
  useEffect(() => {
    onDirtyChange?.(snapshotFaqs(faqs) !== initialSnapshot)
  }, [faqs, initialSnapshot, onDirtyChange])

  return null
}
