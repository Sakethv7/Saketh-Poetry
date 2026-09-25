# Logic flow — the phone shelf

How the page assembles itself below 760px after the change, what runs in what
order, and where it can fail. Read `architecture.md` first for the shape;
this document is the sequence.

## Terms

**Document flow** — the browser's default top-to-bottom stacking of elements,
where a parent's height is the sum of what is inside it. The current shelf opts
*out* of flow by fixing its height and scrolling its overflow; the change puts it
back in.

**Sticky positioning** — an element that behaves normally until the scroll would
carry it past a given offset, at which point it stops and stays there *until its
containing block's bottom edge pushes it out*. That last clause is the whole
reason ADR-0002 chose sticky over fixed: the backdrop leaves the screen by itself
when `#poems` ends, with no script watching the scroll.

**Reflow** — the browser recomputing geometry after a change. Relevant here
because `layoutPlanks()` reads geometry (`offsetTop`) and then writes DOM, and
reading after writing in the same frame is what makes layout thrash.

## Load sequence

```
 parse HTML
     │
     ├─ <head> stylesheet applies; @media (max-width:760px) wins
     │
     ├─ body renders
     │    └─ #poems
     │         ├─ .library-backdrop   (sticky, 100svh, photo + scrim)   ← new
     │         └─ .poems-inner        (block, auto height)
     │              ├─ .library-header  (sticky, top:0)
     │              └─ .poems-grid      (auto height, overflow visible)
     │                   ├─ .lang-divider / .form-divider  (interleaved)
     │                   ├─ .poem-card × 70
     │                   └─ .shelf-plank × N   (injected by script)
     │
     ├─ shelf IIFE runs (index.html ~L1454)
     │    1. collect .poems-grid children
     │    2. walk once, tagging each card with data-lang / data-form /
     │       data-searchText
     │    3. build the filter buttons from the languages and forms found
     │    4. render()  ──────────────────┐
     │    5. attach ResizeObserver       │
     │                                   ▼
     │                              render()
     │                                │
     │                                ├─ toggle .is-hidden per card
     │                                │  (filter AND query)
     │                                ├─ toggle .is-hidden per divider
     │                                │  (only if a surviving card sits under it)
     │                                ├─ update the count text
     │                                └─ layoutPlanks()
     │                                     ├─ read offsetTop/offsetHeight
     │                                     │  of every visible card
     │                                     ├─ group into rows by offsetTop
     │                                     ├─ add/remove .shelf-plank nodes
     │                                     │  to match the row count
     │                                     └─ set each plank's style.top
     │
     └─ poems.json arrives (async)
          └─ widen each card's search index to full poem text;
             re-render only if a query is already active
```

*The shelf is fully present in the parsed HTML; the script only tags, filters,
and draws planks. Nothing about the card list is fetched or generated at runtime,
which is why releasing the height constraint needs no script change.*

## Why `layoutPlanks()` survives the change untouched

This is the load-bearing claim of the whole plan, so it is worth walking rather
than asserting.

`layoutPlanks()` measures `card.offsetTop` — the card's distance from the top of
its **offset parent**, which is the nearest positioned ancestor. That is
`.poems-grid`, which carries `position: relative` and keeps it in both layouts.
`offsetTop` is a position within the element's own coordinate space; it is not
affected by how much of that space is currently visible, or by whether the
element clips its overflow, or by its scroll position. A card 8,000px down the
shelf reports `offsetTop: 8000` whether the grid is a 445px scroll window or a
12,000px flowed block.

The planks are `position: absolute` inside that same `position: relative` grid,
positioned with the same numbers. So the register between plank and card row is
preserved by construction.

One second-order effect does change. The `ResizeObserver` watches
`.poems-grid`; today the grid's height is pinned so the observer effectively
fires only on width changes, while after the change the grid's height tracks its
content and so height changes can fire it too. This does not loop, because the
only thing `layoutPlanks()` writes is absolutely-positioned children, and
absolutely-positioned children are out of flow and cannot contribute to their
parent's height. The observer therefore cannot be re-triggered by its own
callback. **Verify rather than trust:** instrument the callback with a counter
during implementation and confirm it settles rather than ticking forever.

## Runtime paths

### Scrolling the shelf

One gesture, one scroller — the document. `.library-backdrop` sticks at `top: 0`
and holds the photograph still; `.library-header` sticks at `top: 0` above it in
paint order and holds search and filters still; cards and planks translate up
past both. When the bottom of `#poems` reaches the top of the viewport, both
sticky elements are pushed off by their containing block and the footer takes
over. No listener runs during any of this.

### Filtering or searching

`render()` toggles `.is-hidden` on cards and dividers, then calls
`layoutPlanks()`. In flow layout, hiding cards changes the grid's height, which
changes the height of `#poems`, which changes the document height, which changes
the scroll range. Two things follow that did not apply in the fixed layout:

- **The scroll position is preserved by the browser but its meaning is not.** A
  reader who filters to "Ghazal" while 9,000px down a 12,000px page lands
  somewhere past the end of the new, much shorter shelf; the browser clamps to
  the new maximum, which is the footer. The old layout was immune because the
  document height never changed. **This needs handling:** on a filter or search
  that changes the visible count, scroll the top of `.poems-grid` back into view.
- **The sticky header's offset is unaffected** — sticky is resolved against the
  viewport, not the document height — so the controls stay where the reader's
  thumb left them.

### Opening a poem

Unchanged. A card click is intercepted by the reader IIFE, which pushes a history
entry and opens the fixed-position `.book-reader` overlay. The overlay is
`position: fixed` and independent of the section's height, so nothing here
depends on the change. On close, the page is where it was.

One thing that *starts* working: a deep link to a card (rather than to the
reader) can now be scrolled to by the browser, because the target is in the
document flow rather than inside a nested overflow region. Not a goal of this
change, but worth not breaking.

## Failure and edge cases

| Condition | Behaviour | Handling |
|---|---|---|
| Filter empties the shelf | Grid collapses to near-zero height; `#poems` shrinks to roughly the header | The header is sticky against a container barely taller than itself, so it simply stops sticking. Acceptable; the "0 poems found" message carries the meaning. |
| Filter shortens the shelf while scrolled deep | Browser clamps scroll to the new maximum — reader lands at the footer | Scroll `.poems-grid` into view when the visible count changes. Must be `behavior: auto`, since `html { scroll-behavior: smooth }` would animate twelve thousand pixels. |
| `100svh` unsupported (older Safari) | Backdrop falls back to whatever `height` is declared before it | Declare `height: 100vh` then `height: 100svh`, so the older unit is the fallback. |
| Address bar shows/hides on scroll | `svh` is the *small* viewport height and does not change as the bar retracts, so the backdrop does not resize mid-scroll | This is why `svh` and not `vh`. |
| `backdrop-filter` unsupported | Sticky header renders with its `rgba(10,12,10,0.62)` background but no blur | Already the existing behaviour; the background alone carries enough contrast. |
| `prefers-reduced-motion` | Sticky positioning is not motion in the sense the query means; no change needed | The existing reduced-motion block is untouched. |
| Rotation to landscape (812×375) | Section reflows; `ResizeObserver` fires; planks are re-measured a frame later | Existing path, exercised more often now. Verify planks re-register after rotation. |

## Verification plan

Each step states what makes it pass. These are the checks to run before the
change is called done, all at 375×812 unless noted.

1. **One scroller.** `document.querySelectorAll('.poems-grid')[0].scrollHeight
   === clientHeight` → the shelf no longer scrolls internally.
2. **Full shelf reachable.** `document.body.scrollHeight` exceeds 11,000px and
   the last card's `getBoundingClientRect()` is reachable by page scroll alone.
3. **Backdrop holds.** Screenshot at the top of `#poems` and again 6,000px down;
   the photograph occupies the same screen region and is not magnified.
4. **Backdrop releases.** At the bottom of the page the footer is visible with no
   photograph behind it.
5. **Planks register.** For every visible row, the plank's `top` equals the
   row's `offsetTop + height`; spot-check visually that no plank crosses a card.
6. **Planks survive filtering.** Apply each of the fourteen filters; re-run
   check 5 after each.
7. **No observer loop.** Instrument the `ResizeObserver` callback; confirm the
   count settles after load, after a filter, and after rotation.
8. **Filter scroll recovery.** Scroll to 9,000px, apply "Ghazal", confirm the
   top of the shelf is on screen rather than the footer.
9. **Header reachable.** At 9,000px, search and all fourteen filters are on
   screen and tappable.
10. **Desktop untouched.** At 1280×720, `.poems-grid` still reports
    `scrollHeight > clientHeight` and the three-column shelf renders as before.
    This is the regression gate — the whole change lives inside a 760px media
    query and must be invisible above it.
11. **Hero.** At 375px the nav is one row and the gap between nav and
    "FROM THE COLLECTION" is materially under the current 184px.

## Homepage identity lifecycle — proposed

This flow is separate from the shelf flow above. It runs only when the homepage
opening is present and must finish before the reader reaches the existing shelf.

```text
document parses
  |
  +-- semantic nav/title/quotation render normally
  |
  +-- motion preference is read
        |
        +-- reduce ---------------------------------------+
        |                                                 |
        |   render deterministic settled frame            |
        |   no entrance loop                               |
        |                                                 v
        +-- no-preference -> initialize p5.brush canvas -> settled
                                 |                           frame
                                 +-- 0.0s blank paper
                                 +-- 0.3–2.4s scene strokes
                                 +-- 1.8–4.2s title/quote emerge
                                 +-- 4.0–6.0s washes settle
                                 +-- noLoop()
                                                             |
reader scrolls ------------------------------------------------+
  |
  +-- existing #poems shelf
  +-- existing card/filter/search behavior
  +-- existing #bookReader behavior
```

### State model

`uninitialized -> drawing -> settling -> settled` is the only animated path.
Reduced motion takes `uninitialized -> settled`. Dependency failure takes
`uninitialized -> fallback`, where the existing CSS paper and semantic content
remain. No state transition targets `#poems`, `#bookReader`, or an individual
poem page.

### Event rules

- Page load may start the scene once; scrolling away and back does not replay it.
- The title and quotation remain available before canvas initialization.
- Resize after settlement redraws only the final deterministic composition.
- Page visibility changes may pause drawing; resuming continues within the
  6-second ceiling rather than restarting.
- Canvas or dependency errors remove/ignore the art layer and preserve the
  opening's current CSS fallback.

### Approval and implementation checks

Before implementation, approve the motion storyboard and the scene's Indic
motif vocabulary. After implementation, verify both motion paths, failure
fallback, keyboard/focus behavior, title/quote contrast, no persistent RAF loop,
and byte/performance cost. Regression tests must prove shelf filters/search,
card metadata, all card links, and `#bookReader` remain behaviorally unchanged.

---

# Logic flow — poem pages: mood and link previews

Read the "Poem pages" section of `architecture.md` first. This part is the
sequence: what runs, in what order, and where it can fail.

## Terms

**Link preview fetch.** When a URL is pasted into a chat app, the app's server
(not the reader's phone) downloads the page. It reads the `og:` meta tags and
then downloads the `og:image`. The fetcher runs no JavaScript. So everything the
preview needs must already be in the HTML `<head>` as plain text.

**Fingerprint.** A short hash of the inputs that decide what a card shows. If any
input changes, the hash changes. It works like a checksum on the card's recipe,
not on the image.

## Flow 1 — author regenerates cards

```text
node tools/build-share-cards.mjs [--only <slug>]
  │
  ├─ preflight: Chrome binary exists? sips exists? ── no ──▶ exit 2, print what is missing
  │
  ├─ for each poems/<slug>.html (or just --only):
  │     ├─ parse: title (<h1>), palette (--poem-bg/-text/-accent),
  │     │         data-mood, share lines
  │     │           share lines = every <p class="… share-line …"> in order,
  │     │           else the first 2 <p> of .poem-text (skipping .waka-speaker),
  │     │           else the og:description text
  │     ├─ skip if og:image points at artwork (not the bookstore default
  │     │   and not assets/share/) ── log "kept artwork"
  │     ├─ hash = sha256(JSON of inputs + TEMPLATE_VERSION)[0:8]
  │     ├─ if og:image already ends in ?v=<hash> and the JPEG exists ──▶ skip ("fresh")
  │     ├─ fill tools/share-card.html → tmp/<slug>.html
  │     ├─ chrome --headless --window-size=1200,630 --screenshot
  │     │         --virtual-time-budget=5000  tmp/<slug>.html   (5 s lets web fonts load)
  │     │     ├─ poll every 250 ms until the PNG exists and its size is stable, then kill Chrome
  │     │     └─ no PNG after 30 s ──▶ record failure, continue with next poem
  │     ├─ sips -s format jpeg -s formatOptions 82 → assets/share/<slug>.jpg
  │     │     └─ > 300 KB ──▶ warn (WhatsApp may drop the large preview)
  │     └─ rewrite <head>: og:image, og:image:width/height/alt, twitter:image
  │
  └─ summary: rendered / fresh / kept artwork / failed. Exit 1 if any failed.
```

*Caption: each poem is independent. One failure does not stop the others, and a
re-run only renders what changed.*

The page rewrite happens **after** the JPEG is written. If the script dies
between the two, the page still points at the old hash. The next `--check` then
reports it stale, which is the safe direction. A page never points at an image
that doesn't exist.

## Flow 2 — CI deploy check

`build-content.mjs --check` already verifies `poems.json` and `sitemap.xml`. It
gains one step per poem page:

```text
read og:image
  ├─ artwork URL (not assets/share/)      ──▶ pass (ADR: artwork kept)
  ├─ assets/share/<slug>.jpg?v=<h>
  │     ├─ file missing                    ──▶ fail: "<slug>: card missing"
  │     ├─ h ≠ recomputed hash             ──▶ fail: "<slug>: card stale —
  │     │                                          run node tools/build-share-cards.mjs --only <slug>"
  │     └─ else                            ──▶ pass
  └─ still the bookstore default           ──▶ fail: "<slug>: no card yet"
```

The hash function and the share-line rule are **shared code**. Both scripts
import them from one small module (`tools/share-inputs.mjs`), so the check and
the generator can never disagree about what the inputs are.

## Flow 3 — a reader opens a mooded page

```text
HTML parsed ─▶ style.css applies [data-mood="sharad"] rules
            │     .divider-symbol: glyph hidden, peepal mask painted in --accent
            │     .poem-text::after: sunflower mask as end mark
            │     Devanagari glyphs: Tiro via the font-stack fallback (system font until loaded)
            ├─▶ scroll-reveal.js fades stanzas and dividers in   (unchanged)
            └─▶ bg-anim.js reads data-anim="leaves"              (unchanged)
```

Failure behaviour: if an ornament SVG fails to load, the mask has nothing to
show, so the divider is just its two hairlines with an empty gap. The ◆ is not
restored, but the layout does not break. If the font fails, the system
Devanagari fallback stays, which is today's behaviour. Under
`prefers-reduced-motion`, the existing scripts already skip animation, and the
ornaments are static.

## Flow 4 — someone shares the poem

```text
reader taps Share / pastes URL
  └─▶ app server GETs poems/tumhari-yaadein.html      (no JS)
        └─▶ reads og:title, og:description, og:image=…/assets/share/tumhari-yaadein.jpg?v=3fa9c2e1
              └─▶ GETs the JPEG ─▶ shows card: title + chosen lines on the poem's gradient
```

Retry and caching are outside our control. Apps cache by URL, and a new `?v=`
is the only lever we have (architecture open question 3).
