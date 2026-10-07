# Tasks 058 - Web Dark-Only Theme

## Test Importance

Low: this changes only visual configuration and removes visual controls; it has no domain,
authorization, payment, persistence, or API contract behavior. No new automated tests are required.

- [x] T1: Make `apps/web` dark-only across normal, error, and not-found roots; remove the public theme
      toggle; force event-detail maps to dark; and verify public navigation and responsive behavior remain
      intact.
- [x] T2: Make `apps/dashboard` and `apps/admin` dark-only across normal, error, and not-found roots;
      remove their landing and sidebar theme controls; update the affected static assertion; and verify
      navigation and responsive behavior remain intact.
- [x] T3: Remove shared light-theme CSS overrides and update the affected loader-token static coverage
      to validate the dark-only stylesheet.
