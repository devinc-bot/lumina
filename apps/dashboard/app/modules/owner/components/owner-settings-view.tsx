import type { CurrentOwnerResponse } from '@repo/types'
import { useTranslation } from 'react-i18next'
import { PageLayout } from '~/modules/common/components/page-layout'
import { OrganizationSettingsSection } from '~/modules/owner/components/organization-settings-section'
import { MercadoPagoConnectionSection } from '~/modules/owner/components/mercado-pago-connection-section'
import { ProfileSettingsSection } from '~/modules/owner/components/profile-settings-section'
import { SettingsFormActions } from '~/modules/settings/components/settings-form-actions'
import { SETTINGS_FORM_ID, SETTINGS_SAVE_STATUS } from '~/modules/settings/constants/settings-form'
import { SettingsFormProvider, useSettingsForm } from '~/modules/owner/hooks/settings-form-context'

function SettingsFormContent() {
  const { save, isDirty, saveStatus, discard } = useSettingsForm()

  return (
    <form
      id={SETTINGS_FORM_ID}
      noValidate
      className="flex flex-col gap-8"
      onSubmit={(event) => {
        event.preventDefault()
        void save()
      }}
    >
      <div className="flex flex-col gap-12">
        <ProfileSettingsSection />
        <OrganizationSettingsSection />
        <MercadoPagoConnectionSection />
      </div>
      <SettingsFormActions
        isDirty={isDirty}
        isSaving={saveStatus === SETTINGS_SAVE_STATUS.SAVING}
        onDiscard={discard}
      />
    </form>
  )
}

export function OwnerSettingsView({ owner }: { owner: CurrentOwnerResponse }) {
  const { t } = useTranslation('settings')

  return (
    <PageLayout title={t('owner.page.title')} description={t('owner.page.description')}>
      <SettingsFormProvider user={owner}>
        <SettingsFormContent />
      </SettingsFormProvider>
    </PageLayout>
  )
}
