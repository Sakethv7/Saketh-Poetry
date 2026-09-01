# Homepage motion storyboard — approval draft

**Status:** Implemented as a local visual prototype; not approved or shipped.

The opening behaves as one painting coming into being, not a carousel of visual
effects. Timing is a 5-second target inside the approved 4–6 second envelope.

| Time | Image state | Text state | Motion character |
|---:|---|---|---|
| 0.0–0.4s | Warm blank paper; grain already present | Semantic nav is readable; title/quote held quiet | Stillness, then first contact |
| 0.4–1.8s | One dark calligraphic ground line and a few architectural/landscape strokes establish a threshold, lane, garden, or distant monsoon edge | Title begins to emerge after the scene has a visual anchor | Deliberate wet brush, no particles |
| 1.8–3.3s | Restrained earth/mineral washes bloom into the stroke structure; negative space remains dominant | Quotation and source emerge in the existing DOM layer | Slow capillary spread and soft opacity rise |
| 3.3–4.6s | Two or three fine ink accents complete the scene; wash edges stop expanding | Title and quotation reach full contrast | Decelerating, nearly still |
| 4.6–5.2s | Final painting holds | All opening copy is stable | Draw loop stops |
| Scroll | Painting remains settled while the opening leaves the viewport | Existing copy leaves with the section | Reader enters unchanged bookshelf |

## Visual direction

The scene should feel native to this anthology through recurring motifs—weather,
lanes, gardens, thresholds, pages, and wandering—without collapsing them into a
literal collage. Favor an asymmetrical, spacious composition with one visual
anchor and large fields of paper. Avoid a centered flower emblem, ornate border,
temple shorthand, saturated festival color, faux calligraphy, or a reproduction
of Surya's hibiscus.

## Reduced motion

The final settled frame appears immediately. There is no simulated fast-forward,
crossfade sequence, stroke reveal, or replay. The semantic title and quotation
are identical to the normal-motion path.

## Approval questions

Approve or revise these three choices before implementation:

1. Motif family: threshold/lane with monsoon-garden traces, rather than a single
   botanical emblem.
2. Palette: warm paper, carbon ink, muted indigo, and restrained earth red.
3. Text reveal: DOM opacity only, never canvas-rendered lettering.
