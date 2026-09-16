import { Network, LineChart, Shield } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { LANDING_VALUE_KEYS } from '../constants/landing-content'
import { LANDING_IMAGES } from '../constants/images'
import { LANDING_EYEBROW, LANDING_HEADING, LANDING_ICON, LANDING_MAX } from '../constants/layout'

const VALUE_ICONS = {
  '1': Network,
  '2': LineChart,
  '3': Shield,
} as const

export function SectionValue() {
  const { t } = useTranslation('dashboardLanding')

  return (
    <section id="value" aria-labelledby="value-heading" className="scroll-mt-32">
      <div className={`${LANDING_MAX} py-[clamp(4rem,8vw,6.5rem)]`}>
        <div className="overflow-hidden rounded-app-xl bg-surface-container-lowest p-8 md:p-14">
          <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-12">
            <div className="relative lg:col-span-6">
              <div className="relative h-[27.5rem] overflow-hidden rounded-app-xl shadow-glass">
                <img
                  src={LANDING_IMAGES.value.src}
                  srcSet={LANDING_IMAGES.value.srcSet}
                  sizes="(min-width: 1024px) 50vw, 100vw"
                  width={1400}
                  height={1050}
                  alt={t('value.imageAlt')}
                  loading="lazy"
                  decoding="async"
                  className="h-full w-full object-cover"
                />
                <div
                  className="pointer-events-none absolute inset-0 bg-linear-to-tr from-surface-dim/90 via-transparent to-surface-dim/40"
                  aria-hidden
                />
              </div>
              <aside className="relative z-10 mx-auto mt-[-1.5rem] max-w-xs space-y-3 rounded-app-lg bg-surface-container/95 p-6 shadow-glass backdrop-blur-xl md:absolute md:right-6 md:bottom-[-1.5rem] md:mx-0 md:mt-0">
                <div className="flex items-center gap-2">
                  <span className="size-2.5 rounded-full bg-primary" aria-hidden />
                  <span className="font-label text-xs font-semibold text-on-surface uppercase">
                    {t('value.aside.label')}
                  </span>
                </div>
                <p className="text-sm leading-relaxed text-on-surface-variant">
                  {t('value.aside.body')}
                </p>
              </aside>
            </div>

            <div className="space-y-8 lg:col-span-6">
              <div>
                <span className={`${LANDING_EYEBROW} mb-2 block`}>{t('value.eyebrow')}</span>
                <h2 id="value-heading" className={LANDING_HEADING}>
                  {t('value.headline')}
                </h2>
                <p className="mt-4 max-w-[48ch] text-lg leading-relaxed text-pretty text-on-surface-variant">
                  {t('value.support')}
                </p>
              </div>

              <ul className="space-y-6">
                {LANDING_VALUE_KEYS.map((key) => {
                  const Icon = VALUE_ICONS[key]
                  return (
                    <li key={key} className="flex gap-4">
                      <div className="mt-0.5 flex size-11 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
                        <Icon className={LANDING_ICON} strokeWidth={1.75} aria-hidden />
                      </div>
                      <div>
                        <h3 className="font-display text-lg font-bold tracking-tight text-on-surface">
                          {t(`value.items.${key}.title`)}
                        </h3>
                        <p className="mt-1 text-sm leading-relaxed text-pretty text-on-surface-variant">
                          {t(`value.items.${key}.body`)}
                        </p>
                      </div>
                    </li>
                  )
                })}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
