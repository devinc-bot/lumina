import { Link as RouterLink } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { Badge, Button, Link, NotImage, Skeleton, armEventHero, cn } from '@repo/ui'
import type { PublicEventResponse } from '@repo/types'
import { Container } from '~/modules/common/components/container'
import { WEB_ROUTES } from '~/modules/common/constants/routes'
import { usePublicEventsInfiniteQuery } from '~/modules/events/queries/use-public-events-infinite-query'
import { EMPTY_EVENTS_DISCOVER_FILTERS } from '~/modules/events/utils/events-discover-filters'
import { formatEventPlace, formatEventWhen } from '~/modules/events/utils/events-discover-format'
import {
  LANDING_CTA_OUTLINE_PRIMARY,
  LANDING_FOCUS_RING,
  LANDING_FOCUS_RING_ON_MEDIA,
  LANDING_HEADING,
  LANDING_SECTION_Y,
} from '../../constants/layout'

export const LANDING_EVENTS_PREVIEW_LIMIT = 3

/** Asymmetric bento: featured tile + stacked companions from `lg`. */
const BENTO_GRID =
  'grid list-none gap-4 p-0 sm:gap-5 lg:grid-cols-12 lg:grid-rows-2 lg:min-h-[32rem]'

/** Frosted white chip on dark event media overlays. */
const EVENT_MEDIA_META_BADGE =
  'truncate rounded-full border-transparent px-3.5 font-medium text-black bg-white/60 backdrop-blur-md supports-backdrop-filter:bg-white/60 motion-reduce:backdrop-blur-none motion-reduce:bg-white'

type PreviewVariant = 'featured' | 'compact'

type SectionEventsProps = {
  showAuthCtas?: boolean
  className?: string
}

function bentoCellClass(index: number, count: number): string {
  if (count === 1) {
    return 'lg:col-span-12 lg:row-span-2'
  }
  if (count === 2) {
    return index === 0 ? 'lg:col-span-7 lg:row-span-2' : 'lg:col-span-5 lg:row-span-2'
  }
  return index === 0 ? 'lg:col-span-7 lg:row-span-2' : 'lg:col-span-5 lg:row-span-1'
}

function previewVariant(index: number, count: number): PreviewVariant {
  if (count <= 2) return 'featured'
  return index === 0 ? 'featured' : 'compact'
}

export function SectionEvents({ showAuthCtas = true, className }: SectionEventsProps) {
  const { t, i18n } = useTranslation('landing')
  const { data, isPending, isError, refetch } = usePublicEventsInfiniteQuery(
    EMPTY_EVENTS_DISCOVER_FILTERS
  )

  const events =
    data?.pages.flatMap((page) => page.data).slice(0, LANDING_EVENTS_PREVIEW_LIMIT) ?? []

  const isEmpty = !isPending && !isError && events.length === 0
  const isLive = !isPending && !isError && events.length > 0
  const showLiveHeading = isPending || isLive || isError

  return (
    <section
      id="eventos"
      aria-labelledby="events-heading"
      className={cn('scroll-mt-32 border-t border-outline-variant/30', className)}
    >
      <Container className={LANDING_SECTION_Y}>
        <div className="max-w-2xl space-y-3">
          <span className="inline-flex items-center rounded-full border border-primary/25 bg-primary/10 px-3 py-1 font-label text-xs font-semibold tracking-wider text-primary uppercase">
            {showLiveHeading ? t('events.badgeLive') : t('events.badge')}
          </span>
          <h2 id="events-heading" className={cn(LANDING_HEADING, 'text-on-surface')}>
            {showLiveHeading ? t('events.headlineLive') : t('events.headline')}
          </h2>
          <p className="max-w-[46ch] text-base leading-relaxed text-pretty text-on-surface-variant sm:text-lg">
            {showLiveHeading ? t('events.supportLive') : t('events.support')}
          </p>
        </div>

        <div className="mt-10">
          {isPending ? <EventsPreviewSkeleton loadingLabel={t('events.loading')} /> : null}

          {isError ? (
            <div
              className="flex flex-col gap-4 rounded-app-lg border border-outline-variant/30 bg-surface-container p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6"
              role="alert"
            >
              <p className="text-sm leading-relaxed text-pretty text-on-surface-variant sm:text-base">
                {t('events.error')}
              </p>
              <div className="flex shrink-0 flex-wrap gap-3">
                <Button
                  type="button"
                  variant="outline"
                  size="lg"
                  className={cn(LANDING_CTA_OUTLINE_PRIMARY, LANDING_FOCUS_RING)}
                  onClick={() => void refetch()}
                >
                  {t('events.retry')}
                </Button>
                <Link
                  to={WEB_ROUTES.events()}
                  size="lg"
                  className={cn(LANDING_CTA_OUTLINE_PRIMARY, LANDING_FOCUS_RING)}
                >
                  {t('events.viewAll')}
                </Link>
              </div>
            </div>
          ) : null}

          {isEmpty ? (
            <div
              className={cn(
                'rounded-app-lg border border-outline-variant/30 bg-surface-container p-5 sm:p-6',
                showAuthCtas
                  ? 'flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between sm:gap-4'
                  : null
              )}
            >
              <div className="min-w-0 space-y-1.5">
                <p className="font-display text-base font-semibold tracking-tight text-on-surface">
                  {t('events.notify.title')}
                </p>
                <p className="text-sm leading-relaxed text-pretty text-on-surface-variant">
                  {t('events.notify.body')}
                </p>
              </div>
              {showAuthCtas ? (
                <Link
                  to={WEB_ROUTES.register()}
                  size="lg"
                  className={cn('shrink-0 px-6', LANDING_CTA_OUTLINE_PRIMARY, LANDING_FOCUS_RING)}
                >
                  {t('events.notify.cta')}
                </Link>
              ) : null}
            </div>
          ) : null}

          {isLive ? (
            <>
              <ul aria-label={t('events.listAria')} className={BENTO_GRID}>
                {events.map((event, index) => (
                  <li
                    key={event.documentId}
                    className={cn(
                      'min-w-0 p-4 hover:bg-card rounded-app-xl transition-all duration-300 hover:shadow-glass',
                      bentoCellClass(index, events.length)
                    )}
                  >
                    <EventPreviewCard
                      event={event}
                      language={i18n.language}
                      variant={previewVariant(index, events.length)}
                    />
                  </li>
                ))}
              </ul>

              <div className="mt-8 flex justify-start sm:justify-end">
                <Link
                  to={WEB_ROUTES.events()}
                  size="lg"
                  variant="link"
                  // className={cn(LANDING_CTA_OUTLINE_PRIMARY, LANDING_FOCUS_RING)}
                  className="hover:text-primary"
                >
                  {t('events.viewAll')}
                </Link>
              </div>
            </>
          ) : null}
        </div>
      </Container>
    </section>
  )
}

function EventPreviewCard({
  event,
  language,
  variant,
}: {
  event: PublicEventResponse
  language: string
  variant: PreviewVariant
}) {
  const { t } = useTranslation('landing')
  const image = event.images[0]
  const when = formatEventWhen(event.startsAt, language)
  const placePill =
    event.city?.trim() || event.locationName?.trim() || formatEventPlace(event).trim()
  const description = event.description?.trim()
  const featured = variant === 'featured'

  const detailLink = {
    to: '/events/$slug' as const,
    params: { slug: event.slug },
    onClick: armEventHero,
  }

  return (
    <RouterLink
      {...detailLink}
      aria-label={t('events.viewEventAria', { name: event.name })}
      className={cn(
        'group relative flex h-full flex-col justify-end overflow-hidden rounded-app-lg border-white/25 bg-surface-container text-left no-underline',
        featured ? 'min-h-72 sm:min-h-80 lg:min-h-0' : 'min-h-48 lg:min-h-0',
        'transition-[border-color] duration-(--duration-fast) ease-emphasized',
        'hover:border-white/45',
        'motion-reduce:transition-none',
        LANDING_FOCUS_RING_ON_MEDIA
      )}
    >
      <div className="absolute inset-0">
        {image ? (
          <img
            src={image.url}
            alt=""
            className="h-full w-full object-cover motion-safe:transition-transform motion-safe:duration-800 motion-safe:ease-emphasized motion-safe:group-hover:scale-[1.04] motion-reduce:transform-none"
            loading="lazy"
            decoding="async"
          />
        ) : (
          <NotImage
            size="full"
            label={t('events.noImage')}
            className="h-full min-h-0 w-full rounded-none border-0"
          />
        )}
      </div>

      <div
        className="pointer-events-none absolute inset-0 bg-linear-to-t from-black/75 via-black/35 to-transparent"
        aria-hidden
      />

      <div
        className={cn(
          'relative z-10 flex flex-col',
          featured ? 'gap-3 p-6 sm:gap-3.5 sm:p-8' : 'gap-2 p-4 sm:p-5'
        )}
      >
        <span
          className={cn(
            'line-clamp-2 font-display font-bold tracking-tight text-balance text-white',
            featured ? 'text-2xl leading-tight sm:text-3xl' : 'text-lg leading-snug sm:text-xl'
          )}
        >
          {event.name}
        </span>

        {description ? (
          <p
            className={cn(
              'line-clamp-2 text-pretty text-white/80',
              featured ? 'max-w-[40ch] text-sm sm:text-base' : 'text-sm'
            )}
          >
            {description}
          </p>
        ) : null}

        {when || placePill ? (
          <div className="flex flex-wrap gap-2">
            {when ? (
              <Badge size="sm" className={cn(EVENT_MEDIA_META_BADGE, 'max-w-full')}>
                {when}
              </Badge>
            ) : null}
            {placePill ? (
              <Badge size="sm" className={cn(EVENT_MEDIA_META_BADGE, 'max-w-56')}>
                {placePill}
              </Badge>
            ) : null}
          </div>
        ) : null}
      </div>
    </RouterLink>
  )
}

function EventsPreviewSkeleton({ loadingLabel }: { loadingLabel: string }) {
  return (
    <div className={BENTO_GRID} aria-busy="true" aria-live="polite">
      <p className="sr-only">{loadingLabel}</p>
      {Array.from({ length: LANDING_EVENTS_PREVIEW_LIMIT }, (_, index) => {
        const featured = index === 0
        return (
          <div
            key={index}
            className={cn(
              'relative overflow-hidden rounded-app-xl border-2 border-white/15 bg-surface-container-low',
              bentoCellClass(index, LANDING_EVENTS_PREVIEW_LIMIT),
              featured ? 'min-h-72 sm:min-h-80 lg:min-h-0' : 'min-h-48 lg:min-h-0'
            )}
          >
            <Skeleton className="absolute inset-0 rounded-none bg-surface-container-high/80" />
            <div
              className={cn(
                'absolute inset-0 bg-linear-to-t from-black/50 to-transparent',
                'pointer-events-none'
              )}
              aria-hidden
            />
            <div
              className={cn(
                'relative z-10 flex h-full flex-col justify-end',
                featured ? 'gap-3 p-6 sm:p-8' : 'gap-2 p-4 sm:p-5'
              )}
            >
              <div className="flex gap-2">
                <Skeleton className="h-7 w-24 rounded-full bg-white/30" />
                <Skeleton className="h-7 w-20 rounded-full bg-white/25" />
              </div>
              <Skeleton
                className={cn('rounded-app-sm bg-white/35', featured ? 'h-8 w-4/5' : 'h-6 w-3/4')}
              />
              <Skeleton className="h-4 w-2/3 rounded-app-sm bg-white/20" />
            </div>
          </div>
        )
      })}
    </div>
  )
}
