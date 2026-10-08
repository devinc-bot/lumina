// @vitest-environment jsdom
import { cleanup, render, waitFor } from '@testing-library/react'
import { afterEach, expect, test, vi } from 'vitest'

const navigate = vi.hoisted(() => vi.fn().mockResolvedValue(undefined))

vi.mock('@tanstack/react-router', () => ({ useNavigate: () => navigate }))
vi.mock('~/modules/common/components/session-loading', () => ({
  SessionLoading: () => <div>Loading session</div>,
}))
vi.mock('~/modules/common/hooks/use-session', () => ({
  useSession: () => ({ isLoading: false, isAuthenticated: false }),
}))

import { WEB_ROUTES } from '~/modules/common/constants/routes'
import { RequireAuth } from './require-auth'

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

test('redirects an unauthenticated visitor to login without rendering protected content', async () => {
  const { queryByText } = render(
    <RequireAuth>
      <p>Protected checkout result</p>
    </RequireAuth>
  )

  await waitFor(() => {
    expect(navigate).toHaveBeenCalledWith({ to: WEB_ROUTES.login(), replace: true })
  })
  expect(queryByText('Protected checkout result')).toBeNull()
})
