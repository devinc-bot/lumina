# Plan 062 - Staff Invitation Password Errors

## Approach

Keep the shared `acceptStaffInvitationSchema` as the source of validation rules. In the dashboard invitation form, filter issues produced by the full-form parse to the `confirmPassword` path before returning them from that field's validator. Other fields continue to validate through their existing field validators.

## Affected Areas

- `apps/dashboard/app/modules/staff/components/staff-invitation-accept-view.tsx`
- Dashboard form validation behavior only; no API, persistence, or shared contract changes.

## Verification

- Review the confirmation validator to ensure unrelated issues are excluded and mismatch issues are retained.
- Run the dashboard type-check and inspect `git diff --check`.

## Confirmed Decisions

- Do not change shared validation schemas or user-facing translations; the defect is the field-level assignment of whole-form issues.
