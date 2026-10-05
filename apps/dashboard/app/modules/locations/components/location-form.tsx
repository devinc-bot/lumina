import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useForm } from '@tanstack/react-form'
import { Crosshair } from 'lucide-react'
import { useResolveFieldError } from '@repo/i18n/client'
import type { LocationImageResponse } from '@repo/types'
import { createLocationSchema, type CreateLocationInput } from '@repo/validators'
import {
  Button,
  cn,
  Input,
  Label,
  optionalFieldLabel,
  requiredFieldLabel,
  Textarea,
  toast,
} from '@repo/ui'
import { FormSection } from '~/modules/common/components/form-section'
import { ImagesLocationForm } from '~/modules/locations/components/images-location-form'
import { LocationMap } from '~/modules/locations/components/location-map'
import {
  type useCreateLocation,
  type useUpdateLocation,
} from '~/modules/locations/mutation/use-locations-mutations'
import { fetchIpLocation } from '~/modules/locations/service/geo.service'
import { snapshotLocationFormValues } from '~/modules/locations/utils/location-form.formatter'

export const LOCATION_FORM_MODE = {
  CREATE: 'create',
  EDIT: 'edit',
} as const

export type LocationFormMode = (typeof LOCATION_FORM_MODE)[keyof typeof LOCATION_FORM_MODE]

export const LOCATION_FORM_ID = 'location-form'

export type LocationFormValues = Omit<CreateLocationInput, 'latitude' | 'longitude'> & {
  latitude: number | null
  longitude: number | null
  existingImages: LocationImageResponse[]
  locationImg: File[]
}

export const EMPTY_LOCATION_FORM_VALUES: LocationFormValues = {
  name: '',
  address: '',
  capacity: '',
  description: '',
  state: '',
  street_number: '',
  city: '',
  latitude: null,
  longitude: null,
  existingImages: [],
  locationImg: [],
}

const fieldLabelClassName =
  'font-label text-xs font-semibold uppercase tracking-label-xs text-ink-muted'

const fieldErrorMessageClassName = 'text-xs text-error'

function sanitizeNonNegativeDigits(value: string): string {
  return value.replace(/\D/g, '')
}

type LocationFormFieldProps = {
  id: string
  label: string
  placeholder?: string
  value: string
  error: string | null
  onBlur: () => void
  onChange: (value: string) => void
  inputMode?: React.HTMLAttributes<HTMLInputElement>['inputMode']
  sanitize?: (value: string) => string
  className?: string
}

function LocationFormField({
  id,
  label,
  placeholder,
  value,
  error,
  onBlur,
  onChange,
  inputMode,
  sanitize,
  className,
}: LocationFormFieldProps) {
  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <Label htmlFor={id} className={fieldLabelClassName}>
        {label}
      </Label>
      <Input
        id={id}
        name={id}
        type="text"
        inputMode={inputMode}
        autoComplete="off"
        value={value}
        placeholder={placeholder}
        onBlur={onBlur}
        onChange={(event) => onChange(sanitize ? sanitize(event.target.value) : event.target.value)}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
      />
      {error ? (
        <p id={`${id}-error`} role="alert" className={fieldErrorMessageClassName}>
          {error}
        </p>
      ) : null}
    </div>
  )
}

type LocationFormProps = {
  mode: LocationFormMode
  locationDocumentId?: string
  defaultValues?: Partial<LocationFormValues>
  createLocationMutation: ReturnType<typeof useCreateLocation>
  updateLocationMutation: ReturnType<typeof useUpdateLocation>
  onDirtyChange?: (isDirty: boolean) => void
  onSuccess?: () => void
}

export function LocationForm({
  mode,
  locationDocumentId,
  defaultValues,
  createLocationMutation,
  updateLocationMutation,
  onDirtyChange,
  onSuccess,
}: LocationFormProps) {
  const { t } = useTranslation('locations')
  const { t: tCommon } = useTranslation('common')
  const resolveFieldError = useResolveFieldError()
  const isCreate = mode === LOCATION_FORM_MODE.CREATE
  const initialSnapshotRef = useRef(
    snapshotLocationFormValues({ ...EMPTY_LOCATION_FORM_VALUES, ...defaultValues })
  )
  const [mapViewToken, setMapViewToken] = useState(0)
  const [ipLocating, setIpLocating] = useState(false)
  const [ipLocateError, setIpLocateError] = useState<string | null>(null)
  const pinAdjustedByUserRef = useRef(false)

  const form = useForm({
    defaultValues: { ...EMPTY_LOCATION_FORM_VALUES, ...defaultValues },
    onSubmit: async ({ value }) => {
      if (value.latitude === null || value.longitude === null) {
        toast.error(t('map.coordinatesRequired'))
        return
      }

      if (isCreate) {
        const formData = new FormData()

        formData.append('name', value.name)
        formData.append('capacity', value.capacity)
        formData.append('description', value.description)
        formData.append('address', value.address)
        formData.append('street_number', value.street_number)
        formData.append('city', value.city)
        formData.append('state', value.state)
        formData.append('latitude', String(value.latitude))
        formData.append('longitude', String(value.longitude))

        for (const image of value.locationImg) {
          formData.append('images', image)
        }

        try {
          await createLocationMutation.mutateAsync(formData)
          toast.success(t('formPage.toastCreateSuccess'))
          onSuccess?.()
        } catch (error) {
          toast.error(error instanceof Error ? error.message : t('formPage.toastCreateError'))
        }
        return
      }

      const { locationImg, existingImages, ...locationPayload } = value

      if (!locationDocumentId) {
        toast.error(t('formPage.toastMissingLocationId'))
        return
      }

      const formData = new FormData()

      formData.append('name', locationPayload.name)
      formData.append('capacity', locationPayload.capacity)
      formData.append('description', locationPayload.description)
      formData.append('address', locationPayload.address)
      formData.append('street_number', locationPayload.street_number)
      formData.append('city', locationPayload.city)
      formData.append('state', locationPayload.state)
      formData.append('latitude', String(locationPayload.latitude))
      formData.append('longitude', String(locationPayload.longitude))

      for (const image of existingImages) {
        formData.append('keepImageIds', image.documentId)
      }

      for (const image of locationImg) {
        formData.append('images', image)
      }

      try {
        await updateLocationMutation.mutateAsync({ documentId: locationDocumentId, formData })
        toast.success(t('formPage.toastEditSuccess'))
        onSuccess?.()
      } catch (error) {
        toast.error(error instanceof Error ? error.message : t('formPage.toastEditError'))
      }
    },
  })

  function setCoordinatesFromMap(coords: { latitude: number; longitude: number }) {
    pinAdjustedByUserRef.current = true
    form.setFieldValue('latitude', coords.latitude)
    form.setFieldValue('longitude', coords.longitude)
  }

  async function handleIpLocate() {
    setIpLocating(true)
    setIpLocateError(null)

    try {
      const result = await fetchIpLocation()
      pinAdjustedByUserRef.current = true
      form.setFieldValue('latitude', result.latitude)
      form.setFieldValue('longitude', result.longitude)
      form.setFieldValue('city', result.city ?? '')
      form.setFieldValue('state', result.state ?? '')
      setMapViewToken((token) => token + 1)
    } catch (error) {
      setIpLocateError(error instanceof Error ? error.message : t('map.ipLocateError'))
    } finally {
      setIpLocating(false)
    }
  }

  return (
    <form
      id={LOCATION_FORM_ID}
      noValidate
      onSubmit={(event) => {
        event.preventDefault()
        event.stopPropagation()
        void form.handleSubmit()
      }}
    >
      <form.Subscribe selector={(state) => state.values}>
        {(values) => (
          <DirtyTracker
            values={values}
            initialSnapshot={initialSnapshotRef.current}
            onDirtyChange={onDirtyChange}
          />
        )}
      </form.Subscribe>

      <div className="flex flex-col gap-12">
        <FormSection
          id="location-general"
          title={t('sections.generalTitle')}
          description={t('sections.generalDescription')}
        >
          <p className="text-xs text-ink-muted">{t('formPage.requiredFieldsHint')}</p>

          <form.Field name="name" validators={{ onSubmit: createLocationSchema.shape.name }}>
            {(field) => (
              <LocationFormField
                id={field.name}
                label={requiredFieldLabel(t('form.fields.name'))}
                placeholder={t('form.fields.namePlaceholder')}
                value={field.state.value}
                error={resolveFieldError(field.state.meta.errors)}
                onBlur={field.handleBlur}
                onChange={field.handleChange}
              />
            )}
          </form.Field>

          <form.Field
            name="capacity"
            validators={{ onSubmit: createLocationSchema.shape.capacity }}
          >
            {(field) => (
              <LocationFormField
                id={field.name}
                label={requiredFieldLabel(t('form.fields.capacity'))}
                placeholder={t('form.fields.capacityPlaceholder')}
                inputMode="numeric"
                sanitize={sanitizeNonNegativeDigits}
                value={field.state.value}
                error={resolveFieldError(field.state.meta.errors)}
                onBlur={field.handleBlur}
                onChange={field.handleChange}
              />
            )}
          </form.Field>

          <form.Field
            name="description"
            validators={{ onSubmit: createLocationSchema.shape.description }}
          >
            {(field) => {
              const error = resolveFieldError(field.state.meta.errors)

              return (
                <div className="flex flex-col gap-2">
                  <Label htmlFor={field.name} className={fieldLabelClassName}>
                    {requiredFieldLabel(t('form.fields.additionalInfo'))}
                  </Label>
                  <Textarea
                    id={field.name}
                    name={field.name}
                    value={field.state.value}
                    placeholder={t('form.fields.additionalInfoPlaceholder')}
                    onBlur={field.handleBlur}
                    onChange={(event) => field.handleChange(event.target.value)}
                    error={error ?? undefined}
                    className="text-sm"
                  />
                </div>
              )
            }}
          </form.Field>
        </FormSection>

        <FormSection
          id="location-address"
          title={t('sections.locationTitle')}
          description={t('sections.locationDescription')}
        >
          <form.Field name="city" validators={{ onSubmit: createLocationSchema.shape.city }}>
            {(field) => {
              const error = resolveFieldError(field.state.meta.errors) ?? ipLocateError

              return (
                <div className="flex flex-col gap-2">
                  <Label htmlFor={field.name} className={fieldLabelClassName}>
                    {requiredFieldLabel(t('form.fields.city'))}
                  </Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id={field.name}
                      name={field.name}
                      type="text"
                      autoComplete="off"
                      value={field.state.value}
                      placeholder={t('form.fields.cityPlaceholder')}
                      onBlur={field.handleBlur}
                      onChange={(event) => {
                        setIpLocateError(null)
                        field.handleChange(event.target.value)
                      }}
                      aria-invalid={error ? true : undefined}
                      aria-describedby={error ? `${field.name}-error` : undefined}
                      className="min-w-0 flex-1"
                    />
                    <Button
                      type="button"
                      size="icon"
                      aria-label={t('map.ipLocate')}
                      title={t('map.ipLocate')}
                      disabled={ipLocating}
                      className="size-9"
                      onClick={() => {
                        void handleIpLocate()
                      }}
                    >
                      <Crosshair
                        className={`size-4 ${ipLocating ? 'animate-pulse' : ''}`}
                        aria-hidden
                      />
                    </Button>
                  </div>
                  {ipLocating ? (
                    <p className="text-xs text-ink-muted">{t('map.ipLocateLoading')}</p>
                  ) : null}
                  {error && !ipLocating ? (
                    <p
                      id={`${field.name}-error`}
                      role="alert"
                      className={fieldErrorMessageClassName}
                    >
                      {error}
                    </p>
                  ) : null}
                </div>
              )
            }}
          </form.Field>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <form.Field
              name="address"
              validators={{ onSubmit: createLocationSchema.shape.address }}
            >
              {(field) => (
                <LocationFormField
                  id={field.name}
                  label={requiredFieldLabel(t('form.fields.address'))}
                  placeholder={t('form.fields.addressPlaceholder')}
                  value={field.state.value}
                  error={resolveFieldError(field.state.meta.errors)}
                  onBlur={field.handleBlur}
                  onChange={field.handleChange}
                  className="col-span-2"
                />
              )}
            </form.Field>
            <form.Field
              name="street_number"
              validators={{ onSubmit: createLocationSchema.shape.street_number }}
            >
              {(field) => (
                <LocationFormField
                  id={field.name}
                  label={requiredFieldLabel(t('form.fields.streetNumber'))}
                  placeholder={t('form.fields.streetNumberPlaceholder')}
                  inputMode="numeric"
                  sanitize={sanitizeNonNegativeDigits}
                  value={field.state.value}
                  error={resolveFieldError(field.state.meta.errors)}
                  onBlur={field.handleBlur}
                  onChange={field.handleChange}
                  className="col-span-1"
                />
              )}
            </form.Field>
          </div>

          <form.Field name="state" validators={{ onSubmit: createLocationSchema.shape.state }}>
            {(field) => (
              <LocationFormField
                id={field.name}
                label={requiredFieldLabel(t('form.fields.state'))}
                placeholder={t('form.fields.statePlaceholder')}
                value={field.state.value}
                error={resolveFieldError(field.state.meta.errors)}
                onBlur={field.handleBlur}
                onChange={field.handleChange}
              />
            )}
          </form.Field>

          <form.Subscribe
            selector={(state) => ({
              latitude: state.values.latitude,
              longitude: state.values.longitude,
            })}
          >
            {(location) => (
              <form.Field
                name="latitude"
                validators={{
                  onSubmit: ({ value }) =>
                    value === null ? t('map.coordinatesRequired') : undefined,
                }}
              >
                {(latField) => (
                  <form.Field
                    name="longitude"
                    validators={{
                      onSubmit: ({ value }) =>
                        value === null ? t('map.coordinatesRequired') : undefined,
                    }}
                  >
                    {(lngField) => {
                      const coordsError =
                        resolveFieldError(latField.state.meta.errors) ??
                        resolveFieldError(lngField.state.meta.errors)

                      return (
                        <div className="flex flex-col gap-2">
                          <LocationMap
                            latitude={location.latitude}
                            longitude={location.longitude}
                            viewToken={mapViewToken}
                            onCoordinatesChange={setCoordinatesFromMap}
                          />
                          {coordsError ? (
                            <p role="alert" className={fieldErrorMessageClassName}>
                              {coordsError}
                            </p>
                          ) : null}
                        </div>
                      )
                    }}
                  </form.Field>
                )}
              </form.Field>
            )}
          </form.Subscribe>
        </FormSection>

        <FormSection
          id="location-images"
          title={optionalFieldLabel(t('sections.imagesTitle'), tCommon('optional'))}
          description={t('sections.imagesDescription')}
        >
          <form.Field name="existingImages">
            {(existingField) => (
              <form.Field name="locationImg">
                {(newField) => (
                  <ImagesLocationForm
                    existingImages={existingField.state.value}
                    onExistingImagesChange={existingField.handleChange}
                    newImages={newField.state.value}
                    onNewImagesChange={newField.handleChange}
                  />
                )}
              </form.Field>
            )}
          </form.Field>
        </FormSection>
      </div>
    </form>
  )
}

function DirtyTracker({
  values,
  initialSnapshot,
  onDirtyChange,
}: {
  values: LocationFormValues
  initialSnapshot: string
  onDirtyChange?: (isDirty: boolean) => void
}) {
  useEffect(() => {
    const isDirty = snapshotLocationFormValues(values) !== initialSnapshot
    onDirtyChange?.(isDirty)
  }, [values, initialSnapshot, onDirtyChange])

  return null
}
