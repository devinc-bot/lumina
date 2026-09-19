# Plan 034 - Profile Avatar Upload and R2 Layout

## Approach

Extend the existing files and settings vertical slices. Add dedicated avatar upload/remove mutations for `user` and `owner`, a client-side square crop step before multipart upload, and hierarchical R2 key builders for avatars plus new event/location images. Do not migrate historical flat keys. Do not change JWT claims; refresh avatar from session/settings responses after mutation.

## Confirmed Decisions

- Actors: `user` (web) and `owner` (dashboard). Staff avatar stays read-only.
- Avatar output: 256×256 square WebP; client crop + server Sharp enforce.
- Dedicated settings endpoints for avatar; text profile `PATCH` unchanged.
- Remove avatar allowed (`avatarId = null`).
- R2 layout for new objects only; existing `images/<uuid>` (or prefixed) assets keep working via stored `url` / `storageKey`.
- `tickets/` prefix reserved, unused this feature.
- Google OAuth continues to seed external URLs when avatar empty; upload replaces the FK.

## Data Model

No schema migration required. Reuse:

- `users.avatarId` / `owners.avatarId` → `assets.id`
- `assets.url`, `assets.storageKey`, `assets.type`

On upload: insert a new `assets` row (or update in a single transactional flow), set profile `avatarId`, delete previous R2 object when `storageKey` is present, and delete or orphan-clean the previous asset row when it was R2-backed. External Google assets (`storageKey` null) are unlinked without remote delete.

## R2 Key Layout

`R2_UPLOAD_PREFIX` is removed; object keys are the full hierarchical paths below (no Files SDK prefix).

```text
events/{eventDocumentId}/cover-{uuid}.webp
events/{eventDocumentId}/gallery-{n}-{uuid}.webp
locations/{locationDocumentId}/gallery-{n}-{uuid}.webp
users/avatars/{profileDocumentId}-{uuid}.webp
tickets/   # reserved; no writes
```

- Event primary image → `cover-{uuid}.webp`; additional images → `gallery-{n}-{uuid}.webp` (versioned under the event folder so replace/delete cannot clobber a newly uploaded object).
- Location images → `gallery-{n}-{uuid}.webp` (same versioning rationale).
- Avatar → **versioned key + delete previous `storageKey`** (matches current UUID habit, avoids immutable-cache hazards).

Update `FilesService`:

- Replace flat `buildImageKey` with builders: `buildAvatarKey`, `buildEventImageKey`, `buildLocationImageKey`.
- Add `optimizeAvatarImage` (or options on `optimizeImage`) using `fit: 'cover'` (or extract) to exact 256×256 WebP.
- Keep gallery optimization path (`fit: 'inside'`, max dimension) for events/locations, writing WebP when converting for the new fixed filenames.

## Contracts and API

1. `@repo/validators`: avatar max bytes, `AVATAR_OPTIMIZATION` (256, quality ~80), multipart field name constant (e.g. `avatar`).
2. `@repo/types` / `API_ROUTES.settings`:
   - `PUT` (or `POST`) multipart upload avatar
   - `DELETE` remove avatar  
     Paths under `/settings/avatar` (exact path helpers in `API_ROUTES`).
3. Settings module use cases dispatch by JWT role (`USER` | `OWNER`); reject `STAFF`.
4. Controllers validate MIME/size at the boundary; use cases orchestrate optimize → upload → asset row → profile FK → cleanup.
5. Response: return updated profile/session-compatible payload including `avatar: string | null` so clients can update stores without a full page reload.

Wire event/location image services to the new key builders when creating or replacing images on create/update multipart flows. Existing keep-by-id behavior for retained images stays; only newly uploaded files get hierarchical keys.

## Clients

### Shared crop UX

- Add a small crop dependency suitable for React 19 (e.g. `react-easy-crop` or equivalent already approved by the monorepo policy when added) in the app(s) that need it, or a thin shared module under `packages/ui` / `modules/common` if both apps share the dialog.
- Flow: pick file → crop modal (1:1) → export canvas/blob ~256–512 px → FormData upload.
- Respect `prefers-reduced-motion` for non-essential motion in the cropper chrome.

### `web`

- Extend `profile-form` / settings with change + remove avatar controls.
- Service methods calling the new settings avatar routes; invalidate/update session store `avatar`.

### `dashboard`

- Enable owner “Change photo” in `profile-settings-section`; add remove when avatar present.
- Staff profile section unchanged (display only).
- Reuse the same crop + upload service pattern as web where practical.

### i18n

- Spanish and English strings for change/remove, crop confirm/cancel, errors (type, size, failed upload, forbidden).

## Security and Privacy

- Authenticated role must match profile being mutated; never accept a target profile id from the client for self-avatar flows.
- Staff and other roles cannot mutate avatars via these endpoints.
- Continue MIME allowlist and size caps; never trust client-declared dimensions alone—Sharp enforces output.
- Do not log raw image bytes.

## Verification

- API tests: user/owner success paths; staff forbidden; invalid MIME/size; replace cleans previous key when present; remove nulls `avatarId`; Google external replace without remote delete.
- FilesService unit tests for key builders and avatar optimize dimensions/mime.
- Client tests: crop cancel does not upload; success updates displayed avatar; remove shows placeholder; owner CTA enabled; staff still read-only.
- Manual: web + dashboard owner, dark/light, mobile crop, replace Google avatar, replace R2 avatar.
- `pnpm check:i18n`, type-check, lint, format check, `git diff --check`.

## Rollout Notes

- Remove `R2_UPLOAD_PREFIX` from deploy env examples and API schema.
- Document that old objects remain under the previous prefix until naturally replaced.
- No one-shot migration script in this feature.
