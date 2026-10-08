# Plan 053 - Staff QR Check-In Entry

## Approach

1. Redirect staff from the dashboard Panel route to `DASHBOARD_ROUTES.qrTicket()` and hide the Panel nav item for staff while preserving owner navigation.
2. Remove the attendee table and its now-unused mock data, status map, badge, and table component.
3. Add an explicit scan action in QR Ticket and mount `TicketScanner` only after activation; preserve history and existing check-in result/retry behavior.
4. Run focused behavior tests plus dashboard type, lint, format, i18n, and diff checks.

## Affected Areas

- `apps/dashboard/app/modules/staff-panel/components/staff-panel-view.tsx`
- `apps/dashboard/app/modules/staff-panel/components/attendee-records.tsx` (remove)
- `apps/dashboard/app/modules/staff-panel/components/entry-status-badge.tsx` (remove)
- `apps/dashboard/app/modules/staff-panel/constants/attendees.mock.ts` (remove)
- `apps/dashboard/app/modules/staff-panel/constants/attendee-entry-status.ts` (remove)
- `apps/dashboard/app/routes/_app/dashboard.tsx`
- `apps/dashboard/app/modules/common/components/app-shell.tsx`
- `apps/dashboard/app/modules/ticket-check-ins/components/ticket-check-in-page.tsx`
- dashboard behavior tests and `packages/i18n/src/locales/dashboard/{es,en}.json` if new labels are required
- `spec/features/active/053-staff-panel-remove-mock-attendees/`

## Contracts and Data

No API or persisted-data changes. Navigation reuses `DASHBOARD_ROUTES.qrTicket()` and the existing `/_app/qr-ticket` route. The existing camera and check-in components remain the scanner implementation.

## Verification

- `pnpm --filter @repo/dashboard type-check`
- Focused dashboard tests for role navigation and scan activation
- `pnpm --filter @repo/i18n check:i18n`
- Scoped oxlint and oxfmt checks for modified source and spec files
- `git diff --check`
