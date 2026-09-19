import { useSyncExternalStore } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Map,
  MapControls,
  MapMarker,
  MapPinMarker,
  MarkerContent,
  MarkerPopup,
  useTheme,
} from '@repo/ui'
import { EVENTS_DISCOVER_MAP_SINGLE_ZOOM } from '../../constants/events-discover-map'

type EventDetailMapProps = {
  latitude: number
  longitude: number
  locationName: string
  addressText: string | null
}

const subscribeToClient = () => () => undefined

export function EventDetailMap({
  latitude,
  longitude,
  locationName,
  addressText,
}: EventDetailMapProps) {
  const { t } = useTranslation('events')
  const { theme } = useTheme()
  const mounted = useSyncExternalStore(
    subscribeToClient,
    () => true,
    () => false
  )
  const markerLabel = locationName.trim() || addressText || t('discover.detail.map')

  if (!mounted) {
    return (
      <div
        className="flex h-56 items-center justify-center overflow-hidden rounded-app-lg border border-hairline/50 bg-muted/40 sm:h-64"
        aria-label={t('discover.detail.mapAriaLabel')}
      >
        <p className="font-label text-sm text-on-surface-variant">
          {t('discover.detail.mapLoading')}
        </p>
      </div>
    )
  }

  return (
    <div
      className="relative h-80 overflow-hidden rounded-app-lg border border-hairline/50 sm:h-96"
      aria-label={t('discover.detail.mapAriaLabel')}
    >
      <Map
        theme={theme}
        center={[longitude, latitude]}
        zoom={EVENTS_DISCOVER_MAP_SINGLE_ZOOM}
        className="h-full w-full"
      >
        <MapControls showZoom showCompass showLocate={false} />
        <MapMarker longitude={longitude} latitude={latitude}>
          <MarkerContent>
            <MapPinMarker label={markerLabel} />
          </MarkerContent>
          <MarkerPopup>
            <div className="max-w-[18rem] space-y-1 p-1">
              {locationName.trim() ? (
                <p className="font-label text-sm font-medium text-balance text-foreground">
                  {locationName}
                </p>
              ) : null}
              {addressText ? (
                <p className="font-body text-xs leading-relaxed text-pretty text-muted-foreground">
                  {addressText}
                </p>
              ) : null}
            </div>
          </MarkerPopup>
        </MapMarker>
      </Map>
    </div>
  )
}
