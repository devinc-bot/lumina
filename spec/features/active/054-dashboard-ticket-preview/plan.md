# Plan 054 - Dashboard Ticket Preview

## Approach

Build a semantic-token adaptation of the supplied ticket: landscape proportion, ticket notches, perforation, large event title, compact metadata, and vertical stub. Place it in a reusable tickets component and render it in the existing View dialog. Port the reference's warp/random dithering shader to a focused WebGL2 canvas using project color tokens. Add pointer tilt to the ticket wrapper, matching the reference's perspective and motion. Respect reduced motion and provide a static fallback.

## Data and Copy

Map the existing row's event, location, ticket type, and price directly. Add preview labels in both ticket locale files. Do not synthesize a QR, event date, organizer, or validity period.

For the visual QR requested in T3, use the dashboard's existing `react-qr-code` dependency with a fixed, namespaced sample payload and an explicit localized invalid-for-admission label. This is a change to the preview design, not issuance of a purchased ticket credential. Keep the QR on a white quiet-zone surface within the stub so the animated texture cannot obstruct it.

## T3 Palette

Use existing dark charcoal and citrus primary tokens for the ticket background and animated pattern. Set the shader's background and foreground uniforms from the same theme tokens used by the CSS fallback, and keep foreground text legible over either pattern color.

## T4 Palette Correction

The T3 canvas was composed at 35% opacity, making `#dcff02` appear olive over `#121311`. Use the existing `#33352f` high charcoal surface for the ticket and render the shader at full opacity so its green pixels retain the true brand color. Protect small text contrast over bright pattern areas with a restrained dark backing or equivalent local treatment; keep the QR white quiet zone intact.

## T5 Palette Preference

Restore the original `#121311` ticket background preferred by the user while retaining full-opacity `#dcff02` animation, the unified text contrast layer, and the sample QR.

## T6 Overlay Removal

Keep the pixelated green dither animation unchanged. Remove only the broad 80% dark overlay from the ticket's main content. Identify the shader code that creates the green points for the user.

## T7 Text Layering

Remove the local dark backing boxes from the ticket labels and values. Explicitly layer the content above the animated canvas and use only a subtle text-level contrast treatment if needed. Keep the QR's white quiet zone and the existing animation unchanged.

## T8 Ticket Perforation Details

Increase the edge notch diameter while keeping each notch centered on the ticket edge. Make the stub divider thicker and higher contrast using existing semantic ticket tokens.

## T9 Transparent Perforation Notches

Remove opaque fills from the decorative seam notches so the animated ticket surface remains visible through them, including at the rounded ticket corners.

## T10 Ticket Cutout Surface

Use the dialog's opaque popover color as the cutout color and add matching circular cutouts at all four ticket corners. Keep the seam endpoint cutouts and dialog background on the same semantic token, overriding the shared glass background for this preview. Increase corner cutout size and center the dashed divider on the seam endpoint cutouts.

## T12 Straight Divider Alignment

Render the dashed divider as an independent vertical element centered on the seam notch centers. Layer the notch circles above the divider so it terminates cleanly at each opening.

## T13 Corner Cutout Sizing

Set the outer corner cutouts to the same size and centered offsets as the seam endpoint cutouts, preserving the opaque popover color and centered divider.

## T14 Inset Ticket Frame

Add a subtle double-line frame inset from the ticket edges, using existing muted ticket colors and keeping the cutouts, text, QR, and perforation legible above the animated surface. Reduce the QR wrapper width on narrow screens so it does not cover the frame; restore its larger width from the `sm` breakpoint.

## T15 Double-Line Ticket Edges

Keep two parallel lines along the ticket's inset perimeter, with the inner line thinner and slightly lighter but still clearly visible over both animated colors. Use difference blending to preserve contrast across the dark and citrus pattern areas. Leave the circular cutouts unoutlined.

## T16 Inner Perimeter Line Visibility

Keep the thinner inner perimeter line visibly distinct from the outer line over both animated colors without outlining the cutouts.

## T17 Typography, Perforation, and Motion Update

Reduce the event title scale, explicitly center the perforation line and endpoint cutouts on the same axis, and replace the pixel dither with a smooth moving citrus ribbon while preserving the theme tokens and reduced-motion/WebGL fallback behavior. Use an external dark text halo so the light copy stays defined over both the near-black surface and the full citrus wave without opaque text panels or reducing the letter fill.

## T18 Ticket Description Flip

Carry the existing ticket description into `TicketRecordItem`. Make the ticket itself the conditional flip control when the description contains non-whitespace text; do not show separate description or return actions. Flip an inner preserve-3d surface so the existing outer pointer tilt remains independent. Duplicate the ticket's outer corner cutouts, seam cutouts, centered dashed perforation divider, and double-line frame on the reverse face. Keep inactive content hidden from assistive technology, expose the pressed state, support Enter and Space, and honor reduced-motion preferences.

## T19 Reusable Ticket Face

Extract the ticket's physical construction to an exported tickets-module component. Its API accepts semantic slots for background, body content, and optional stub content, while it owns the surface, double frame, four corner cutouts, centered dashed divider, and seam cutouts. Consume it for both preview faces so future ticket usages do not need to repeat decorative positioning or styles.

## T20 Physical Ticket Cutouts

Replace the color-matched circular cutout spans in the reusable ticket face with an SVG mask that subtracts the four corner and two seam circles from the rendered surface. Keep the circles responsive and aligned with the stub divider, so the cutouts reveal the actual surface behind the ticket in either theme rather than assuming a dialog color.

## T21 Flipped Seam Alignment

Derive the masked seam cutout coordinate from the stub's layout position rather than its transformed visual bounds. This keeps the SVG mask and the CSS divider on the same axis when the reverse face is rotated.

## T22 Ticket Proportion

Use a 2:1 aspect ratio from the small breakpoint and increase the preview dialog's maximum width to `3xl`. Preserve the existing mobile minimum height so the QR, stub label, and invalid-sample notice remain readable on narrow screens.

## T23 Wider Ticket Preview

Increase the desktop dialog maximum width from `3xl` to `4xl` while retaining the 2:1 proportion. The existing fluid viewport width remains the mobile constraint.

## Verification

Run relevant new tests, dashboard type checking/build, repository lint and format checks, and `git diff --check`. Review responsive layout, theme contrast, QR labeling/quiet zone, dialog semantics, WebGL fallback, reduced motion, and animation cleanup.
