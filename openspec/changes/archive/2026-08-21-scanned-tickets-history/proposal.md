## Why

Operators can validate tickets at the door, but there is no way to review which tickets were already scanned for a given event. Owners and staff need a history of scanned tickets to audit door activity and resolve disputes.

## What Changes

- Persist the operator that consumes each ticket: add `checked_in_by_account_id` and `checked_in_by_role` to `tickets_sold` via a timestamp-prefixed migration, and record the operator in the check-in use case.
- Add `GET /tickets/check-ins/history` returning a paginated, scan-time-descending list of scanned tickets for one event, each with purchaser, operator, and ticket information.
- Extend the event listing (`GET /events/my-events`) so staff can list the events of their organization, enabling staff to select an event for the history view.
- Add a **Historial** tab to the dashboard QR Ticket page with an event selector and a paginated scanned-tickets table.

## Capabilities

### New Capabilities

- `scanned-tickets-history`: Operator review of scanned tickets per event, authorized by organization membership, with purchaser/operator/ticket details and pagination.

### Modified Capabilities

- `qr-ticket-check-in`: The successful scan now records the operator identity on `tickets_sold`, replacing the earlier "no column or migration" constraint for this feature.

## Impact

- Affected apps: `api`, `dashboard`.
- Affected packages: `db` (schema + migration + repository), `types` (DTOs), `validators` (query schema), `common` (route), `i18n` (dashboard EN/ES copy).
- API consumers: a new authenticated read endpoint and an extension of the existing events listing to staff; no breaking changes to existing request/response shapes.
- Existing scanned tickets without an operator record (pre-migration) will render an explicit "not reported" operator fallback.

## Non-goals

- Changing the scan/consume authorization model (operator must still be owner or staff of the location at scan time).
- Allowing any role other than `owner` and `staff` to read the history or list events.
- Re-scanning, un-scanning, or editing scanned tickets.
- Rebuilding the check-in history as a separate table or full audit log.
- Showing unscanned tickets in the history view.
