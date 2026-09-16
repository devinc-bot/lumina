import { Music2, PartyPopper, QrCode, Wine } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { LANDING_AUDIENCE_KEYS } from '../constants/landing-content'
import { LANDING_IMAGES } from '../constants/images'
import { LANDING_EYEBROW, LANDING_HEADING, LANDING_ICON, LANDING_MAX } from '../constants/layout'

const AUDIENCE_ICONS = {
  '1': PartyPopper,
  '2': Music2,
  '3': Wine,
} as const

export function SectionAudiences() {
  const { t } = useTranslation('dashboardLanding')

  return (
    <section id="audiences" aria-labelledby="audiences-heading" className="scroll-mt-32">
      <div className={`${LANDING_MAX} space-y-12 py-[clamp(4rem,8vw,6.5rem)]`}>
        <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-12">
          <div className="space-y-4 lg:col-span-6">
            <span className={LANDING_EYEBROW}>{t('audiences.eyebrow')}</span>
            <h2 id="audiences-heading" className={LANDING_HEADING}>
              {t('audiences.headline')}
            </h2>
            <p className="max-w-[48ch] text-lg leading-relaxed text-pretty text-on-surface-variant">
              {t('audiences.support')}
            </p>
          </div>

          <div className="relative h-80 overflow-hidden rounded-app-xl shadow-glass md:h-104 lg:col-span-6">
            <img
              src={LANDING_IMAGES.audiences.src}
              srcSet={LANDING_IMAGES.audiences.srcSet}
              sizes="(min-width: 1024px) 50vw, 100vw"
              width={1400}
              height={1050}
              alt={t('audiences.imageAlt')}
              loading="lazy"
              decoding="async"
              className="h-full w-full object-cover"
            />
            <div
              className="pointer-events-none absolute inset-0 bg-linear-to-t from-surface-dim via-transparent to-transparent"
              aria-hidden
            />
            <div className="absolute inset-x-6 bottom-6 flex items-center justify-between rounded-app-lg border border-hairline/40 bg-surface-container/90 p-4 backdrop-blur-md">
              <div>
                <span className="font-label text-xs text-on-surface-variant uppercase">
                  {t('audiences.frame.label')}
                </span>
                <p className="text-base font-bold text-on-surface">{t('audiences.frame.title')}</p>
              </div>
              <span className="flex size-11 items-center justify-center rounded-app bg-surface-container-high text-primary">
                <QrCode className={LANDING_ICON} aria-hidden />
              </span>
            </div>
          </div>
        </div>

        <ul className="grid list-none gap-6 p-0 md:grid-cols-3">
          {LANDING_AUDIENCE_KEYS.map((key) => {
            const Icon = AUDIENCE_ICONS[key]
            return (
              <li key={key} className="space-y-4 rounded-app-xl bg-surface-container-low p-8">
                <div className="flex size-11 items-center justify-center rounded-app-lg bg-surface-container-high text-primary">
                  <Icon className={LANDING_ICON} strokeWidth={1.75} aria-hidden />
                </div>
                <h3 className="font-display text-lg font-bold tracking-tight text-on-surface">
                  {t(`audiences.items.${key}.title`)}
                </h3>
                <p className="text-sm leading-relaxed text-pretty text-on-surface-variant">
                  {t(`audiences.items.${key}.body`)}
                </p>
              </li>
            )
          })}
        </ul>
      </div>
    </section>
  )
}
