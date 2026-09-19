# Plan 041 - Dashboard Landing Editorial Refresh

## Approach

Adapt the provided B2B editorial HTML mock into the existing `apps/dashboard` landing module. Reuse section components and constants; restyle markup/classes to match the mock’s hierarchy (floating pill header, full-bleed cinematic hero with optional live-ops dock + ticker, demo console or retained video, numbered feature rows with sticky editorial anchor, oversized how steps, audiences photo + cards, value split with floating note, testimonials, FAQ accordion, quieter closing CTA, denser footer). Map mock token names (`primary-container`, `surface-container`, spacing tokens) to existing CSS/Tailwind tokens from Citrus Soft / `@repo/ui`.

## Affected layers

| Layer                                  | Change                                                         |
| -------------------------------------- | -------------------------------------------------------------- |
| `apps/dashboard` landing components    | Restyle/restructure sections, header, footer                   |
| `apps/dashboard/public/landing/`       | Optional asset replace (pending Open Question)                 |
| `@repo/i18n` `dashboard-landing` ES/EN | Copy refresh from mock (honest claims pending)                 |
| Tests                                  | Pending Open Question (skip like 039 vs update existing suite) |

## Technical notes

- Composition entry: `apps/dashboard/app/modules/landing/components/landing-page.tsx` (`routes/index.tsx`)
- Header: `landing-header.tsx` — floating pill chrome scoped to this landing only
- Footer: `landing-footer.tsx`
- Tokens: `packages/ui/src/globals.css` already exposes MD3-style utilities — map mock classes to these, not CDN config
- CTAs: `DASHBOARD_ROUTES.register()` / `login()` via TanStack `Link` + `@repo/ui` `Button` where appropriate
- Icons: Lucide only (replace Material Symbols)
- FAQ: keep React accordion; remove any inline script pattern from the mock
- Motion: existing `Reveal` / `motion-reduce:` / prefers-reduced-motion for video if retained
- Do not load Tailwind CDN, Material Symbols, or remote `googleusercontent` URLs
- Domain language: identifiers stay `location`; marketing “club” only if copy-approved

## Confirmed decisions

- Demo: keep local promo video; restyle surrounding chrome only.
- Imagery: replace `public/landing/*` with downloaded mock assets (hero / audiences / value).
- Copy: honest product messaging; soften mock claims.
- Tests: update existing landing tests only; no new test files.
- Hero dock + ticker: simplified decorative treatment.

## Task order

1. i18n copy ES/EN
2. Header pill + Hero (image + simplified dock/ticker)
3. Demo video chrome restyle
4. Features + How
5. Audiences + Value + Social
6. FAQ + Closing + Footer; update existing tests; verify dark/light / reduced motion / anchors

## Verification

- Manual: guest CTAs, dark/light, mobile, reduced motion, hash scroll to `#features` / `#how` / `#audiences` / `#faq`
- Update and run existing `apps/dashboard` landing vitest files that break
- Optional: `pnpm type-check` / lint for touched packages

## Risks

- Softened copy must still feel close to the mock’s hierarchy without inventing SLAs
- Existing landing tests may need assertion updates when markup/copy change
