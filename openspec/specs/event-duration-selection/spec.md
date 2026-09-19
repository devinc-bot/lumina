# event-duration-selection Specification

## Purpose

TBD - created by archiving change event-duration-selection. Update Purpose after archive.

## Requirements

### Requirement: Validated duration input

The dashboard event create and edit forms SHALL collect an event duration through a required localized numeric input backed by the duration rule in `@repo/validators`, instead of accepting an end date and time.

#### Scenario: Owner enters a duration for a new event

- **WHEN** an owner creates an event and provides a start date and a valid duration
- **THEN** the form submits the entered duration without an end timestamp

#### Scenario: Owner edits an event with a valid duration

- **WHEN** an owner opens an event whose stored schedule maps to a valid duration
- **THEN** the form prepopulates that duration

#### Scenario: Owner edits an event with a legacy duration

- **WHEN** an owner opens an event whose stored schedule does not map to a valid duration
- **THEN** the form requires the owner to enter a valid duration before saving

### Requirement: Server-calculated end timestamp

The event create and update contracts SHALL accept `durationHours` validated by `@repo/validators` and SHALL NOT accept a client-provided `endsAt`. The API SHALL calculate and persist `endsAt` from `startsAt` and the validated duration.

#### Scenario: Create event with duration

- **WHEN** the API receives a valid create-event request with `startsAt` and `durationHours`
- **THEN** it persists an end timestamp exactly that duration after the start timestamp

#### Scenario: Update event with duration

- **WHEN** the API receives a valid update-event request with a changed start timestamp or duration
- **THEN** it persists an end timestamp recalculated from those request values

#### Scenario: Reject an invalid duration

- **WHEN** a create or update request contains a duration rejected by `@repo/validators`
- **THEN** validation rejects the request before persistence

### Requirement: Existing schedule output compatibility

Event repository storage and owner and public event response DTOs SHALL continue to use the calculated `endsAt` timestamp.

#### Scenario: Read a scheduled event

- **WHEN** an owner or public client reads an event created or updated with a duration
- **THEN** the response includes the calculated `startsAt` and `endsAt` timestamps
