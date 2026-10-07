import { readFile } from 'node:fs/promises'
import { expect, test } from 'vitest'

const cookieModuleUrl = new URL('../app/modules/common/constants/cookies.ts', import.meta.url)
const apiModuleUrl = new URL('../app/config/api.ts', import.meta.url)
const signOutModuleUrl = new URL('../app/modules/auth/utils/sign-out.utils.ts', import.meta.url)
const requireAdminSessionModuleUrl = new URL(
  '../app/modules/common/components/require-admin-session.tsx',
  import.meta.url
)
const requireGuestModuleUrl = new URL(
  '../app/modules/common/components/require-guest.tsx',
  import.meta.url
)
const loginFormModuleUrl = new URL('../app/modules/auth/components/login-form.tsx', import.meta.url)
const loginMutationModuleUrl = new URL(
  '../app/modules/auth/mutations/use-auth-mutations.ts',
  import.meta.url
)
const appLayoutRouteModuleUrl = new URL('../app/routes/_app.tsx', import.meta.url)
const appIndexRouteModuleUrl = new URL('../app/routes/_app/index.tsx', import.meta.url)
const usersRouteModuleUrl = new URL('../app/routes/_app/users.tsx', import.meta.url)
const errorsRouteModuleUrl = new URL('../app/routes/_app/errors.tsx', import.meta.url)
const legalDocumentsRouteModuleUrl = new URL(
  '../app/routes/_app/legal-documents.tsx',
  import.meta.url
)
const legalDocumentsViewModuleUrl = new URL(
  '../app/modules/legal-documents/components/legal-documents-view.tsx',
  import.meta.url
)
const legalDocumentSectionModuleUrl = new URL(
  '../app/modules/legal-documents/components/legal-document-section.tsx',
  import.meta.url
)
const appShellModuleUrl = new URL('../app/modules/common/components/app-shell.tsx', import.meta.url)
const appShellUserModuleUrl = new URL(
  '../app/modules/common/components/app-shell-user.tsx',
  import.meta.url
)
const appShellLanguageModuleUrl = new URL(
  '../app/modules/common/components/app-shell-language-switcher.tsx',
  import.meta.url
)
const adminLocaleEsUrl = new URL(
  '../../../packages/i18n/src/locales/admin/es.json',
  import.meta.url
)
const adminLocaleEnUrl = new URL(
  '../../../packages/i18n/src/locales/admin/en.json',
  import.meta.url
)

test('admin session infrastructure uses an isolated token and authenticated API client', async () => {
  const [cookieSource, apiSource, commonAuthStorageSource] = await Promise.all([
    readFile(cookieModuleUrl, 'utf8'),
    readFile(apiModuleUrl, 'utf8'),
    readFile(
      new URL('../../../packages/common/src/constants/auth-storage.ts', import.meta.url),
      'utf8'
    ),
  ])

  expect(cookieSource.includes('ACCESS_TOKEN_COOKIE_NAME[CLIENT_APP.ADMIN]')).toBe(true)
  expect(cookieSource.includes('CLIENT_APP.DASHBOARD')).toBe(false)
  expect(commonAuthStorageSource.includes("'app.admin.auth.token'")).toBe(true)
  expect(commonAuthStorageSource.includes("'app.dashboard.auth.token'")).toBe(true)
  expect(apiSource.includes('getAccessToken: getAccessTokenSync')).toBe(true)
})

test('admin sign-out clears credentials, session state, and query cache', async () => {
  const source = await readFile(signOutModuleUrl, 'utf8')

  expect(source.includes('clearAuthSession()')).toBe(true)
  expect(source.includes('useSessionStore.getState().clearSession()')).toBe(true)
  expect(source.includes('queryClient.clear()')).toBe(true)
})

test('admin route boundaries enforce the admin role and clear restored non-admin sessions', async () => {
  const [adminBoundarySource, guestBoundarySource] = await Promise.all([
    readFile(requireAdminSessionModuleUrl, 'utf8'),
    readFile(requireGuestModuleUrl, 'utf8'),
  ])

  expect(adminBoundarySource.includes('isAdminSession(user)')).toBe(true)
  expect(adminBoundarySource.includes('clearAuthenticatedState(queryClient)')).toBe(true)
  expect(adminBoundarySource.includes('SESSION_STATUS.UNAUTHENTICATED')).toBe(true)
  expect(guestBoundarySource.includes('isAdminSession(user)')).toBe(true)
  expect(guestBoundarySource.includes('clearAuthenticatedState(queryClient)')).toBe(true)
})

test('admin login is password-only and rejects a session without the admin role', async () => {
  const [formSource, mutationSource] = await Promise.all([
    readFile(loginFormModuleUrl, 'utf8'),
    readFile(loginMutationModuleUrl, 'utf8'),
  ])

  expect(formSource.includes('loginSchema')).toBe(true)
  expect(formSource.includes('GoogleContinueButton')).toBe(false)
  expect(formSource.includes('forgotPassword')).toBe(false)
  expect(formSource.includes('createAccount')).toBe(false)
  expect(mutationSource.includes('isAdminSession(useSessionStore.getState().user)')).toBe(true)
  expect(mutationSource.includes('clearAuthenticatedState(queryClient)')).toBe(true)
})

test('admin protected layout requires an admin session', async () => {
  const routeSource = await readFile(appLayoutRouteModuleUrl, 'utf8')

  expect(routeSource.includes('<RequireAdminSession>')).toBe(true)
  expect(routeSource.includes('<AppShell>')).toBe(true)
})

test('admin protected root redirects to users and exposes section routes', async () => {
  const [indexSource, usersSource, errorsSource, legalDocumentsSource] = await Promise.all([
    readFile(appIndexRouteModuleUrl, 'utf8'),
    readFile(usersRouteModuleUrl, 'utf8'),
    readFile(errorsRouteModuleUrl, 'utf8'),
    readFile(legalDocumentsRouteModuleUrl, 'utf8'),
  ])

  expect(indexSource.includes('redirect(')).toBe(true)
  expect(indexSource.includes('ADMIN_ROUTES.users()')).toBe(true)
  expect(usersSource.includes("createFileRoute('/_app/users')")).toBe(true)
  expect(errorsSource.includes("createFileRoute('/_app/errors')")).toBe(true)
  expect(legalDocumentsSource.includes("createFileRoute('/_app/legal-documents')")).toBe(true)
})

test('admin shell provides navigation, account identity, and sign-out without mock metrics', async () => {
  const [shellSource, userSource, languageSource] = await Promise.all([
    readFile(appShellModuleUrl, 'utf8'),
    readFile(appShellUserModuleUrl, 'utf8'),
    readFile(appShellLanguageModuleUrl, 'utf8'),
  ])

  expect(shellSource.includes('<AppSidebar')).toBe(true)
  expect(shellSource.includes('ADMIN_ROUTES.users()')).toBe(true)
  expect(shellSource.includes('ADMIN_ROUTES.errors()')).toBe(true)
  expect(shellSource.includes('ADMIN_ROUTES.legalDocuments()')).toBe(true)
  expect(shellSource.includes('clearAuthenticatedState(queryClient)')).toBe(true)
  expect(shellSource.includes("t('nav.users')")).toBe(true)
  expect(shellSource.includes("t('brand.subtitle')")).toBe(true)
  expect(userSource.includes('user.email')).toBe(true)
  expect(userSource.includes("t('nav.signOut')")).toBe(true)
  expect(languageSource.includes('useLanguage')).toBe(true)
  expect(shellSource.includes('KPI')).toBe(false)
})

test('admin legal documents provide organization and web editors with save and publish actions', async () => {
  const [viewSource, sectionSource] = await Promise.all([
    readFile(legalDocumentsViewModuleUrl, 'utf8'),
    readFile(legalDocumentSectionModuleUrl, 'utf8'),
  ])

  expect(viewSource.match(/<LegalDocumentSection/g)?.length).toBe(2)
  expect(sectionSource.includes('RichEditor')).toBe(true)
  expect(sectionSource.includes('scrollable')).toBe(true)
  expect(sectionSource.includes('setTermsContent')).toBe(true)
  expect(sectionSource.includes('setPrivacyContent')).toBe(true)
  expect(viewSource.includes('onSave')).toBe(true)
  expect(sectionSource.includes('onPublish')).toBe(true)
})

test('admin copy is provided in Spanish and English', async () => {
  const [esSource, enSource] = await Promise.all([
    readFile(adminLocaleEsUrl, 'utf8'),
    readFile(adminLocaleEnUrl, 'utf8'),
  ])

  expect(esSource.includes('"accessDenied"')).toBe(true)
  expect(enSource.includes('"accessDenied"')).toBe(true)
  expect(esSource.includes('"home"')).toBe(true)
  expect(enSource.includes('"home"')).toBe(true)
  expect(esSource.includes('"brand"')).toBe(true)
  expect(enSource.includes('"brand"')).toBe(true)
  expect(esSource.includes('"sections"')).toBe(true)
  expect(enSource.includes('"sections"')).toBe(true)
  expect(esSource.includes('"users"')).toBe(true)
  expect(enSource.includes('"errors"')).toBe(true)
  expect(esSource.includes('"theme"')).toBe(true)
  expect(enSource.includes('"fallbackName"')).toBe(true)
  expect(esSource.includes('"legalDocuments"')).toBe(true)
  expect(enSource.includes('"legalDocuments"')).toBe(true)
  expect(esSource.includes('"settings"')).toBe(true)
  expect(enSource.includes('"settings"')).toBe(true)
})
