import { useTranslation } from 'react-i18next'
import { handleSectionNavClick } from '@repo/common'
import { LandingLogo } from '@repo/ui'
import { LANDING_MAX } from '../constants/layout'

const FOOTER_LINKS = [
  { labelKey: 'footer.features', hash: '#features' },
  { labelKey: 'footer.how', hash: '#how' },
  { labelKey: 'footer.audiences', hash: '#audiences' },
  { labelKey: 'footer.faq', hash: '#faq' },
] as const

const FOOTER_LINK =
  'inline-flex min-h-10 items-center text-sm text-on-surface-variant transition-colors duration-(--duration-fast) ease-emphasized hover:text-on-surface focus-visible:outline-none focus-visible:rounded-sm focus-visible:ring-2 focus-visible:ring-primary/25'

export function LandingFooter() {
  const { t } = useTranslation('dashboardLanding')
  const year = new Date().getFullYear()

  return (
    <footer className="w-full bg-surface-container-lowest pt-10 pb-14">
      <div className={LANDING_MAX}>
        <div className="flex flex-col items-start justify-between gap-10 pb-10 md:flex-row">
          <div className="max-w-sm">
            <div className="mb-3 inline-flex items-center gap-1.5">
              <LandingLogo alt={t('header.brand')} />
            </div>
            <p className="text-sm leading-relaxed text-on-surface-variant">{t('footer.tagline')}</p>
          </div>

          <nav aria-label={t('footer.navAria')}>
            <span className="mb-3 block font-label text-xs tracking-wider text-on-surface-variant uppercase">
              {t('footer.explore')}
            </span>
            <ul className="flex flex-col gap-1">
              {FOOTER_LINKS.map((link) => (
                <li key={link.labelKey}>
                  <a
                    href={link.hash}
                    onClick={(event) => handleSectionNavClick(event, link.hash)}
                    className={FOOTER_LINK}
                  >
                    {t(link.labelKey)}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        <div className="flex flex-col items-start justify-between gap-4 border-t border-hairline/40 pt-6 font-label text-xs text-on-surface-variant sm:flex-row sm:items-center">
          <p>{t('footer.rights', { year })}</p>
        </div>
      </div>
    </footer>
  )
}
