import { useTranslation } from 'react-i18next'
import { Badge } from '@repo/ui'
import { LANDING_FEATURES } from '../constants/landing-content'
import { LANDING_EYEBROW, LANDING_HEADING, LANDING_MAX } from '../constants/layout'

const FEATURE_TAGS = {
  events: ['1', '2', '3'],
  tickets: ['1', '2', '3'],
  staff: ['1', '2'],
  sales: ['1', '2'],
} as const

export function SectionFeatures() {
  const { t } = useTranslation('dashboardLanding')

  return (
    <section id="features" aria-labelledby="features-heading" className="scroll-mt-32">
      <div
        className={`${LANDING_MAX} grid grid-cols-1 items-start gap-12 py-[clamp(4rem,8vw,6.5rem)] lg:grid-cols-12`}
      >
        <div className="space-y-4 lg:sticky lg:top-28 lg:col-span-5">
          <span className={LANDING_EYEBROW}>{t('features.eyebrow')}</span>
          <h2 id="features-heading" className={LANDING_HEADING}>
            {t('features.headline')}
          </h2>
          <p className="max-w-[48ch] text-lg leading-relaxed text-pretty text-on-surface-variant">
            {t('features.support')}
          </p>
          <div className="rounded-app-lg bg-surface-container-low p-6">
            <span className="font-label text-xs font-semibold tracking-wide text-secondary uppercase">
              {t('features.highlight.label')}
            </span>
            <p className="mt-2 text-sm leading-relaxed text-pretty text-on-surface">
              {t('features.highlight.body')}
            </p>
          </div>
        </div>

        <ul className="flex list-none flex-col gap-6 p-0 lg:col-span-7">
          {LANDING_FEATURES.map(({ key }, index) => {
            const tags = FEATURE_TAGS[key]
            return (
              <li
                key={key}
                className="group rounded-app-xl bg-surface-container-low p-6 transition-colors duration-(--duration-fast) ease-emphasized hover:bg-surface-container hover:glass-panel md:p-8"
              >
                <div className="mb-4 flex items-baseline justify-between gap-3">
                  <span className="font-display text-2xl font-bold text-primary">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <span className="rounded-full bg-surface-container px-3 py-1 font-label text-xs text-on-surface-variant transition-colors group-hover:text-on-surface">
                    {t(`features.items.${key}.badge`)}
                  </span>
                </div>
                <h3 className="font-display text-xl font-bold tracking-tight text-on-surface md:text-2xl">
                  {t(`features.items.${key}.title`)}
                </h3>
                <p className="mt-2 max-w-[48ch] text-base leading-relaxed text-pretty text-on-surface-variant">
                  {t(`features.items.${key}.body`)}
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {tags.map((tagKey) => (
                    <Badge key={tagKey} variant="secondary" size="sm">
                      {t(`features.items.${key}.tags.${tagKey}` as 'features.items.events.tags.1')}
                    </Badge>
                  ))}
                </div>
              </li>
            )
          })}
        </ul>
      </div>
    </section>
  )
}
