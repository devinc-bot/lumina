import { useTranslation } from 'react-i18next'
import { Clock, MapPin } from 'lucide-react'
import { Link } from '@tanstack/react-router'
import type { LocationResponse } from '@repo/types'
import { Button, requiredFieldLabel, SelectField, SelectItem } from '@repo/ui'
import { DASHBOARD_ROUTES } from '~/modules/common/constants/routes'
import { FormSection } from '~/modules/common/components/form-section'

type EventLocationFieldProps = {
  locations: LocationResponse[]
  isLoading: boolean
  isError: boolean
  locationId: string
  lastUsedLocationId?: string | null
  onLocationIdChange: (locationId: string) => void
}

export function EventLocationField({
  locations,
  isLoading,
  isError,
  locationId,
  lastUsedLocationId,
  onLocationIdChange,
}: EventLocationFieldProps) {
  const { t } = useTranslation('events')
  const isEmpty = !isLoading && !isError && locations.length === 0
  const selectedLocation = locations.find((location) => location.documentId === locationId)
  const selectedLocationImage = selectedLocation?.images[0]

  return (
    <FormSection
      id="event-location-field"
      title={t('form.locationSectionTitle')}
      description={t('form.locationSectionDescription')}
    >
      {isEmpty ? (
        <div className="flex flex-col items-start gap-3 rounded-xl border border-dashed border-hairline bg-surface-container-low px-4 py-6">
          <p className="text-sm text-ink-muted">{t('form.noLocationsMessage')}</p>
          <Button asChild variant="outline" size="sm">
            <Link to={DASHBOARD_ROUTES.locationsNew()}>{t('form.addLocationLink')}</Link>
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <SelectField
            label={requiredFieldLabel(t('form.location'))}
            value={locationId || undefined}
            onValueChange={onLocationIdChange}
            placeholder={isLoading ? t('form.locationLoading') : t('form.locationPlaceholder')}
            error={isError ? t('form.locationsLoadError') : undefined}
            disabled={isLoading || isError}
            valueContent={
              selectedLocation ? (
                <span className="flex min-w-0 items-center gap-3">
                  <span
                    aria-hidden="true"
                    className="flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-md bg-surface-container-high"
                  >
                    {selectedLocationImage?.url ? (
                      <img
                        src={selectedLocationImage.url}
                        alt=""
                        className="size-full object-cover"
                      />
                    ) : (
                      <MapPin className="size-6 text-ink-muted-soft" />
                    )}
                  </span>
                  <span className="truncate">{selectedLocation.name}</span>
                </span>
              ) : undefined
            }
          >
            {locations.map((location) => (
              <SelectItem
                key={location.documentId}
                value={location.documentId}
                textValue={location.name}
                leadingContent={
                  location.images[0]?.url ? (
                    <img
                      src={location.images[0].url}
                      alt=""
                      className="object-cover p-0"
                      loading="lazy"
                      decoding="async"
                    />
                  ) : (
                    <MapPin className="size-6 text-ink-muted-soft" />
                  )
                }
              >
                {location.name}
              </SelectItem>
            ))}
          </SelectField>
          {!isError && locationId && locationId === lastUsedLocationId ? (
            <p className="flex items-center gap-1.5 text-sm text-ink-muted-soft">
              <Clock className="size-3.5 shrink-0" aria-hidden="true" />
              {t('form.lastLocationHint')}
            </p>
          ) : null}
        </div>
      )}
    </FormSection>
  )
}
