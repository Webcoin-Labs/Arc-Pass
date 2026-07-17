# Hero Entrance — Layered Cinematic Rise

## Understanding summary

- Add a PowerPoint-style entrance to the landing-page hero background.
- Keep the headline, eligibility form, and primary interaction stable and readable.
- Reveal the blue spotlight first, wipe the grid downward, then raise the identity silhouettes in three staggered bands.
- Play the sequence once when the landing hero mounts; do not loop or add particles.
- Use only transform, opacity, and clip-path so the animation does not change layout.
- Preserve the final existing hero composition after the entrance settles.
- Show the final static composition immediately when reduced motion is requested.

## Assumptions

- Total entrance duration is approximately 1.4 seconds.
- The existing blue, black, and white hero palette remains unchanged.
- Mobile receives the same sequence with shorter travel distances.

## Decision log

- Chosen: Layered Cinematic Rise.
- Considered: Soft Fade Build; rejected because the requested entrance should be clearly noticeable.
- Considered: Radial Zoom Reveal; rejected because it competes with the eligibility form.
- Motion order: spotlight → grid → rear silhouettes → middle silhouettes → foreground silhouettes.
- Accessibility: `useReducedMotion` bypasses all entrance interpolation.
