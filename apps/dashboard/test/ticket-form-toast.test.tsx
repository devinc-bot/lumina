// @vitest-environment jsdom
import { createElement, type ReactNode } from 'react'
import { cleanup, fireEvent, render, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'

const mutationMocks = vi.hoisted(() => ({
  create: {
    isPending: false,
    mutateAsync: vi.fn(),
  },
  update: {
    isPending: false,
    mutateAsync: vi.fn(),
  },
}))

const toastMocks = vi.hoisted(() => ({
  error: vi.fn(),
  success: vi.fn(),
}))

const formMocks = vi.hoisted(() => ({
  handleSubmit: vi.fn(),
  reset: vi.fn(),
}))

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}))

vi.mock('@tanstack/react-form', () => ({
  useForm: (options: { onSubmit: (input: { value: object }) => Promise<void> }) => ({
    handleSubmit: () => {
      formMocks.handleSubmit()
      return options.onSubmit({ value: {} })
    },
    reset: formMocks.reset,
    setFieldValue: vi.fn(),
    Field: () => null,
    Subscribe: () => null,
  }),
}))

vi.mock('@repo/types', () => ({
  TICKET_STATUS: { ACTIVE: 'active', INACTIVE: 'inactive' },
}))

vi.mock('@repo/validators', () => ({
  parseTicketFormToCreateInput: () => ({}),
  parseTicketFormToUpdateInput: () => ({}),
  ticketFormSchema: {
    shape: {
      eventId: {},
      ticketTypeId: {},
      status: {},
      description: {},
      price: {},
      quantity: {},
      saleStartsAt: {},
      saleEndsAt: {},
    },
  },
}))

vi.mock('@repo/i18n/client', () => ({
  useResolveFieldError: () => () => undefined,
}))

vi.mock('@repo/ui', () => ({
  Button: ({ children }: { children?: ReactNode }) => createElement('button', undefined, children),
  DialogClose: ({ children }: { children?: ReactNode }) => children,
  DialogFooter: ({ children }: { children?: ReactNode }) =>
    createElement('div', undefined, children),
  DateTimeInput: () => null,
  Field: ({ children }: { children?: ReactNode }) => children,
  Input: () => null,
  SelectField: ({ children }: { children?: ReactNode }) => children,
  SelectItem: ({ children }: { children?: ReactNode }) => children,
  Textarea: () => null,
  cn: (...classes: string[]) => classes.filter(Boolean).join(' '),
  optionalFieldLabel: (label: string) => label,
  requiredFieldLabel: (label: string) => label,
  toast: toastMocks,
}))

vi.mock('~/modules/common/components/form-section', () => ({
  FormSection: ({ children }: { children?: ReactNode }) =>
    createElement('section', undefined, children),
}))

vi.mock('~/modules/tickets/mutation/use-ticket-mutations', () => ({
  useCreateTicket: () => mutationMocks.create,
  useUpdateTicket: () => mutationMocks.update,
}))

vi.mock('~/modules/tickets/queries/use-owner-events', () => ({
  useOwnerEventsForSelect: () => ({ data: { data: [] }, isLoading: false, isError: false }),
}))

vi.mock('~/modules/ticket-types/queries/use-ticket-type-queries', () => ({
  useTicketTypes: () => ({ data: [], isLoading: false, isError: false }),
}))

vi.mock('~/modules/ticket-types/components/ticket-type-create-dialog', () => ({
  TicketTypeCreateDialog: () => null,
}))

vi.mock('~/modules/tickets/utils/ticket-form.formatter', () => ({
  EMPTY_TICKET_FORM_VALUES: {},
}))

vi.mock('~/modules/tickets/components/ticket-commercial-breakdown', () => ({
  TicketCommercialBreakdown: () => null,
}))

import {
  TICKET_FORM_ID,
  TICKET_FORM_MODE,
  TicketForm,
} from '../app/modules/tickets/components/ticket-form'

const CAPACITY_ERROR_MESSAGE = 'La cantidad total de tickets supera la capacidad de la ubicación.'

function renderTicketForm(mode: (typeof TICKET_FORM_MODE)[keyof typeof TICKET_FORM_MODE]) {
  render(
    createElement(TicketForm, {
      mode,
      documentId: 'ticket-document-id',
      onSuccess: vi.fn(),
      renderFooter: () => null,
    })
  )
}

function submitTicketForm() {
  const form = document.getElementById(TICKET_FORM_ID)

  if (!form) {
    throw new Error('Ticket form was not rendered')
  }

  fireEvent.submit(form)
}

beforeEach(() => {
  formMocks.handleSubmit.mockReset()
  formMocks.reset.mockReset()
  mutationMocks.create.mutateAsync.mockReset()
  mutationMocks.update.mutateAsync.mockReset()
  toastMocks.error.mockReset()
  toastMocks.success.mockReset()
})

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

test('shows the API capacity error when creating a ticket fails', async () => {
  mutationMocks.create.mutateAsync.mockRejectedValueOnce(new Error(CAPACITY_ERROR_MESSAGE))
  renderTicketForm(TICKET_FORM_MODE.CREATE)

  submitTicketForm()

  await waitFor(() => expect(toastMocks.error).toHaveBeenCalledWith(CAPACITY_ERROR_MESSAGE))
})

test('shows the API capacity error when editing a ticket fails', async () => {
  mutationMocks.update.mutateAsync.mockRejectedValueOnce(new Error(CAPACITY_ERROR_MESSAGE))
  renderTicketForm(TICKET_FORM_MODE.EDIT)

  submitTicketForm()

  await waitFor(() => expect(toastMocks.error).toHaveBeenCalledWith(CAPACITY_ERROR_MESSAGE))
})

test('uses the localized create fallback when the failure has no message', async () => {
  mutationMocks.create.mutateAsync.mockRejectedValueOnce(undefined)
  renderTicketForm(TICKET_FORM_MODE.CREATE)

  submitTicketForm()

  await waitFor(() => expect(toastMocks.error).toHaveBeenCalledWith('form.errorCreate'))
})
