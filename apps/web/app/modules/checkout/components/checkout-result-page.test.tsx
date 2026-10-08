// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, expect, test, vi } from 'vitest'

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children }: { children: React.ReactNode }) => <a>{children}</a>,
}))
vi.mock('lucide-react', () => ({
  CircleCheck: () => null,
  CircleX: () => null,
  Clock3: () => null,
}))
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }))
vi.mock('@repo/ui', () => ({
  Button: ({ children }: { children: React.ReactNode }) => <button>{children}</button>,
  Skeleton: () => <div />,
  cn: (...classes: string[]) => classes.join(' '),
}))
vi.mock('~/modules/common/components/require-auth', () => ({
  RequireAuth: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="checkout-auth-gate">{children}</div>
  ),
}))
vi.mock('~/modules/orders/components/order-summary', () => ({
  OrderSummary: () => <div />,
}))
vi.mock('../queries/use-order-query', () => ({
  useOrderQuery: () => ({ data: undefined, isError: false, isLoading: true }),
}))

import { CheckoutResultPage } from './checkout-result-page'

afterEach(cleanup)

test('wraps the checkout result in the authentication gate', () => {
  render(<CheckoutResultPage orderId="cc0ca203-6427-46e8-89b7-e885668c36c0" />)

  expect(screen.getByTestId('checkout-auth-gate')).not.toBeNull()
})
