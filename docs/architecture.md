# Architecture — the bookcase

Scope: the `#poems` section of `index.html` (the bookcase), at every width. The
book reader modal, the individual poem pages under `poems/`, and the build/deploy
path are out of scope and unchanged. This document describes only the parts of
the system the change touches.

> Originally scoped to phones only. Extended to all widths by ADR-0005, which
> moves the header above the shelf as a full-width band — a change that only pays
> off if the fixed-height frame comes off with it. The measurements are in that
> ADR.

## Complexity tier

**Single static page, no build step.** The whole site is hand-written HTML plus
one shared stylesheet and a handful of inline IIFEs; GitHub Pages serves the
directory as-is. That tier is correct and this change does not raise it — no
framework, no bundler, no new dependency, no new file loaded at runtime. The
change is a set of CSS rules inside an existing media query plus one new DOM
element for the backdrop.

It is worth saying explicitly that the tier could have gone up here and should
not. The obvious "modern" answer to a long list of cards on a phone is
virtualised scrolling — render only the rows near the viewport, recycle nodes as
you go. That would be the right call at ten thousand poems. At seventy it buys
nothing: the entire shelf is already in the HTML the browser parsed, the cards
are static markup, and the scroll is native. Adding a virtualiser would add a
scroll listener, a measurement cache, and a class of bugs (blank rows on fast
flings, broken in-page search, broken deep links) in exchange for no measurable
gain. The shelf stays as plain document flow.

## What exists today

The bookcase is built as a **fixed-viewport panel**. `#poems` is exactly one
screen tall (`100svh`), `.poems-inner` fills it minus the footer bar, and
`.poems-grid` — the shelf itself — is a scroll container (`height: 100%;
overflow-y: auto`) that holds every card, every language divider, and every form
divider. The library photograph is a `background-image` on `#poems` with
`background-size: cover`, which works precisely because the element it covers is
one screen tall.

On a laptop this is the point of the design: you walk up to a bookcase that
fills the window, and you browse *within* it. The frame holds still while the
volumes move.

On a phone the same structure produces the failure you reported. Measured at
375×812:

| | desktop 1280×720 | phone 375×812 |
|---|---|---|
| shelf window height | 618px | **445px** |
| shelf content height | 11,081px | **11,082px** |
| fraction visible at once | 5.6% | **4.0%** |
| card rows visible | ~2.5 | **1.79** |
| card width | 230px | **144px** |

Two consequences follow from the 445px number. First, the shelf stops reading as
a piece of furniture and starts reading as a scrolling widget embedded in a
page — there is not enough of it on screen for the eye to complete the shape.
Second, the shelf is a **nested scroll container**: the page scrolls, and a
region inside the page also scrolls. On a touch screen that means every flick
near the shelf's top or bottom edge is ambiguous, and the browser resolves it by
either scrolling the page when you meant the shelf or trapping you in the shelf
when you meant the page. `overscroll-behavior: contain` suppresses the visible
rubber-band but does not remove the ambiguity.

The 144px card width is a downstream effect, not an independent bug. Because
vertical room is scarce, the two-up grid is the only way to get more than one
poem into the window — and at 375px, two-up means 144px columns, which is why
titles break to three lines and excerpts clamp to three.

```
TODAY (phone)                        PROPOSED (phone)

┌─────────────────┐ ─┐               ┌─────────────────┐ ─┐
│ hero / quote    │  │ page          │ hero / quote    │  │ page
└─────────────────┘  │ scroll        └─────────────────┘  │ scroll
┌─────────────────┐  │               ┌─────────────────┐  │
│ ┌─────────────┐ │  │               │ header (sticky) │  │
│ │ header      │ │  │               ├─────────────────┤  │
│ ├─────────────┤ │  │               │ ▓▓▓▓  ▓▓▓▓      │  │
│ │▓▓▓▓ ▓▓▓▓ ▲  │ │  │               │ ▓▓▓▓  ▓▓▓▓      │  │
│ │▓▓▓▓ ▓▓▓▓ │  │ │  │  ← 445px      │ ▓▓▓▓  ▓▓▓▓      │  │
│ │▓▓▓▓ ▓▓▓▓ │2nd│ │  │    window     │ ▓▓▓▓  ▓▓▓▓      │  │
│ │▓▓▓▓ ▓▓▓▓ ▼  │ │  │               │   … 11,082px …  │  │
│ └─────────────┘ │  │               │ ▓▓▓▓  ▓▓▓▓      │  │
│ footer bar      │  │               └─────────────────┘  │
└─────────────────┘ ─┘               │ footer          │  │
                                     └─────────────────┘ ─┘
   two scrollers, one nested            one scroller
   inside the other                     library photo pinned behind
```

*Left: the shelf is its own scroll region inside a page that also scrolls, and
it shows 4% of its contents. Right: the shelf becomes ordinary page content, so
there is one scroll gesture and the cards get the room they need.*

## What changes

**The shelf stops being a scroll container and becomes ordinary document flow, at
every width.** Three height constraints are released — `#poems`'s `100svh`,
`.poems-inner`'s `calc(100svh - 3.2rem)`, and `.poems-grid`'s `height: 100%` /
`overflow-y: auto` — and the section grows to whatever the seventy cards need.
The page's own scrollbar then does all the work.

**The header stops being a sidebar and becomes a band across the top.**
`.poems-inner` was a two-column grid, `minmax(230px, 320px)` of header beside the
shelf; it is now a plain block with the header stacked above. That hands the
bookcase the full width — 6 columns at 1440 and 5 at 1280, against 4 and 3
before. The filter bar moves out of the shelf and into that band so it stays
pinned with the search field (ADR-0006).

`#poems` also has to stop being `overflow: hidden`. An `overflow: hidden`
ancestor is a scroll container, and a sticky descendant resolves against the
nearest scroll container rather than the viewport — so both the backdrop and the
header would silently stop sticking. `overflow: clip` does the same visual job
without establishing one.

That single move creates one problem it must also solve. `background-size:
cover` on an element that is now ~12,000px tall would scale the library
photograph to absurdity — one corner of the bookshop stretched across the entire
section. So the photograph moves off `#poems` and onto a **sticky backdrop
element**: a first child of `#poems`, one viewport tall, `position: sticky; top:
0`, carrying the `image-set()` and the existing dark gradient scrim, sitting
behind the content at a lower stacking level. Sticky positioning pins it to the
top of the viewport while the section scrolls past, and — unlike a `fixed`
element — it stops on its own at the section boundaries, so the photo never
bleeds into the hero above or the footer below. (Why not `background-attachment:
fixed`, which is one line? See ADR-0002.)

With the shelf no longer competing for a fixed 445px, the header can be pinned
instead of scrolled away: `.library-header` becomes `position: sticky; top: 0`
on phones, keeping search and the fourteen filters reachable at any depth in a
scroll that is now twelve thousand pixels long. This is the piece that makes the
long scroll navigable rather than merely long.

One behaviour has to be added to the shelf script, and it exists only because of
this change. In the fixed layout the document height was constant, so filtering
could never move the reader. In flow layout, filtering seventy cards down to
twelve shortens the document by thousands of pixels, and a reader who was scrolled
deep gets clamped to the new bottom — the footer — rather than to the results they
just asked for. `render()` gains a single step that brings the top of the shelf
back into view when the visible count changes. That is the only script edit;
everything else in the IIFE, `layoutPlanks()` included, is untouched.

The grid itself keeps its two-up columns, its planks, its card styling, and its
lean angles. Nothing about how a volume *looks* changes; only the frame around
it does. Card `min-height` gets a modest increase now that vertical space is no
longer rationed, which is what stops titles and excerpts fighting each other for
the same 15.5rem.

A fourth, smaller item rides along because it is the same complaint on the same
screen: the opening section leaves a 184px dead band between the wrapped
two-row nav and the quote, so the first thing a phone visitor sees is mostly
empty. The nav collapses to a single row and the stage's vertical rhythm tightens.

## Components and boundaries

| Component | File | Role | Touched? |
|---|---|---|---|
| Opening / hero | `index.html` inline `<style>` | Full-screen quote stage | Spacing only |
| Section frame `#poems` | `index.html` inline `<style>` | Height, photo, gradient scrims | **Yes** |
| Backdrop | new element in `index.html` | Pinned library photograph | **New** |
| `.poems-inner` | `index.html` inline `<style>` | Sidebar grid → single block | **Yes** |
| `.library-header` | `css/style.css` + inline | Title, search, filter bar | **Yes** (band, sticky) |
| `.filter-bar` | markup move | Language/form filters | **Yes** (into the header) |
| `.is-hidden` rule | `index.html` inline `<style>` | Removes filtered volumes | **Yes** (specificity bug, ADR-0007) |
| `.poems-grid` | `index.html` inline `<style>` | The shelf; card grid + planks | **Yes** (flow) |
| `.poem-card` | `css/style.css` + inline | A volume | Sizing only |
| Filter/search IIFE | `index.html` ~L1454 | Show/hide cards, build filters | **Yes** (one addition) |
| `layoutPlanks()` | `index.html` ~L1541 | Absolute plank per card row | **No** (see below) |
| Book reader IIFE | `index.html` ~L1615 | Modal reader | **No** |

The boundary worth naming is the one between **CSS layout** and the **plank
script**, because that boundary is what makes this change cheap. `layoutPlanks()`
reads `card.offsetTop` and `card.offsetHeight` and positions absolutely-placed
`.shelf-plank` divs inside `.poems-grid`, which is `position: relative`. Those
offsets are measured against the grid's padding box and are completely
indifferent to whether the grid scrolls internally or flows down the page. So
the planks keep registering correctly with no script change at all. The
`ResizeObserver` on `.poems-grid` will now fire on content-height changes as well
as width changes, which is harmless — planks are absolutely positioned and
therefore cannot themselves change the grid's height, so there is no feedback
loop. This is asserted rather than assumed; see `logic_flow.md` for the
verification step.

## Deployment shape

Unchanged. `.github/workflows/deploy.yml` publishes the repository to GitHub
Pages on push to `main`. There is no build, so the change ships as edited HTML
and CSS. `css/style.css` is referenced as `style.css?v=10`; the query string is
the cache-buster and must be bumped if any rule lands in that file rather than
in the inline block.

## Open questions

1. **Two-up or one-up on the phone?** With the height constraint gone, one card
   per row becomes affordable and would give ~300px cards — enough for
   single-line titles and a real excerpt. It also makes the scroll roughly twice
   as long and, more importantly, a plank with a single book on it reads less
   like a shelf. The plan keeps two-up, which preserves the metaphor and the
   scroll length. This is a taste call and is the most likely thing to want
   revisiting after seeing it on a real handset.
2. **The immersive bookcase is gone from desktop too.** ADR-0005 traded it for
   width. If the framed, look-into-it quality turns out to be what made the page
   distinctive, the thing to try next is a hybrid: a `100svh` frame that the
   shelf scrolls *past* on the way in, rather than one it scrolls inside. That is
   new design work, not a revert.
3. **The sticky header costs 152–234px** depending on width — about 20% of a
   laptop viewport and 29% of a phone's. ADR-0003 lists the collapsed variant as
   the follow-up; this is the number that decides whether it is needed.
4. **`.is-hidden` still depends on id specificity** (ADR-0007). It works, and the
   next rule scoped through `#poems` with two classes will break it again.
5. **`CONCEPTS.md` overlaps this document.** Your global rule says
   `architecture.md` supersedes `CONCEPTS.md` and that the two should not drift.
   `CONCEPTS.md` covers the whole site — per-poem palettes, the art layer, the
   deployment story — and folding all of it in is the repo-wide backfill your
   rule says is a separate task. This document is scoped to the shelf and does
   not restate it. Flagging so it is a decision and not an oversight.
6. **`CONCEPTS.md` claims mobile-first responsive design** (§"Mobile-First
   Responsive Design"). The shelf as built is desktop-first with a phone
   override, which is the opposite. The doc is describing an intention rather
   than the code. Not resolved here; noted so neither is silently trusted.

## Homepage generative identity — local prototype, not shipped

This addition is limited to the opening section of `index.html`. It does not
change the shelf, poem cards, metadata, filters, search, individual poem pages,
or the `#bookReader` dialog. A local prototype now exercises this boundary; it
has not been committed, deployed, or accepted as the final art direction.

The proposed opening adds one presentational p5.brush canvas behind the existing
title/quotation layer. Its lifecycle is deliberately finite:

```text
blank paper -> opening brush scene -> title and quotation -> settled painting
                                                     |
                                                     v
                                             existing #poems shelf
```

The scene uses an original Indic ink-and-watercolor vocabulary: absorbent paper,
restrained mineral/earth pigments, calligraphic line, negative space, and motifs
drawn from the anthology's recurring weather, streets, gardens, thresholds, and
journeys. It must not reproduce Surya's hibiscus composition or import a generic
"Indian" ornament layer.

### Component boundary

| Component | Proposed responsibility | Boundary |
|---|---|---|
| `.opening` | Owns the identity experience and clipping region | Only runtime allowed to initialize the generative canvas |
| `.opening-art` | Hosts one canvas behind the existing copy | Presentational, non-interactive, `aria-hidden` |
| Opening copy | Preserves readable title and quotation content | Remains semantic DOM, never painted into canvas |
| `#poems` | Existing bookshelf, cards, filters, and metadata | No structural or behavioral edits |
| `#bookReader` | Existing shared reading surface | No structural or behavioral edits |
| `poems/*.html` | Individual poem pages | No p5.brush import or initialization |
| `js/bg-anim.js` | Existing subtle `data-anim` atmospheres | Retained; not replaced by the homepage identity |

### Runtime and dependency shape

The preferred implementation is one small, handcrafted scene module loaded by
the homepage only, plus p5 and p5.brush pinned to reviewed versions. There is no
model training, Qwen fine-tuning, RL loop, server, build pipeline, or generated
asset service. The dependency must fail open: if either library or the scene
throws, the present CSS paper background and semantic opening copy remain usable.

The canvas animates once for a target of 4–6 seconds, calls `noLoop()` after the
settled frame, and does not restart on scroll. A resize may redraw the settled
composition deterministically at the new dimensions; it must not replay the
entrance. Under `prefers-reduced-motion: reduce`, the opening renders a final
static composition immediately, with no stroke-by-stroke reveal.

### Performance and accessibility budgets

- The canvas never captures pointer or keyboard input.
- Semantic title, quotation, nav, and scroll cue stay in HTML above the canvas.
- The draw loop ends after settling; there is no permanent homepage animation.
- The scene is responsive and may simplify its stroke count on narrow screens.
- Failure, disabled JavaScript, or reduced motion preserves a complete opening.
- Implementation approval requires checking layout, contrast, long tasks, and
  reader/shelf regressions at mobile and desktop widths.

## Poem pages — per-poem mood and link previews (implemented 2026-09-25)

Scope: the individual pages under `poems/`, their `<head>` share metadata, one
new build script under `tools/`, and a new check inside the existing
`tools/build-content.mjs --check`. The shelf, the `#bookReader` dialog and the
homepage opening are out of scope and unchanged.

### Why this change exists

Two gaps showed up while revising तुम्हारी यादें.

**Every shared link looks the same.** When a URL is pasted into WhatsApp,
iMessage or X, the app fetches the page and reads its **Open Graph tags**. These
are `<meta property="og:...">` lines in the `<head>` that name a title,
a description and an image. The app shows that image as the **link preview**, the
card that appears above the message. 62 of the 70 poem pages point `og:image`
at the same bookstore photograph. So every poem is shared as the same card, and
the preview never carries a line of the poem itself.

**Rich poems have no identity of their own.** Every page already sets its own
three colours inline (`--poem-bg`, `--poem-text`, `--poem-accent`) and picks one
of eight background animations through `<body data-anim>`. That is a palette,
not a mood. Nothing on the page shows the peepal tree, the falling leaves or the
sunflowers the poem is built on. The divider is the same ◆ on every page. The
secondary text on तुम्हारी यादें (`#C9B8A8` on the olive gradient) measures
between 2.7:1 and 4.5:1 contrast across the gradient. Small text needs 4.5:1 to
read comfortably, so most of the page falls short.

### Complexity tier

**Static site plus two local build scripts. No change in tier.** GitHub Pages
still serves the directory as-is. What is new is one Node script that runs on
the author's Mac, like `build-content.mjs` already does, and writes image files
that get committed. There is no server, no runtime image generation and no npm
dependency.

The tier could have gone up and should not. The "modern" answer to per-page
preview images is a **dynamic OG image service**: a server function that renders
the card on request (Vercel OG is the common one). That needs a server this site
does not have. Its renderer, Satori, also cannot shape Devanagari correctly:
conjuncts like `म्ह` in तुम्हारी come out as broken separate letters. With 70
poems that change a few times a year, rendering once and committing the files
costs nothing at runtime and is always correct.

### Two parts

**Part A — link preview cards, all 70 poems.** Each poem gets a 1200×630 JPEG at
`assets/share/<slug>.jpg`. The card shows the poem's title, two to four chosen
lines, the "Wandering Poet" mark, and the poem's own gradient and accent colour.
Poems with a mood (Part B) also show their ornament. The author chooses the
lines by adding the class `share-line` to them. Without that, the poem's
first two lines are used. Lines over 110 characters, as in the prose-paragraph
poems, are cut at a word boundary with "…".

The cards are rendered by **headless Chrome**, meaning Chrome running with no
window, driven from the command line. The script writes a small HTML card per
poem using the site's own fonts and colours, and Chrome screenshots it. This is
the same engine that renders the site, so Devanagari shaping, gradients and
fonts match what readers see. macOS's built-in `sips` tool converts the PNG
screenshot to a JPEG, which is smaller.

**Part B — mood, pilot on तुम्हारी यादें only.** A mood is a named bundle chosen
with `<body data-mood="...">`. It consists of:

| Piece | तुम्हारी यादें (mood `sharad`) | Where it lives |
|---|---|---|
| Palette | Deeper umber → ochre gradient, sunflower-gold accent, secondary text raised to ≥ 4.5:1 | Existing inline `:root` block on the page |
| Atmosphere | `data-anim="leaves"` instead of `fireflies`, matching झड़ते पत्ते | Existing `js/bg-anim.js`, no code change |
| Divider ornament | A peepal leaf in place of ◆ | `assets/ornaments/peepal-leaf.svg`, applied by CSS |
| End mark | One sunflower after the last stanza, closing on सूरजमुखी | `assets/ornaments/sunflower.svg`, applied by CSS |
| Devanagari type | Tiro Devanagari Hindi, and letter-spacing removed from `.hindi-text` because it breaks the headline stroke joining the letters | Added as the Devanagari fallback in `--font-serif` / `--font-display` (ADR-0012) |

The ornaments are applied with a CSS **mask**. The SVG file acts as a stencil,
and the element's background colour shows through it. So one single-colour SVG
takes on each poem's `--accent` colour without editing the file. The poem's
markup does not change at all: `.divider-symbol` stays in the HTML, and under
`[data-mood]` the CSS hides the ◆ glyph and paints the ornament in its place.

Other poems get moods only after you have seen the pilot. The candidates are the
18 full-scene and 18 light-motif poems listed in `ART_DIRECTION.md`.

### Data flow

```text
 poems/<slug>.html ──────────────┐
   title, .share-line lines,     │
   --poem-bg/-text/-accent,      │   node tools/build-share-cards.mjs   (author's Mac)
   data-mood                     ├──────────────────────────────────────────────┐
                                 │                                              │
                                 │   1. build card HTML in a temp dir           │
                                 │   2. headless Chrome → PNG 1200×630          │
                                 │   3. sips → assets/share/<slug>.jpg          │
                                 │   4. rewrite og:image …?v=<hash> in the page │
                                 │                                              ▼
                                 │                                     committed to git
                                 ▼
             node tools/build-content.mjs --check     (CI, on every push)
             fails the deploy if a page's og:image hash
             no longer matches its current title/lines/colours/mood
```

*Caption: the card is made once on the author's machine and committed. CI never
runs Chrome. It only recomputes a fingerprint of what the card should show and
refuses to deploy if the committed card is out of date.*

### Components and boundaries

| Component | Responsibility | Boundary |
|---|---|---|
| `tools/build-share-cards.mjs` | Reads poem pages, renders cards, writes JPEGs, rewrites `og:image` tags | Local only. Needs Chrome and macOS `sips`. Never runs in CI |
| `tools/share-card.html` | The card template: layout, fonts, placeholders | Read only by the script. Never served to readers |
| `tools/build-content.mjs --check` | Gains one check: card fingerprint matches | Must stay dependency-free so CI can run it with bare Node |
| `assets/share/*.jpg` | 70 committed preview images | Referenced only by `<meta>` tags, never by page layout |
| `assets/ornaments/*.svg` | Single-colour mood ornaments | Used as CSS masks only |
| `css/style.css` | Mood rules under `[data-mood="…"]`, Devanagari font fallback | Mood rules apply only under `[data-mood]`. The font fallback only affects Devanagari characters, so Latin text is unchanged everywhere |
| `#bookReader`, shelf | — | Untouched. The reader has no `data-mood`, so ornaments never appear there |

### Deployment shape

Unchanged: push to `main` → `deploy.yml` → GitHub Pages. The one new failure
mode is intentional. If a poem's title, share lines, colours or mood change and
the cards were not regenerated, `--check` fails the deploy with the slug and the
command to run. `style.css` changes, so its `?v=` goes from 12 to 13 on all 71
pages.

Expected size: about 70–150 KB per card, or roughly 5–10 MB added to the repo
once. That is well inside GitHub Pages' limits and below WhatsApp's preview
image ceiling (keep each card under 300 KB).

### Open questions (poem pages)

1. **Illustrated poems.** Eight poems already point `og:image` at their own
   artwork. The plan keeps that artwork and skips them, because a painting is a
   stronger preview than a text card. The alternative is a card with the art as
   its background and the verse on top. That is a taste call, and I recommend
   deciding after seeing a few text cards.
2. **Font choice for Devanagari.** Tiro Devanagari Hindi is literary and pairs
   well with Lora, but it has only one weight. Noto Serif Devanagari has more
   weights and heavier files. I'd like to show both on stanza I before
   committing.
3. **Already-sent links keep the old preview.** WhatsApp and iMessage store the
   preview inside the message when it is sent. The new cards appear only on new
   shares. WhatsApp also caches a URL's preview for a while, so the first new
   share of a poem may still show the bookstore photo. The `?v=<hash>` on the
   image URL shortens this but cannot force it.
4. **Chrome and macOS coupling.** Generation needs Chrome at its standard macOS
   path (overridable with `CHROME_PATH`) and `sips`. On any other machine the
   script stops with a clear message. This is acceptable for a single-author
   site and is recorded in ADR-0009.
5. **`CONCEPTS.md` still describes per-poem palettes** as the whole of per-poem
   styling. It will be one step further out of date after this change. Folding
   it into this document remains the separate backfill task noted above.
