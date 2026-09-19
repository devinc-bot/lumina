## ADDED Requirements

### Requirement: Owners can configure a bounded recurring event schedule

The dashboard SHALL let an authorized owner mark a new event as recurring. When enabled, it SHALL present a cadence selector with "Semanal" and "Mensual", checkboxes for Monday through Sunday, and a required recurrence end date. The dashboard SHALL use `@repo/validators` to validate the recurrence input and SHALL show the generated occurrence count before submission.

#### Scenario: Recurrence controls are revealed

- **WHEN** an owner selects "Este evento es recurrente" while creating an event
- **THEN** the dashboard displays the cadence selector, weekday checkboxes, and recurrence end-date field

#### Scenario: Multiple weekdays are selected

- **WHEN** an owner selects Monday and Tuesday with a valid bounded schedule
- **THEN** the dashboard accepts both weekdays and previews every generated occurrence in the range

#### Scenario: Invalid recurring form is submitted

- **WHEN** an owner submits a recurring event without a selected weekday or with an end date before the initial event date
- **THEN** the dashboard prevents submission and displays the localized validation error

### Requirement: The system generates independent dated event occurrences

The API SHALL create an event series and all eligible occurrence events atomically when it receives a valid recurring event create request. Each occurrence SHALL retain the submitted event content and status, have a concrete start and end timestamp, reference the created series, and remain eligible for the existing ticket flow. The recurrence end date SHALL be inclusive for occurrence starts.

#### Scenario: Weekly schedule creates concrete dates

- **WHEN** an owner creates a weekly schedule for Friday and Saturday through its recurrence end date
- **THEN** the system creates one event occurrence for each matching Friday and Saturday and groups them under one series

#### Scenario: Monthly schedule creates selected weekdays

- **WHEN** an owner creates a monthly schedule with Monday and Tuesday selected
- **THEN** the system creates occurrences for every Monday and Tuesday within each calendar month covered by the configured range

#### Scenario: Event duration crosses midnight

- **WHEN** a recurring event starts at 23:30 and ends at 06:00 on the following day
- **THEN** every generated occurrence ends at 06:00 on its following local calendar day

#### Scenario: Generation fails

- **WHEN** one occurrence or its inherited event data cannot be persisted
- **THEN** the system does not persist the series or any occurrence from that request

### Requirement: Recurrence generation uses the owner browser timezone

The dashboard SHALL send the browser IANA timezone with recurring event input. The API SHALL use that timezone to interpret selected weekdays and local start times and SHALL persist it on the event series.

#### Scenario: Daylight-saving transition is included

- **WHEN** a recurring schedule spans a daylight-saving transition in the submitted browser timezone
- **THEN** generated occurrences retain their configured local start time on both sides of the transition

### Requirement: Series occurrences remain independently manageable

The system SHALL treat each generated event as an independently editable occurrence. Editing one occurrence SHALL not modify its series or sibling occurrences. Cancelling a series occurrence SHALL preserve its record and mark it cancelled rather than deleting it.

#### Scenario: One occurrence is reprogrammed

- **WHEN** an owner updates the dates of one occurrence in a series
- **THEN** only that occurrence changes and its original generated start timestamp remains available

#### Scenario: One occurrence is cancelled

- **WHEN** an owner cancels an occurrence in a series
- **THEN** the occurrence is retained with cancelled status and all other occurrences remain unchanged

#### Scenario: Series occurrence delete is requested

- **WHEN** an owner attempts to use the delete operation on an event belonging to a series
- **THEN** the system rejects the deletion and requires cancellation instead

### Requirement: Inherited image assets remain available to sibling occurrences

The system SHALL not delete a shared inherited image asset while another event occurrence still references it.

#### Scenario: Image is removed from one occurrence

- **WHEN** an owner removes an inherited image from one generated occurrence
- **THEN** the image remains available to every sibling occurrence that still references it
