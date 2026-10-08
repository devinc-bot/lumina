# Tasks 053 - Ticket Location Capacity Validation

- [x] T1: Add failing-first API and dashboard regression tests for aggregate capacity create/update boundaries, including inactive tickets and edits. Tests are written; execution is pending because Node.js and pnpm are unavailable in this environment.
- [x] T2: Enforce aggregate capacity atomically in ticket create/update API persistence and return a localized field-validation error. Creation and editing share one capacity-checked upsert transaction; obsolete unchecked writers were removed.
- [ ] T3: Expose remaining event capacity and validate ticket quantity in the dashboard form with localized field feedback.
- [ ] T4: Run focused tests, type/lint/format checks where available, and `git diff --check`.
