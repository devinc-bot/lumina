import { useTranslation } from 'react-i18next'
import { Button, DateInput, Input, Label, cn } from '@repo/ui'
import {
  countActiveDiscoverFilters,
  type EventsDiscoverFiltersValue,
} from '../utils/events-discover-filters'

type EventsDiscoverFiltersPanelProps = {
  value: EventsDiscoverFiltersValue
  onChange: (next: EventsDiscoverFiltersValue) => void
  onApply: () => void
  onClear: () => void
  dateRangeError?: string | null
  /** Prefix form control ids when the panel can mount twice. */
  idPrefix?: string
  showHeading?: boolean
  /** True when draft filters differ from applied filters. */
  isDirty?: boolean
  /** Show the pending-changes hint above the primary action. */
  showPendingHint?: boolean
  /** `bar` = horizontal top toolbar; `stack` = vertical sidebar/sheet. */
  layout?: 'stack' | 'bar'
}

export function EventsDiscoverFiltersPanel({
  value,
  onChange,
  onApply,
  onClear,
  dateRangeError = null,
  idPrefix = 'events-filter',
  showHeading = true,
  isDirty = false,
  showPendingHint = true,
  layout = 'stack',
}: EventsDiscoverFiltersPanelProps) {
  const { t } = useTranslation('events')
  const startsFromId = `${idPrefix}-starts-from`
  const startsToId = `${idPrefix}-starts-to`
  const cityId = `${idPrefix}-city`
  const stateId = `${idPrefix}-state`
  const whenLegendId = `${idPrefix}-when`
  const whereLegendId = `${idPrefix}-where`
  const applyHintId = `${idPrefix}-apply-hint`
  const isBar = layout === 'bar'
  const canClear = countActiveDiscoverFilters(value) > 0 || isDirty
  const showPending = showPendingHint && isDirty

  return (
    <form
      className={cn('flex flex-col gap-4', isBar && 'gap-4 lg:flex-row lg:items-end lg:gap-6')}
      onSubmit={(event) => {
        event.preventDefault()
        onApply()
      }}
    >
      {showHeading ? (
        <h3
          className={cn(
            'font-display text-base font-semibold tracking-tight text-balance text-on-surface',
            isBar && 'lg:sr-only'
          )}
        >
          {t('discover.filters.title')}
        </h3>
      ) : null}

      <div
        className={cn(
          'min-w-0 flex-1',
          isBar ? 'grid grid-cols-1 gap-5 sm:grid-cols-2 sm:gap-6' : 'flex flex-col gap-5'
        )}
      >
        <fieldset className="min-w-0 border-0 p-0">
          <legend
            id={whenLegendId}
            className="mb-2.5 w-full px-0 text-sm font-medium text-on-surface"
          >
            {t('discover.filters.when')}
          </legend>
          <div className={cn('grid gap-3', isBar ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1')}>
            <div className="flex flex-col gap-2">
              <Label htmlFor={startsFromId} variant="default">
                {t('discover.filters.startsFrom')}
              </Label>
              <DateInput
                id={startsFromId}
                name="startsFrom"
                value={value.startsFrom}
                onChange={(event) => onChange({ ...value, startsFrom: event.target.value })}
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor={startsToId} variant="default">
                {t('discover.filters.startsTo')}
              </Label>
              <DateInput
                id={startsToId}
                name="startsTo"
                value={value.startsTo}
                onChange={(event) => onChange({ ...value, startsTo: event.target.value })}
                aria-invalid={dateRangeError ? true : undefined}
                aria-describedby={dateRangeError ? `${startsToId}-error` : undefined}
              />
              {dateRangeError ? (
                <p id={`${startsToId}-error`} role="alert" className="text-xs text-error">
                  {dateRangeError}
                </p>
              ) : null}
            </div>
          </div>
        </fieldset>

        <fieldset className="min-w-0 border-0 p-0">
          <legend
            id={whereLegendId}
            className="mb-2.5 w-full px-0 text-sm font-medium text-on-surface"
          >
            {t('discover.filters.where')}
          </legend>
          <div className={cn('grid gap-3', isBar ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1')}>
            <div className="flex flex-col gap-2">
              <Label htmlFor={cityId} variant="default">
                {t('discover.filters.city')}
              </Label>
              <Input
                id={cityId}
                name="city"
                value={value.city}
                placeholder={t('discover.filters.cityPlaceholder')}
                onChange={(event) => onChange({ ...value, city: event.target.value })}
                autoComplete="address-level2"
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor={stateId} variant="default">
                {t('discover.filters.state')}
              </Label>
              <Input
                id={stateId}
                name="state"
                value={value.state}
                placeholder={t('discover.filters.statePlaceholder')}
                onChange={(event) => onChange({ ...value, state: event.target.value })}
                autoComplete="address-level1"
              />
            </div>
          </div>
        </fieldset>
      </div>

      <div
        className={cn(
          'flex shrink-0 flex-col gap-2',
          isBar ? 'w-full sm:w-auto lg:min-w-52' : 'pt-1'
        )}
      >
        {showPendingHint ? (
          <p id={applyHintId} className="min-h-4 text-xs" aria-live="polite">
            {showPending ? (
              <span className="text-primary">{t('discover.filters.pendingChanges')}</span>
            ) : (
              <span>{t('discover.filters.applyIdleHint')}</span>
            )}
          </p>
        ) : null}

        <div className={cn('flex gap-2', isBar ? 'flex-col sm:flex-row' : 'flex-col')}>
          <Button
            type="submit"
            className={cn('min-h-11 whitespace-nowrap', isBar ? 'sm:min-w-28 sm:flex-1' : 'w-full')}
            disabled={!isDirty}
            aria-describedby={showPendingHint ? applyHintId : undefined}
          >
            {t('discover.filters.apply')}
          </Button>
          <Button
            type="button"
            variant="outline"
            className={cn('min-h-11 whitespace-nowrap', isBar ? 'sm:min-w-28 sm:flex-1' : 'w-full')}
            disabled={!canClear}
            onClick={onClear}
          >
            {t('discover.filters.clear')}
          </Button>
        </div>
      </div>
    </form>
  )
}
