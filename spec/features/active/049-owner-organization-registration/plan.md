# Plan 049 - Owner Organization Registration

## Approach

Provision the organization from the existing owner-creation repository inside its caller's transaction. Reuse this provisioning operation for a targeted orphan-owner repair repository. Derive the initial organization display name from the owner's full name; use a collision-safe slug allocation strategy that does not rely solely on a prior read. Preserve the current settings query and authorization behavior.

Expose repair through a small CLI that previews counts by default and applies only when explicitly requested. Read credentials through the existing database configuration and never print them. Do not run broad migrations or seeds as part of repair.

## Verification

Test importance: high, because this fixes registration and relational integrity. Delegate failing regression coverage to test-engineer, then production code to implementation-engineer, then read-only acceptance review to quality-reviewer. Run focused repository/API tests, relevant type-check, lint, formatting, and git diff checks. Diagnose runtime configuration separately without revealing secrets.
