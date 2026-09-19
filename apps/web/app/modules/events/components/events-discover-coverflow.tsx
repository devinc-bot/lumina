import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Autoplay,
  Carousel,
  CarouselContent,
  CarouselItem,
  Skeleton,
  VT,
  armEventHero,
  cn,
  type CarouselApi,
} from '@repo/ui'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import type { EventsDiscoverCoverflowSlide } from '../utils/events-discover-coverflow'

const TWEEN_FACTOR_BASE = 0.2
const AUTOPLAY_DELAY_MS = 4500

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const sync = () => setReduced(mq.matches)
    sync()
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  }, [])

  return reduced
}

type EventsDiscoverCoverflowProps = {
  slides: EventsDiscoverCoverflowSlide[]
  onActivate: (slug: string) => void
  isLoading?: boolean
  className?: string
}

export function EventsDiscoverCoverflow({
  slides,
  onActivate,
  isLoading = false,
  className,
}: EventsDiscoverCoverflowProps) {
  const { t } = useTranslation('events')
  const reduceMotion = usePrefersReducedMotion()
  const [api, setApi] = useState<CarouselApi>()
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [loadedIndexes, setLoadedIndexes] = useState<ReadonlySet<number>>(() => new Set([0]))
  const tweenFactor = useRef(0)
  const tweenNodes = useRef<Array<HTMLElement | null>>([])
  const autoplay = useRef(
    Autoplay({
      delay: AUTOPLAY_DELAY_MS,
      stopOnInteraction: false,
      stopOnMouseEnter: true,
      playOnInit: false,
    })
  )

  const updateSlidesInView = useCallback((carouselApi: CarouselApi) => {
    if (!carouselApi) return

    const slideCount = carouselApi.slideNodes().length
    const selected = carouselApi.selectedScrollSnap()
    const nextToLoad = new Set(carouselApi.slidesInView())
    nextToLoad.add(selected)
    if (slideCount > 1) {
      nextToLoad.add((selected + 1) % slideCount)
    }

    setLoadedIndexes((prev) => {
      let changed = false
      const next = new Set(prev)
      for (const index of nextToLoad) {
        if (!next.has(index)) {
          next.add(index)
          changed = true
        }
      }
      return changed ? next : prev
    })
  }, [])

  const clearParallax = useCallback(() => {
    tweenNodes.current.forEach((node) => {
      if (node) {
        node.style.transform = ''
      }
    })
  }, [])

  const setTweenNodes = useCallback((carouselApi: CarouselApi) => {
    if (!carouselApi) return
    tweenNodes.current = carouselApi.slideNodes().map((slideNode) => {
      return slideNode.querySelector<HTMLElement>('[data-parallax-layer]')
    })
  }, [])

  const setTweenFactor = useCallback(
    (carouselApi: CarouselApi) => {
      if (!carouselApi) return
      tweenFactor.current = reduceMotion
        ? 0
        : TWEEN_FACTOR_BASE * carouselApi.scrollSnapList().length
    },
    [reduceMotion]
  )

  const tweenParallax = useCallback(
    (carouselApi: CarouselApi, eventName?: string) => {
      if (!carouselApi) return

      if (reduceMotion || tweenFactor.current === 0) {
        clearParallax()
        return
      }

      const engine = carouselApi.internalEngine()
      const scrollProgress = carouselApi.scrollProgress()
      const slidesInView = carouselApi.slidesInView()
      const isScrollEvent = eventName === 'scroll'

      carouselApi.scrollSnapList().forEach((scrollSnap, snapIndex) => {
        let diffToTarget = scrollSnap - scrollProgress
        const slidesInSnap = engine.slideRegistry[snapIndex]

        slidesInSnap.forEach((slideIndex) => {
          if (isScrollEvent && !slidesInView.includes(slideIndex)) {
            return
          }

          if (engine.options.loop) {
            engine.slideLooper.loopPoints.forEach((loopItem) => {
              const target = loopItem.target()
              if (slideIndex === loopItem.index && target !== 0) {
                const sign = Math.sign(target)
                if (sign === -1) {
                  diffToTarget = scrollSnap - (1 + scrollProgress)
                }
                if (sign === 1) {
                  diffToTarget = scrollSnap + (1 - scrollProgress)
                }
              }
            })
          }

          const translate = diffToTarget * (-1 * tweenFactor.current) * 100
          const tweenNode = tweenNodes.current[slideIndex]
          if (tweenNode) {
            tweenNode.style.transform = `translateX(${translate}%)`
          }
        })
      })
    },
    [clearParallax, reduceMotion]
  )

  useEffect(() => {
    if (!api) return

    const onSelect = () => {
      setSelectedIndex(api.selectedScrollSnap())
      updateSlidesInView(api)
    }

    setTweenNodes(api)
    setTweenFactor(api)
    tweenParallax(api)
    updateSlidesInView(api)
    onSelect()

    api
      .on('reInit', setTweenNodes)
      .on('reInit', setTweenFactor)
      .on('reInit', tweenParallax)
      .on('reInit', updateSlidesInView)
      .on('reInit', onSelect)
      .on('scroll', tweenParallax)
      .on('slideFocus', tweenParallax)
      .on('slidesInView', updateSlidesInView)
      .on('select', onSelect)

    return () => {
      api
        .off('reInit', setTweenNodes)
        .off('reInit', setTweenFactor)
        .off('reInit', tweenParallax)
        .off('reInit', updateSlidesInView)
        .off('reInit', onSelect)
        .off('scroll', tweenParallax)
        .off('slideFocus', tweenParallax)
        .off('slidesInView', updateSlidesInView)
        .off('select', onSelect)
    }
  }, [api, setTweenFactor, setTweenNodes, tweenParallax, updateSlidesInView])

  useEffect(() => {
    if (!api || slides.length < 2) return

    if (reduceMotion) {
      autoplay.current.stop()
      return
    }

    void autoplay.current.play()
  }, [api, reduceMotion, slides.length])

  if (isLoading) {
    return (
      <section
        className={cn('flex flex-col gap-3', className)}
        aria-labelledby="events-featured-heading"
        aria-busy="true"
      >
        <div className="flex items-baseline justify-between gap-3 px-0.5">
          <h2
            id="events-featured-heading"
            className="font-display text-lg font-semibold tracking-tight text-balance text-on-surface sm:text-xl"
          >
            {t('discover.coverflow.heading')}
          </h2>
          <Skeleton className="h-4 w-40 max-w-[28ch] bg-surface-high/50" aria-hidden />
        </div>
        <p className="sr-only" role="status">
          {t('discover.coverflow.loading')}
        </p>
        <Skeleton className="aspect-19/9 w-full rounded-app-lg bg-surface-high/80" aria-hidden />
        {/* Reserve control-strip height to limit CLS when 2+ slides mount after load. */}
        <div className="flex flex-col items-center gap-3 p-4 text-center sm:p-5" aria-hidden>
          <Skeleton className="h-14 w-48 max-w-full rounded-full bg-surface-high/60" />
        </div>
      </section>
    )
  }

  if (slides.length === 0) {
    return null
  }

  const showControls = slides.length > 1

  return (
    <section
      className={cn('flex flex-col gap-3', className)}
      aria-labelledby="events-featured-heading"
    >
      <div className="flex items-baseline justify-between gap-3 px-0.5">
        <h2
          id="events-featured-heading"
          className="font-display text-lg font-semibold tracking-tight text-balance text-on-surface sm:text-xl"
        >
          {t('discover.coverflow.heading')}
        </h2>
        <p className="max-w-[28ch] text-right text-sm text-pretty text-on-surface-variant">
          {t('discover.coverflow.hint')}
        </p>
      </div>

      <Carousel
        setApi={setApi}
        opts={{
          align: showControls ? 'center' : 'start',
          loop: showControls,
        }}
        plugins={showControls ? [autoplay.current] : undefined}
        className="relative w-full"
        aria-label={t('discover.coverflow.ariaLabel')}
      >
        <CarouselContent className={showControls ? '-ml-3' : 'ml-0'}>
          {slides.map((slide, index) => {
            const isLoaded = loadedIndexes.has(index)
            const metaParts = [slide.when, slide.place].filter(Boolean)
            const activateLabel = metaParts.length
              ? t('discover.coverflow.activateAria', {
                  title: slide.title,
                  meta: metaParts.join(' · '),
                })
              : slide.title

            return (
              <CarouselItem
                key={slide.slug}
                className={showControls ? 'basis-[86%] pl-3 sm:basis-[88%]' : 'basis-full pl-0'}
              >
                <button
                  type="button"
                  className="relative aspect-19/9 w-full cursor-pointer overflow-hidden rounded-app-lg border-0 bg-transparent p-0"
                  onClick={(clickEvent) => {
                    armEventHero(clickEvent)
                    onActivate(slide.slug)
                  }}
                  aria-label={activateLabel}
                >
                  <div
                    data-vt-source={VT.eventHero}
                    data-parallax-layer
                    className="relative flex h-full w-full items-center justify-center will-change-transform"
                  >
                    {isLoaded ? (
                      <img
                        src={slide.src}
                        alt=""
                        className={cn(
                          'h-full object-cover hover:scale-105 transition-transform duration-1000 ease-in-out',
                          reduceMotion ? 'w-full' : 'max-w-none flex-[0_0_115%]'
                        )}
                        draggable={false}
                        loading={index === 0 ? 'eager' : 'lazy'}
                        fetchPriority={index === 0 ? 'high' : undefined}
                      />
                    ) : (
                      <div className="h-full w-full bg-surface-strong" aria-hidden />
                    )}
                    <div
                      className="pointer-events-none absolute inset-0 rounded-app-lg bg-linear-to-t from-black/75 via-black/20 to-transparent"
                      aria-hidden
                    />
                  </div>
                  <span className="pointer-events-none absolute bottom-3 left-3 right-3 flex w-fit max-w-[min(100%-1.5rem,42rem)] flex-col gap-1 rounded-app bg-black/55 px-4 py-3 text-left shadow-(--shadow-glass) backdrop-blur-md supports-backdrop-filter:bg-black/40 sm:bottom-6 sm:left-6 sm:px-5 sm:py-3.5">
                    <span className="font-display text-lg font-semibold text-balance text-white sm:text-2xl">
                      {slide.title}
                    </span>
                    {metaParts.length > 0 ? (
                      <span className="text-sm text-pretty text-white/80 sm:text-base">
                        {metaParts.join(' · ')}
                      </span>
                    ) : null}
                  </span>
                </button>
              </CarouselItem>
            )
          })}
        </CarouselContent>

        {showControls ? (
          <div className="flex flex-col items-center gap-3 p-4 text-center sm:p-5">
            <div className="relative flex w-full items-center justify-center gap-1 rounded-full bg-surface-strong p-2 sm:w-auto">
              <button
                type="button"
                onClick={() => api?.scrollPrev()}
                aria-label={t('discover.coverflow.prev')}
                className="inline-flex size-10 cursor-pointer items-center justify-center rounded-full border-0 bg-transparent text-on-surface transition-colors hover:bg-on-surface/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink"
              >
                <ChevronLeft className="size-7" aria-hidden />
              </button>

              <div
                className="flex items-center gap-1.5 px-1"
                role="tablist"
                aria-label={t('discover.coverflow.dotsAria')}
              >
                {slides.map((slide, i) => (
                  <button
                    key={slide.slug}
                    type="button"
                    role="tab"
                    onClick={() => api?.scrollTo(i)}
                    aria-label={t('discover.coverflow.dotAria', {
                      index: i + 1,
                      total: slides.length,
                      title: slide.title,
                    })}
                    aria-selected={selectedIndex === i}
                    className={cn(
                      'h-1.5 cursor-pointer rounded-full border-0 transition-all duration-300',
                      selectedIndex === i
                        ? 'w-5 bg-on-surface'
                        : 'w-1.5 bg-on-surface/30 hover:bg-on-surface/50'
                    )}
                  />
                ))}
              </div>

              <button
                type="button"
                onClick={() => api?.scrollNext()}
                aria-label={t('discover.coverflow.next')}
                className="inline-flex size-10 cursor-pointer items-center justify-center rounded-full border-0 bg-transparent text-on-surface transition-colors hover:bg-on-surface/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink"
              >
                <ChevronRight className="size-7" aria-hidden />
              </button>
            </div>
          </div>
        ) : null}
      </Carousel>
    </section>
  )
}
