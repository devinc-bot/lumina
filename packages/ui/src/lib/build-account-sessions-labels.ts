import type { AccountSessionResponse } from '@repo/types'
import type { TFunction } from 'i18next'
import type { AccountSessionsLabels } from '../components/account-sessions.tsx'

type Translate = TFunction<'settings'>

export function buildAccountSessionsLabels(t: Translate, language: string): AccountSessionsLabels {
  return {
    title: t('sessions.title'),
    description: t('sessions.description'),
    loading: t('sessions.loading'),
    loadError: t('sessions.loadError'),
    retry: t('sessions.retry'),
    empty: t('sessions.empty'),
    unknownDevice: t('sessions.unknownDevice'),
    metadataUnavailable: t('sessions.metadataUnavailable'),
    current: t('sessions.current'),
    close: t('sessions.close'),
    revoke: t('sessions.revoke'),
    revoking: t('sessions.revoking'),
    cancel: t('sessions.cancel'),
    confirmTitle: t('sessions.confirmTitle'),
    confirmDescription: t('sessions.confirmDescription'),
    getSessionCountLabel: (count) => t('sessions.count', { count }),
    getCreatedAtLabel: (createdAt) =>
      t('sessions.created', {
        date: createdAt.toLocaleString(language, {
          dateStyle: 'medium',
          timeStyle: 'short',
        }),
      }),
    getExpiresAtLabel: (expiresAt) =>
      t('sessions.expires', {
        date: expiresAt.toLocaleString(language, {
          dateStyle: 'medium',
          timeStyle: 'short',
        }),
      }),
    getStatusLabel: (status: AccountSessionResponse['status']) => t(`sessions.status.${status}`),
  }
}
