# Tasks 050 - Retire Legacy Orders

## Review Workload Forecast

- 400-line budget risk: High.
- Chained PRs recommended: Yes.
- Delivery strategy: incremental tasks with database safety first.
- Test importance: High — payment history, inventory integrity, issued tickets, and destructive DDL are in
  scope.

- [ ] T1: Extend the read-only audit and add failing isolated-database tests for legacy/normalized parity,
      issued-ticket preservation, status mappings, monetary snapshots, provider references, and guard failures;
      run the audit against each target environment before runtime cutover.
- [x] T2: Remove legacy inventory allocation and order list/detail/delete fallbacks; make all runtime order
      behavior use normalized purchases and add focused repository/use-case regression tests.
- [x] T3: Remove the legacy pending-order cleanup job and repository consumers, update job documentation,
      and add focused job registration tests while temporarily retaining the table schema and audit tool.
- [ ] T4: Deploy and verify the compatibility release in production, resolve the confirmed legacy-pending
      policy, and prove no live application revision reads or writes `orders`.
- [x] T5: Add the guarded timestamped migration
      that rechecks parity, drops `tickets_sold.order_id`, and
      drops `orders`; update the Drizzle schema, exports, normalized fixtures, and migration integration tests.
- [x] T6: Remove the now-obsolete legacy repository directory, audit command/script, repository-only types,
      and documentation references that require the deleted table.
- [ ] T8: Cancel the pending payment attempt atomically when an expired active reservation and its pending
      purchase transition to expired; add an isolated database regression test.
- [ ] T7: Run focused DB/API tests, migration verification, `pnpm type-check`, `pnpm lint`,
      `pnpm format:check`, affected builds, and `git diff --check`; complete read-only quality review and
      resolve all findings before archive.
