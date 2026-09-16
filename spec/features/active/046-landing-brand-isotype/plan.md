# Plan 046 - Landing Brand Isotype

## Approach

Add a shared landing logo component using the existing AppLogo with a single local asset constant and the xl size. Replace text-and-dot branding in the web common landing header, web landing footer, dashboard landing header, and dashboard landing footer. Use existing translated brand text as the image alternative text because the JPG already includes the wordmark. Keep the default AppLogo asset unchanged.

## Exploration and Review

Read-only exploration confirmed that both headers reuse BrandMark in desktop and mobile, all four placements use text and dots, and AppLogo supports asset overrides and a 48 pixel xl size. Both supplied assets were visually inspected and match. The artifacts were reviewed against the requested scope before implementation.

## Transparent Asset Update

Read-only exploration confirmed that changing the shared LANDING_LOGO_SRC to `/landing/isotipo.png` covers all current placements with unchanged 48 pixel dimensions and localized alternative text. Three built-in image editing attempts left noisy remnants and were rejected. The user explicitly authorized local pixel processing, which extracts the original dark background with alpha matting without regenerating the logo. Visually inspect the result and verify real alpha transparency. Copy the identical PNG to both public directories while preserving original JPGs. The updated scope was reviewed before switching the shared source. Test importance remains low because this is an asset replacement without new behavior.

## Larger Header Logo

Read-only exploration confirmed the shared logo needs a header-only 80 pixel variant while footers retain 48 pixels. Increase both header bars to 96 pixels and their brand link heights to 80 pixels. Reduce mobile bar and brand link horizontal padding to retain space for existing account and navigation controls at 320 pixels. Keep the existing responsive auth links. Increase dashboard hero top padding to 144 pixels and landing section anchor margins to 128 pixels so the fixed header does not hide content. Preserve images, themes, alternative text, and navigation behavior. The artifacts were reviewed before implementation. Test importance remains low for this size and spacing adjustment.

## Larger Footer Logo

Read-only exploration confirmed that enlarging the shared footer variant to 80 pixels and the web footer brand link to 80 pixels covers both footers. Dashboard's flexible wrapper accommodates the new height naturally. The updated scope was reviewed before implementation. Test importance is low: cosmetic sizing without new behavior, so no new automated tests.

## Browser Icons

Read-only exploration confirmed that both root routes use APP_LOGO_SRC only for icon and apple-touch-icon metadata. Replace the imports and four href references with the existing LANDING_LOGO_SRC export. The transparent PNG exists in both public directories. No library API changes, new assets, or dependencies are needed. The updated artifacts were reviewed before implementation. Test importance is low for this document metadata asset replacement; no new automated tests.

## Symbol-Only Browser Icons

Read-only exploration confirmed that a dedicated APP_FAVICON_SRC constant exported from shared UI and used by both root routes isolates browser icons from header and footer branding. Use the previously authorized local image processing to crop the original symbol from the transparent PNG, excluding the wordmark and overbar. Center it on a 512 pixel square opaque #121311 canvas with approximately 10 percent padding. Save byte-identical `/landing/favicon.png` assets in both apps. Preserve the existing full logo elsewhere. The revised scope was reviewed before implementation. Test importance is low: asset and metadata polish without new behavior.

## Verification

Test importance is low: visual asset replacement without new behavior. No new automated tests. Run applicable type checking, lint, formatting, existing relevant tests if available, and git diff --check. A read-only quality reviewer checks dimensions, accessible names, responsive integration, and theme handling. Report any unavailable runtime or browser verification.
