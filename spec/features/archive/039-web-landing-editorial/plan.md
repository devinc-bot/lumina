# Plan 039 - Web Landing Editorial Refresh

## Approach

Adapt the provided editorial HTML mock into the existing `apps/web` landing module. Reuse section components and constants; restyle markup/classes to match the mock’s hierarchy (full-bleed hero with lower-third content, overlapping about canvas + ticket card, oversized how steps, sparse clarity cards, interactive events gallery, organizers band, quieter closing CTA, denser footer). Map mock token names (`primary-container`, `surface-container`, etc.) to existing CSS/Tailwind tokens from Citrus Soft / `@repo/ui`.

## Affected layers

| Layer                         | Change                                                  |
| ----------------------------- | ------------------------------------------------------- |
| `apps/web` landing components | Restyle/restructure sections, header/footer if approved |
| `apps/web/public/landing/`    | Optional asset replace                                  |
| `@repo/i18n` `landing` ES/EN  | Copy refresh from mock                                  |
| Tests                         | **None** — do not add or update landing tests           |

## Technical notes

- Composition entry: `apps/web/app/modules/landing/components/landing-page.tsx` (`index.tsx` route)
- Header: `apps/web/app/modules/common/components/landing-header.tsx` — also used by `public-app-shell.tsx` on non-landing public pages; **gate any pill chrome with `isLanding`**
- Footer: `apps/web/app/modules/landing/components/footer.tsx`; organizer CTA uses `clientEnv.VITE_DASHBOARD_URL`
- Tokens: `packages/ui/src/globals.css` already exposes MD3-style utilities (`surface-container-*`, `on-surface-variant`, Montserrat/Inter via `@fontsource`) — map mock classes to these, not CDN config
- CTAs: `WEB_ROUTES.register()` / `login()` via `@repo/ui` `Link`; session via `useSession` + skeleton while loading
- Icons: Lucide only (replace Material Symbols)
- Gallery: keep React `useState` + `aria-pressed` in `SectionEvents`
- Motion: `Reveal` / `motion-reduce:` / existing prefers-reduced-motion CSS
- Do not load Tailwind CDN, Material Symbols, or remote `googleusercontent` URLs
- Exploration baseline: [Explore web landing](20392797-282c-4627-a06c-24e9d53db670)

## Confirmed decisions

- Floating pill `LandingHeader` on home (gate so `public-app-shell` pages stay usable).
- Replace `public/landing/*` with mock imagery (download once; no runtime remote URLs).
- Section order: Events → Organizers → Closing CTA → Footer.

## Verification

- Manual: guest + authenticated chrome, dark/light, mobile, reduced motion, hash scroll to `#eventos` / `#como-funciona` / `#claridad` / `#organizadores`
- Optional: `pnpm type-check` / lint for touched packages
- **No** `vitest` landing suite runs required for DoD of this feature

## Risks

- Pill header may clash with non-landing public pages if styles are not gated
- Over-claiming product capabilities in new copy (wallet/offline) — keep marketing honest vs current product
- Existing landing `*.test.tsx` may fail if anchors/structure change; per product request we will not update those tests in this feature — if CI fails on them, either exclude or ask for a follow-up chore
