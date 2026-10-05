# Tasks 051 - Checkout Data Retention

## Review Workload Forecast

- 400-line budget risk: High.
- Chained PRs recommended: Yes, with one behavior change per review unit.
- Test importance: High — data deletion, payment reconciliation, privacy, and financial evidence.

- [x] T1: Resolve the open product/legal decisions and document the exact eligibility matrix,
      terminal clocks, legal-hold authority, and late-webhook retention policy.
- [x] T2: Add failing isolated-database tests for late webhooks after receipt minimization or
      reservation cleanup, then implement minimal receipt/tombstone reconciliation support.
- [x] T3: Add the legal-hold schema, migration, documented manual operation, and tests for honoring
      a hold during retention.
- [x] T4: Add a bounded, dry-run retention repository with guarded eligibility and integration tests
      for economic payments, issued tickets, unresolved webhooks, and concurrent workers.
- [x] T5: Implement 90-day terminal webhook payload minimization and eligible reservation cleanup;
      prove the late-webhook and idempotency behavior with database tests.
- [x] T6: Implement 12-month buyer dissociation for unsuccessful purchases and update affected
      purchase queries and contracts with regression tests.
- [x] T7: Register the shared retention workflow in internal jobs and local scheduling; document
      cadence, metrics, dry-run configuration, and operational recovery.
- [x] T8: Run focused and global verification, review isolated dry-run counts, and complete
      read-only quality review.

Production scheduling remains dry-run. Enabling apply requires legal/accounting approval and review of
the production dry-run counts; this operational rollout is outside the completed implementation tasks.
