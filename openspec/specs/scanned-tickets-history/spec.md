# scanned-tickets-history Specification

## Purpose

TBD - created by archiving change scanned-tickets-history. Update Purpose after archive.

## Requirements

### Requirement: Operators can review scanned tickets for an event

The dashboard SHALL expose a **Historial** view inside the QR Ticket page for `owner` and `staff` accounts. An authenticated operator SHALL be able to select one of their organization's events and view the scanned tickets of that event. The API MUST enforce the same allowed roles and organization membership independently of the dashboard UI.

#### Scenario: Owner opens the scanned-ticket history

- **GIVEN** an authenticated `owner`
- **WHEN** they open the **Historial** tab of the QR Ticket page and select an event of their organization
- **THEN** the dashboard lists the scanned tickets of that event

#### Scenario: Staff opens the scanned-ticket history

- **GIVEN** an authenticated `staff` member
- **WHEN** they open the **Historial** tab of the QR Ticket page and select an event of their organization
- **THEN** the dashboard lists the scanned tickets of that event

#### Scenario: Another role requests the history

- **GIVEN** an authenticated account whose role is neither `owner` nor `staff`
- **WHEN** it requests the scanned-ticket history endpoint
- **THEN** the API rejects the request without exposing ticket, purchaser, or operator information

### Requirement: History access is scoped to organization membership

The API SHALL return the scanned-ticket history only when the event belongs to an organization of which the requester is a member. An event outside the requester's organization MUST be presented as not found and MUST NOT expose its data.

#### Scenario: Operator reviews an event of their organization

- **GIVEN** an authenticated owner or staff member whose organization owns the requested event
- **WHEN** they request the scanned-ticket history for that event
- **THEN** the API returns the paginated scanned tickets

#### Scenario: Operator requests an event of another organization

- **GIVEN** a validly authenticated owner or staff member and an event owned by a different organization
- **WHEN** they request the scanned-ticket history for that event
- **THEN** the API returns not found without exposing the event's tickets or purchasers

### Requirement: History is paginated and ordered

The API SHALL return scanned tickets for an event in pages, ordered by scan time descending, with a deterministic tie-break for identical timestamps. The pagination query MUST be validated through `@repo/validators`.

#### Scenario: Scanned tickets are returned newest first

- **GIVEN** an event with multiple scanned tickets
- **WHEN** an authorized operator requests the history
- **THEN** the tickets are ordered by scan time descending

#### Scenario: Pagination is respected

- **GIVEN** an event with more scanned tickets than a single page
- **WHEN** an authorized operator requests a specific page and limit
- **THEN** the API returns only that page and reports the total count and total pages

### Requirement: Each history item exposes purchaser, operator, and ticket information

For every scanned ticket in the history, the API SHALL return the purchaser full name, email, and phone; the operator full name, email, and role; the ticket name and type; and the scan timestamp.

#### Scenario: A scanned ticket includes full details

- **GIVEN** a scanned ticket whose purchaser, operator, and ticket information is available
- **WHEN** it is returned in the history
- **THEN** the item includes the purchaser, operator, ticket, and scan-time fields

#### Scenario: A pre-migration scan has no operator

- **GIVEN** a scanned ticket recorded before operator tracking existed
- **WHEN** it is returned in the history
- **THEN** the operator fields are reported as not available and the dashboard shows the localized **No informado** fallback

#### Scenario: Purchaser phone is absent

- **GIVEN** a scanned ticket whose purchaser has no phone number
- **WHEN** it is returned in the history
- **THEN** the purchaser phone is reported as not available and the dashboard shows the localized **No informado** fallback

### Requirement: Staff can list their organization's events

The dashboard event selector SHALL be populated from an events listing available to both `owner` and `staff`. A staff member SHALL see only the events of organizations they belong to.

#### Scenario: Staff lists events to select for history

- **GIVEN** an authenticated `staff` member
- **WHEN** they open the history event selector
- **THEN** the selector lists the events of their organizations

#### Scenario: Staff does not see other organizations' events

- **GIVEN** an authenticated `staff` member
- **WHEN** they open the history event selector
- **THEN** events owned by other organizations are not listed

### Requirement: Check-in history API contract is explicit and validated

The API SHALL expose `GET /tickets/check-ins/history` for authenticated `owner` and `staff` accounts. Its `{ eventId, page, limit }` query MUST be validated through `@repo/validators`. It SHALL return `200` with a paginated scanned-ticket list and `404` when the event is unknown or outside the operator's organization.

#### Scenario: Valid request succeeds

- **GIVEN** an authorized operator requests the history of an event in their organization
- **WHEN** `GET /tickets/check-ins/history` completes
- **THEN** it returns `200` with the paginated scanned tickets

#### Scenario: Query is malformed

- **GIVEN** a request without a valid `eventId`
- **WHEN** it reaches `GET /tickets/check-ins/history`
- **THEN** the shared Zod validator rejects it before any lookup

#### Scenario: Event is outside the operator's organization

- **GIVEN** a validly authenticated operator and an event of another organization
- **WHEN** it is requested
- **THEN** the API returns `404` with no protected ticket or purchaser data

### Requirement: Dashboard history has localized copy

The **Historial** tab, event selector, table headers, and fallback text SHALL be provided in Spanish and English via `@repo/i18n`.

#### Scenario: History renders in the active locale

- **GIVEN** the dashboard is running in either Spanish or English
- **WHEN** the operator opens the **Historial** tab
- **THEN** its labels, headers, and empty state render in the active locale
