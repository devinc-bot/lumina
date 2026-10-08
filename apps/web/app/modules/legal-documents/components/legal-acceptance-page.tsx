import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import {
  LEGAL_DOCUMENT_TYPE,
  type LegalDocumentType,
  type PublicLegalDocumentResponse,
} from '@repo/types'
import { Button } from '@repo/ui'
import { QUERY_KEYS } from '../../common/constants/query-keys'
import { WEB_ROUTES } from '../../common/constants/routes'
import { LegalAcceptanceField, PublishedLegalDocumentDialog } from './legal-acceptance-fields'
import {
  acceptLegalDocuments,
  getPendingLegalAcceptance,
  getPublishedLegalDocumentByType,
} from '../services/legal-documents.service'

const WEB_REACCEPTANCE_FIELDS = [
  {
    type: LEGAL_DOCUMENT_TYPE.TERMS_WEB,
    id: 'legal-acceptance-terms',
    labelKey: 'register.legal.terms',
    openKey: 'register.legal.termsOpen',
  },
  {
    type: LEGAL_DOCUMENT_TYPE.PRIVACY_WEB,
    id: 'legal-acceptance-privacy',
    labelKey: 'register.legal.privacy',
    openKey: 'register.legal.privacyOpen',
  },
] as const

const LEGAL_NOTICE_ID = 'legal-acceptance-notice'

export function LegalAcceptancePage() {
  const { t } = useTranslation('auth')
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [acceptedByType, setAcceptedByType] = useState<Partial<Record<LegalDocumentType, boolean>>>(
    {}
  )
  const [showRequired, setShowRequired] = useState(false)
  const [openDocument, setOpenDocument] = useState<PublicLegalDocumentResponse | null>(null)

  const pendingQuery = useQuery({
    queryKey: QUERY_KEYS.pendingLegalAcceptance,
    queryFn: getPendingLegalAcceptance,
  })

  const staleTypes = pendingQuery.data?.staleTypes ?? []
  const fields = WEB_REACCEPTANCE_FIELDS.filter((field) => staleTypes.includes(field.type))

  const publishedQueries = useQuery({
    queryKey: [...QUERY_KEYS.pendingLegalAcceptance, 'published', staleTypes],
    enabled: staleTypes.length > 0,
    queryFn: async () => {
      const entries = await Promise.all(
        staleTypes.map(async (type) => {
          const document = await getPublishedLegalDocumentByType(type)
          return [type, document] as const
        })
      )
      return Object.fromEntries(entries) as Partial<
        Record<LegalDocumentType, PublicLegalDocumentResponse>
      >
    },
    retry: false,
  })

  const acceptMutation = useMutation({
    mutationFn: (types: LegalDocumentType[]) => acceptLegalDocuments(types),
    onSuccess: async (result) => {
      await queryClient.invalidateQueries({ queryKey: QUERY_KEYS.pendingLegalAcceptance })
      if (result.staleTypes.length === 0) {
        await navigate({ to: WEB_ROUTES.events(), replace: true })
      }
    },
  })

  const allChecked = fields.every((field) => acceptedByType[field.type] === true)
  const publishedReady = publishedQueries.isSuccess
  const legalUnavailable = fields.length > 0 && publishedQueries.isError

  const notice = useMemo(() => {
    if (legalUnavailable) return 'unavailable' as const
    if (showRequired && !allChecked) return 'required' as const
    return null
  }, [allChecked, legalUnavailable, showRequired])

  return (
    <form
      noValidate
      className="mx-auto w-full max-w-lg py-10"
      onSubmit={(event) => {
        event.preventDefault()
        if (!publishedReady || legalUnavailable) {
          return
        }
        if (!allChecked) {
          setShowRequired(true)
          return
        }
        setShowRequired(false)
        acceptMutation.mutate(fields.map((field) => field.type))
      }}
    >
      <h1 className="font-display text-3xl font-bold tracking-tight text-balance text-on-surface md:text-4xl">
        {t('legalAcceptance.title')}
      </h1>
      <p className="mt-3 text-sm leading-relaxed text-on-surface-variant">
        {t('legalAcceptance.description')}
      </p>

      {pendingQuery.isPending || (fields.length > 0 && !publishedReady && !legalUnavailable) ? (
        <p className="mt-8 text-sm text-on-surface-variant">{t('register.legal.loading')}</p>
      ) : null}

      {fields.length > 0 && publishedReady ? (
        <fieldset className="mt-10 space-y-3 border-0 p-0">
          <legend className="sr-only">{t('register.legal.legend')}</legend>
          {fields.map((field) => (
            <LegalAcceptanceField
              key={field.type}
              id={field.id}
              label={t(field.labelKey)}
              openLabel={t(field.openKey)}
              checked={acceptedByType[field.type] === true}
              invalid={notice === 'required' && acceptedByType[field.type] !== true}
              describedBy={notice === 'required' ? LEGAL_NOTICE_ID : undefined}
              onCheckedChange={(checked) => {
                setAcceptedByType((current) => ({ ...current, [field.type]: checked }))
              }}
              onOpen={() => setOpenDocument(publishedQueries.data?.[field.type] ?? null)}
            />
          ))}
        </fieldset>
      ) : null}

      <PublishedLegalDocumentDialog
        document={openDocument}
        closeLabel={t('register.legal.close')}
        description={t('register.legal.dialogDescription')}
        onClose={() => setOpenDocument(null)}
      />

      {notice ? (
        <div className="mt-6 space-y-3">
          <p
            id={LEGAL_NOTICE_ID}
            role="alert"
            className="rounded-lg border border-error/40 bg-error-container/20 px-4 py-3 text-sm text-error"
          >
            {t(
              notice === 'unavailable' ? 'register.legal.unavailable' : 'legalAcceptance.required'
            )}
          </p>
          {legalUnavailable ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => void publishedQueries.refetch()}
            >
              {t('register.legal.retry')}
            </Button>
          ) : null}
        </div>
      ) : null}

      {acceptMutation.isError ? (
        <p
          role="alert"
          className="mt-6 rounded-lg border border-error/40 bg-error-container/20 px-4 py-3 text-sm text-error"
        >
          {acceptMutation.error.message}
        </p>
      ) : null}

      <Button
        type="submit"
        size="lg"
        className="mt-10 w-full"
        loading={acceptMutation.isPending}
        disabled={
          acceptMutation.isPending ||
          pendingQuery.isPending ||
          legalUnavailable ||
          (fields.length > 0 && !publishedReady)
        }
      >
        {acceptMutation.isPending ? t('legalAcceptance.submitting') : t('legalAcceptance.submit')}
      </Button>
    </form>
  )
}
