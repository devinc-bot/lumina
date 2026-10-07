import { createFileRoute } from '@tanstack/react-router'
import { usePageTitle } from '@repo/ui'
import { LandingPage } from '~/modules/landing/components/landing-page'
import { RequireGuest } from '~/modules/common/components/require-guest'

export const Route = createFileRoute('/')({
  component: HomePage,
})

function HomePage() {
  usePageTitle('landing', 'metaTitle')

  return (
    <RequireGuest>
      <LandingPage />
    </RequireGuest>
  )
}
