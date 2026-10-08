# Tasks 052 - Event Location Image Preview

- [x] T1: Add a preview of the selected location image using data already loaded by the event form. The standalone preview was refined into the select in T2.
- [x] T2: Polish the image preview into the selector trigger and options while preserving accessible location text and shared select behavior. Added reusable selected-value/leading-content slots to shared select primitives and removed the trigger-height cap from its viewport; static quality review approved with no remaining findings.
- [x] T3: Show a muted location icon in the selector trigger and option thumbnail areas when a location has no image. Added a theme-safe `MapPin` fallback in both locations; statically reviewed and `git diff --check` passed.
