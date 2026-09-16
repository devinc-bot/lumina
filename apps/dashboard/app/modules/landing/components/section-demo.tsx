import { useEffect, useRef } from 'react'
import { Check } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { LANDING_IMAGES } from '../constants/images'
import { LANDING_VIDEOS } from '../constants/videos'
import { LANDING_EYEBROW, LANDING_HEADING, LANDING_ICON, LANDING_MAX } from '../constants/layout'

const DEMO_POINT_KEYS = ['1', '2', '3'] as const

export function SectionDemo() {
  const { t } = useTranslation('dashboardLanding')
  const videoRef = useRef<HTMLVideoElement | null>(null)

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      video.pause()
      return
    }

    const visibilityThreshold = 0.25
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry) return
        if (entry.isIntersecting && entry.intersectionRatio >= visibilityThreshold) {
          void video.play().catch(() => {})
        } else {
          video.pause()
        }
      },
      { threshold: [0, visibilityThreshold, 1] }
    )

    observer.observe(video)

    return () => {
      observer.disconnect()
      video.pause()
    }
  }, [])

  return (
    <section
      id="demo"
      aria-labelledby="demo-heading"
      className="relative z-20 mt-10 scroll-mt-32 sm:mt-14"
    >
      <div className={`${LANDING_MAX} pb-[clamp(4rem,8vw,7rem)]`}>
        <div className="rounded-app-xl bg-surface-container-low/95 p-4 glass-panel backdrop-blur-xl">
          <div className="grid grid-cols-1 items-center gap-8 lg:grid-cols-12 lg:gap-12">
            <div className="flex flex-col gap-5 lg:col-span-4 p-6">
              <span className={LANDING_EYEBROW}>{t('demo.eyebrow')}</span>
              <h2 id="demo-heading" className={LANDING_HEADING}>
                {t('demo.headline')}
              </h2>
              <p className="max-w-[40ch] text-base leading-relaxed text-pretty text-on-surface-variant">
                {t('demo.support')}
              </p>
              <ul className="space-y-6 pt-2">
                {DEMO_POINT_KEYS.map((key) => (
                  <li key={key} className="flex items-start gap-3">
                    <span className="mt-0.5 flex shrink-0 items-center p-3 justify-center rounded-full bg-surface-container-high">
                      <Check
                        className={`${LANDING_ICON} text-primary`}
                        strokeWidth={1.75}
                        aria-hidden
                      />
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-on-surface">
                        {t(`demo.points.${key}.title`)}
                      </p>
                      <p className="font-label text-xs text-on-surface-variant">
                        {t(`demo.points.${key}.body`)}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            <div className="overflow-hidden rounded-app-lg bg-surface-container-lowest p-3 md:p-4 lg:col-span-8">
              <div className="mb-3 flex items-center justify-between rounded-app bg-surface-container-low/40 px-3 py-2.5">
                <div className="flex items-center gap-3">
                  <div className="flex gap-1.5" aria-hidden>
                    <span className="size-2.5 rounded-full bg-surface-container-highest" />
                    <span className="size-2.5 rounded-full bg-surface-container-highest" />
                    <span className="size-2.5 rounded-full bg-surface-container-highest" />
                  </div>
                  <span className="font-label text-xs text-on-surface-variant">
                    {t('demo.windowLabel')}
                  </span>
                </div>
                <span className="rounded-app bg-primary/15 px-2.5 py-0.5 font-label text-xs font-medium text-primary">
                  {t('demo.liveBadge')}
                </span>
              </div>
              <div className="aspect-video overflow-hidden rounded-app bg-surface-container lg:min-h-72 lg:aspect-auto">
                <video
                  ref={videoRef}
                  className="h-full w-full object-cover"
                  src={LANDING_VIDEOS.promo}
                  poster={LANDING_IMAGES.demoPoster.src}
                  muted
                  playsInline
                  loop
                  preload="metadata"
                  aria-label={t('demo.videoLabel')}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
