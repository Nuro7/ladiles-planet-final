# Cinematic video assets — AI Bridal Wall landing

Drop MP4 (H.264 / `.mp4`) files here with the **exact filenames below** and they
light up automatically across the landing page. Until a file exists, its section
gracefully shows the poster image + CSS/WebGL cinematics — nothing looks broken.

All videos should be: **muted, seamless-looping, 10–15 s, ~1080p, dark-graded**
with shallow depth of field. Keep each file lean (ideally < 6 MB) for a
Lighthouse score > 90 — they lazy-load only as their section nears the viewport.
Optional: add a matching `.webm` beside any `.mp4` for smaller downloads (the
player prefers whichever the browser can decode).

## Full-bleed scene backgrounds
| File            | Scene                                                        |
|-----------------|--------------------------------------------------------------|
| `hero.mp4`      | Dark luxury studio → bride walks in → turn → AI scan → portrait |
| `story.mp4`     | Bride smiles, flowers bloom, soft light                      |
| `transform.mp4` | AI transformation / dress + background change (Bridal Wall)  |
| `finale.mp4`    | Bride walking away, cinematic ending (final CTA)             |

## Horizontal gallery (Section 2)
`gallery-1.mp4` … `gallery-6.mp4` — jewelry, veil, embroidery, bridal walk close-ups.

## Bridal films rail (Section 6)
`film-1.mp4` … `film-5.mp4` — short bridal-film previews (play on hover).

## Testimonials (Section 8)
`testimonial-t1.mp4`, `testimonial-t2.mp4`, `testimonial-t3.mp4` — real bride clips.

---
Poster images currently come from `/public/bride-1.png`, `/public/bride-2.png`
and `/public/lp/placeholders/*`. Swap those for real stills anytime — paths are
centralised in `src/landing/data.js`.
