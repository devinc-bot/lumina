import { useEffect, useRef, useSyncExternalStore } from 'react'
import { useTranslation } from 'react-i18next'
import { Map, MapControls, MapMarker, MapPinMarker, MarkerContent, useMap } from '@repo/ui'
import {
  LOCATION_MAP_SELECTED_ZOOM,
  DEFAULT_LOCATION_MAP_CENTER,
  DEFAULT_LOCATION_MAP_ZOOM,
} from '~/modules/locations/constants/location-map'

type Coordinates = {
  latitude: number
  longitude: number
}

type LocationMapProps = {
  latitude: number | null
  longitude: number | null
  viewToken: number
  onCoordinatesChange: (coords: Coordinates) => void
  className?: string
}

const subscribeToClient = () => () => undefined

function MapClickToPlace({
  enabled,
  onPlace,
}: {
  enabled: boolean
  onPlace: (coords: Coordinates) => void
}) {
  const { map } = useMap()
  const onPlaceRef = useRef(onPlace)

  useEffect(() => {
    onPlaceRef.current = onPlace
  }, [onPlace])

  useEffect(() => {
    if (!map || !enabled) {
      return
    }

    const handleClick = (event: { lngLat: { lng: number; lat: number } }) => {
      onPlaceRef.current({ latitude: event.lngLat.lat, longitude: event.lngLat.lng })
    }

    map.on('click', handleClick)
    return () => {
      map.off('click', handleClick)
    }
  }, [enabled, map])

  return null
}

function MapRecenter({
  latitude,
  longitude,
  viewToken,
}: {
  latitude: number
  longitude: number
  viewToken: number
}) {
  const { map, isLoaded } = useMap()
  const lastTokenRef = useRef<number | null>(null)

  useEffect(() => {
    if (!map || !isLoaded) {
      return
    }

    if (lastTokenRef.current === viewToken) {
      return
    }

    lastTokenRef.current = viewToken
    map.flyTo({
      center: [longitude, latitude],
      zoom: LOCATION_MAP_SELECTED_ZOOM,
      essential: true,
    })
  }, [isLoaded, latitude, longitude, map, viewToken])

  return null
}

export function LocationMap({
  latitude,
  longitude,
  viewToken,
  onCoordinatesChange,
  className,
}: LocationMapProps) {
  const { t } = useTranslation('locations')
  const mounted = useSyncExternalStore(
    subscribeToClient,
    () => true,
    () => false
  )
  const didRequestGeo = useRef(false)
  const onCoordinatesChangeRef = useRef(onCoordinatesChange)

  useEffect(() => {
    onCoordinatesChangeRef.current = onCoordinatesChange
  }, [onCoordinatesChange])

  const hasPin = latitude !== null && longitude !== null
  const initialCenter: [number, number] = hasPin
    ? [longitude, latitude]
    : [DEFAULT_LOCATION_MAP_CENTER.longitude, DEFAULT_LOCATION_MAP_CENTER.latitude]

  useEffect(() => {
    if (!mounted || hasPin || didRequestGeo.current) {
      return
    }

    didRequestGeo.current = true

    if (!navigator.geolocation) {
      return
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        onCoordinatesChangeRef.current({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        })
      },
      () => undefined,
      { enableHighAccuracy: false, timeout: 8_000, maximumAge: 60_000 }
    )
  }, [hasPin, mounted])

  if (!mounted) {
    return (
      <div
        className={`bg-muted/40 flex h-70 items-center justify-center overflow-hidden rounded-app ${className ?? ''}`}
      >
        <p className="text-sm text-ink-muted">{t('map.mapLoading')}</p>
      </div>
    )
  }

  return (
    <div className={`flex flex-col gap-2 ${className ?? ''}`}>
      <div className="relative aspect-video overflow-hidden rounded-app border border-hairline">
        <Map
          center={initialCenter}
          zoom={hasPin ? LOCATION_MAP_SELECTED_ZOOM : DEFAULT_LOCATION_MAP_ZOOM}
          className="h-full w-full"
        >
          <MapControls
            position="top-right"
            showZoom
            showCompass
            showLocate
            showFullscreen
            onLocate={(coords) => {
              onCoordinatesChange({
                latitude: coords.latitude,
                longitude: coords.longitude,
              })
            }}
          />
          <MapClickToPlace
            enabled
            onPlace={(coords) => {
              onCoordinatesChange(coords)
            }}
          />
          {hasPin ? (
            <>
              <MapRecenter latitude={latitude} longitude={longitude} viewToken={viewToken} />
              <MapMarker
                draggable
                longitude={longitude}
                latitude={latitude}
                onDragEnd={(lngLat) => {
                  onCoordinatesChange({
                    latitude: lngLat.lat,
                    longitude: lngLat.lng,
                  })
                }}
              >
                <MarkerContent>
                  <MapPinMarker />
                </MarkerContent>
              </MapMarker>
            </>
          ) : null}
        </Map>
      </div>
      <p className="text-xs text-ink-muted">{t('map.mapHint')}</p>
    </div>
  )
}
