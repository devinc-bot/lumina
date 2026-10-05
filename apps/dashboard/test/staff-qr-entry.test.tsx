// @vitest-environment jsdom
import { createElement, type ReactNode } from 'react'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, expect, test, vi } from 'vitest'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      if (key === 'pages.qrTicket.startScanning') return 'Iniciar escaneo'
      if (key.toLowerCase().includes('history')) return 'Historial'
      if (key.toLowerCase().includes('scan')) return 'Escanear'
      return key
    },
  }),
}))

vi.mock('~/modules/common/components/page-layout', () => ({
  PageLayout: ({ children }: { children?: ReactNode }) => createElement('main', null, children),
}))

vi.mock('@repo/ui', async () => {
  const React = await vi.importActual<typeof import('react')>('react')
  const TabsContext = React.createContext<{
    value: string
    onValueChange: (value: string) => void
  }>({ value: 'scan', onValueChange: () => undefined })
  const Wrapper = ({ children }: { children?: ReactNode }) =>
    React.createElement('div', null, children)

  return {
    Button: ({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) =>
      React.createElement('button', props, children),
    PageLayout: ({ children }: { children?: ReactNode }) =>
      React.createElement('main', null, children),
    Tabs: ({
      value,
      onValueChange,
      children,
    }: {
      value: string
      onValueChange: (value: string) => void
      children?: ReactNode
    }) => React.createElement(TabsContext.Provider, { value: { value, onValueChange } }, children),
    TabsContent: ({ value, children }: { value: string; children?: ReactNode }) => {
      const tabs = React.useContext(TabsContext)
      return value === tabs.value ? React.createElement('div', null, children) : null
    },
    TabsList: Wrapper,
    TabsTrigger: ({ value, children }: { value: string; children?: ReactNode }) => {
      const tabs = React.useContext(TabsContext)
      return React.createElement(
        'button',
        {
          role: 'tab',
          type: 'button',
          'aria-selected': tabs.value === value,
          onClick: () => tabs.onValueChange(value),
        },
        children
      )
    },
  }
})

vi.mock('../app/modules/ticket-check-ins/components/ticket-scanner', () => ({
  TicketScanner: () => createElement('div', { 'data-testid': 'ticket-scanner' }, 'Scanner mounted'),
}))
vi.mock('../app/modules/ticket-check-ins/components/scanned-tickets-history', () => ({
  ScannedTicketsHistory: () => createElement('p', null, 'History content'),
}))

import { TicketCheckInPage } from '../app/modules/ticket-check-ins/components/ticket-check-in-page'

afterEach(cleanup)

test('QR Ticket mounts the scanner only after scan activation and keeps History available', () => {
  render(createElement(TicketCheckInPage))

  expect(screen.queryByTestId('ticket-scanner')).toBeNull()
  fireEvent.click(screen.getByRole('button', { name: 'Iniciar escaneo' }))
  expect(screen.getByTestId('ticket-scanner')).toBeTruthy()

  const historyTab = screen.getByRole('tab', { name: 'Historial' })
  expect(historyTab).toBeTruthy()
  fireEvent.click(historyTab)
  expect(screen.getByText('History content')).toBeTruthy()
  expect(screen.queryByTestId('ticket-scanner')).toBeNull()

  fireEvent.click(screen.getByRole('tab', { name: 'Escanear' }))
  expect(screen.queryByTestId('ticket-scanner')).toBeNull()
  fireEvent.click(screen.getByRole('button', { name: 'Iniciar escaneo' }))
  expect(screen.getByTestId('ticket-scanner')).toBeTruthy()
})
