# Interface contracts — the phone shelf

A static page has no HTTP API, but it has interfaces all the same, and this
change touches three of them: the **markup contract** the shelf script depends
on, the **CSS layout contract** between the section's boxes, and the
**breakpoint contract** that decides which layout is in force. Breaking any of
them breaks the shelf silently — there is no type checker here — so they are
written down.

Anything not listed is unchanged by this work.

---

## 1. Markup contract — what the shelf script requires

The IIFE at `index.html` ~L1454 reads the DOM and will bail or misbehave if this
shape changes. It is the closest thing this page has to a function signature.

### Required elements

| Selector | Cardinality | Consumed by | Invariant |
|---|---|---|---|
| `.poems-grid` | exactly 1 | `grid` | Must be `position: relative` — it is the offset parent every plank is positioned against. **Non-negotiable in both layouts.** |
| `#filterBar` | exactly 1 | `bar` | Emptied and repopulated with `.filter-btn` on load |
| `#poemSearch` | 0 or 1 | `input` | Optional; absent means no search, not an error |
| `#searchMeta` | exactly 1 | `meta` | Receives the count string |
| `#poems` | exactly 1 | `poemsSection` | Receives `.is-searching` |
| `#poemCount` | 0 or 1 | hero nav | Receives `"<n> poems"` |

If `.poems-grid` or `#filterBar` is missing the IIFE returns early and the shelf
renders unfiltered — degraded, not broken. If `.poems-grid` loses `position:
relative`, planks position against the viewport instead and scatter across the
page; there is no guard for this.

### Children of `.poems-grid`

Order is significant. The script walks the children once, in order, carrying
"current language" and "current form" forward; a card inherits whichever
dividers most recently preceded it.

| Class | Required descendants | Meaning |
|---|---|---|
| `.lang-divider` | `.lang-name` (text) | Opens a language section; resets current form to `''` |
| `.form-divider` | `.form-label` (text) | Opens a form section within the current language |
| `.poem-card` | `h2`, `.poem-category`, `p`; `href` attribute | A volume. `href` is the key into `poems.json` |
| `.shelf-plank` | none | **Script-owned.** Injected, positioned, and removed by `layoutPlanks()`. Never author these by hand. |

`#filterBar` used to sit here too and now lives in `.library-header`. The script
reaches it by id and never walks up from `.poems-grid`, so the move is invisible
to both the filter logic and `layoutPlanks()`.

### Data attributes written by the script

Read-only from the perspective of CSS and markup; do not author them.

| Attribute | On | Value |
|---|---|---|
| `data-lang` | `.poem-card` | Current `.lang-name` text at walk time |
| `data-form` | `.poem-card` | Current `.form-label` text at walk time |
| `data-searchText` | `.poem-card` | `"<lang> <card text>"`, lowercased |
| `data-fullText` | `.poem-card` | Full poem text, lowercased; set only after `poems.json` resolves |

### State classes

| Class | Applied to | By | Meaning |
|---|---|---|---|
| `.is-hidden` | cards, dividers | script | Filtered out. **CSS must render this as `display: none`**, and the rule **must outrank `#poems .poem-card`** — one id plus one class. It is written as `#poems .poem-card.is-hidden` for exactly that reason; a class-only selector loses and the volume stays on the shelf (ADR-0007). |
| `.is-searching` | `#poems` | script | A query is active |
| `.active` | `.filter-btn` | script | Current filter |

### New element introduced by this change

| Selector | Position | Contract |
|---|---|---|
| `.library-backdrop` | first child of `#poems`, before `.poems-inner` | Presentational only. Carries no text, must be `aria-hidden="true"`, must not receive pointer events, and must paint below `.poems-inner`. Owns the `image-set()` for the library photograph — **the single source of truth for that image**; `#poems` must not also declare it. |

---

## 2. CSS layout contract

The layout invariants each box must satisfy, per breakpoint. The right-hand
column is what changes.

There is now **one layout that reflows**, not two behind a breakpoint. The 760px
query is reduced to card sizing and stacking the header band.

| Box | Before | After (all widths) |
|---|---|---|
| `#poems` | `height: 100svh`, `overflow: hidden`, owns the photo | `min-height: 100svh`, `overflow: clip`, no photo |
| `.library-backdrop` | — | `height: 100svh`, `position: sticky`, `margin-bottom: -100svh`, `z-index: -3`, owns the photo |
| `.poems-inner` | `display: grid` (sidebar + shelf), `height: calc(100svh - 3.2rem)` | `display: block`, `height: auto` |
| `.library-header` | sidebar column, `sticky; top: 1.5rem` | full-width band, `sticky; top: 0`, `z-index: 3` |
| `.filter-bar` | child of `.poems-grid` | child of `.library-header` (grid area `filters`) |
| `.poems-grid` | `grid-column: 2`, `height: 100%`, `overflow-y: auto` | full width, `height: auto`, `overflow: visible` |
| `.site-footer` | `height: 3.2rem` | `height: auto` |

Only these still vary by breakpoint (≤760px): the header's `grid-template-areas`
collapse to one column, `h2` drops to `1.75rem`, `.search-meta` left-aligns,
`.top-nav` is forced back to `row`, and cards go two-up with a 3-line clamp.

Two invariants hold across both columns and must not be broken by any future
edit:

- **`.poems-grid` is `position: relative`.** See §1.
- **`#poems` establishes no containing block for fixed/sticky descendants** —
  no `transform`, `filter`, `perspective`, `contain: paint`, or
  `will-change: transform` on it or on `.poems-inner`. Any of those would trap
  `.library-backdrop`'s sticky behaviour and re-break the photograph. Note that
  `#poems` already carries `isolation: isolate`, which is safe; it creates a
  stacking context, not a containing block.
- **`#poems` is never a scroll container.** `overflow: clip`, never `hidden`,
  `auto`, or `scroll`. A sticky element resolves against the nearest scroll
  container, so any of those three would leave the backdrop and the header
  sticking to a box that never scrolls — which looks exactly like sticky being
  ignored. `clip` clips without creating a scrollport.

### Stacking order within `#poems`

Existing z-indices constrain where the backdrop can sit. `#poems::before` is
`z-index: -2` and `::after` is `z-index: -1`; `.poems-inner` is `z-index: 1`.
The backdrop must paint below `.poems-inner` and above nothing in particular; it
takes a negative index below the scrims or sits at `z-index: 0` above them,
whichever preserves the current colour of the gradients over the photo. This is
the one detail that must be checked visually rather than reasoned about, since
the scrims are tuned against the photograph.

---

## 3. Breakpoint contract

| Breakpoint | Governs | Defined in |
|---|---|---|
| 1000px | Filter bar wraps → single swipeable row | `index.html` inline |
| **760px** | **Header band stacks; cards go two-up** | `index.html` inline |
| 768px | Poem-page art backgrounds, generic card grid, **generic `nav`** | `css/style.css` |

The flow layout is no longer behind a breakpoint — it applies at all widths — so
760px now only stacks the header and sizes the cards.

**Source order matters at 760px.** The mobile `.library-header` override has the
same specificity as the desktop `.library-header` rule, so it must appear *after*
it in the file. It lives in the second 760px block near the end of the inline
stylesheet, not the first one; putting it in the first block silently loses and
the title overlaps the search field.

**The 768px block in `css/style.css` contains a bare `nav { flex-direction:
column }`** intended for the poem pages. `.top-nav` on the homepage is a `<nav>`,
so it inherited that and broke the masthead into two rows, costing 34px at the
top of a hero that is already mostly air.

The fix is an explicit `flex-direction: row` on the **base** `.top-nav` rule, not
an override inside a media query. `.top-nav` (one class) outranks `nav` (one
element) at every width, so the declaration holds everywhere. Putting it in the
760px block instead would have left 761–768px uncovered — an 8px window where the
generic rule wins by default and the masthead stacks. The generic rule is left
alone because the poem pages still depend on it.

---

## 4. Cache-busting contract

`index.html` loads `css/style.css?v=10`. If any rule in this change lands in
`css/style.css` rather than the inline `<style>` block, **the version must be
bumped** or returning visitors keep the old stylesheet against new markup — which
here means the old fixed-height shelf with the new backdrop element inside it.
The plan puts every shelf rule in the inline block, where the constraints it
overrides already live, so no bump is expected. Stated so that it is a checked
condition rather than a lucky one.

## 5. Homepage generative-art interface — proposed

This is an internal browser interface, not a network API. Names are provisional
until implementation review, but the boundary is fixed.

### Markup contract

| Selector | Cardinality | Contract |
|---|---:|---|
| `.opening` | 1 on homepage | Sole lifecycle owner for generative art |
| `.opening-art` | 0 or 1 | Canvas host; `aria-hidden="true"`, non-focusable, no pointer events |
| `.quote-stage` | 1 | Existing semantic title/quotation layer; paints above canvas |
| `#poems` | 1 | Must not be queried, mutated, resized, or restyled by the scene |
| `#bookReader` | 1 | Must not be queried, mutated, or receive scene events |

Individual `poems/*.html` files must not contain `.opening-art` and must not load
the p5.brush scene module. Their existing `body[data-anim]` contract is unchanged.

### Scene-module contract

Proposed constructor:

```js
createOpeningArtwork({ host, reducedMotion, seed })
```

| Input | Type | Rule |
|---|---|---|
| `host` | `HTMLElement` | Must be the `.opening-art` element inside `.opening` |
| `reducedMotion` | `boolean` | `true` renders the settled frame immediately |
| `seed` | fixed number/string | Produces a stable composition across redraws |

The returned controller, if one is needed, exposes only `resize()` and
`destroy()`. It exposes no shelf, filter, card, poem, or reader operations.
Initialization failure must be caught at the call site and must leave the host
empty rather than blocking the page.

### Visual output contract

- Canvas dimensions follow `.opening`; CSS owns display size.
- Canvas is decorative and contains no title, quotation, navigation, or labels.
- Normal motion completes and stops within 4–6 seconds.
- Reduced motion draws the same final visual state without temporal reveal.
- Responsive redraws use the same seed and preserve the composition's hierarchy.
- No storage, cookies, analytics events, network generation calls, audio, or
  hardware/GPU feature assumptions are introduced.

### Loading contract

Libraries and the scene module load on `index.html` only, using pinned reviewed
versions or vendored files. They must not delay semantic opening content. If
external delivery is chosen during implementation, integrity/cross-origin and
offline failure behavior require explicit review; vendoring is the safer default
for this static GitHub Pages site.

---

# Interface contracts — poem pages: mood and link previews

Four interfaces: the **poem page markup** that both scripts read, the **meta
tags** that preview fetchers read, the **CLI** of the new script, and the
**mood CSS contract**. Anything not listed is unchanged.

```text
poems/<slug>.html ──(markup contract §1)──▶ share-inputs.mjs ──▶ build-share-cards.mjs ──▶ assets/share/<slug>.jpg
        ▲                                         │                                              │
        └──────────(meta contract §2, written)────┴──▶ build-content.mjs --check (reads §2)      │
                                                                                                 ▼
                                                                        chat app preview fetcher (reads §2)
```

*Caption: the poem page is both the input and, for its `<head>`, an output. The
shared module is the one place that defines "what goes on the card".*

## 1. Poem page markup contract (inputs)

| Source | Required | Rule |
|---|---|---|
| `<h1>` inside `.poem-metadata` | yes | Card title. Inner text, entities decoded |
| `:root { --poem-bg; --poem-text; --poem-accent }` in the inline `<style>` | yes (all 70 have them) | Copied verbatim into the card. `--poem-bg` may be a gradient |
| `<body data-mood="…">` | no | Must name a mood defined in §4. Unknown name → the generator exits 1 |
| `<p class="… share-line …">` | no | 1–4 lines, in document order. More than 4 → exit 1 with the slug |
| first two `<p>` of `.poem-text`, skipping `.waka-speaker` | fallback | Used when there are no `share-line`s. Works for stanzas, ghazal couplets and waka alike |

Invariant: adding `share-line` or `data-mood` must not change what
`build-content.mjs` extracts into `poems.json` other than the class attribute
itself. The reader ignores both.

## 2. Meta tag contract (outputs, written by the generator)

```html
<meta property="og:image"        content="https://sakethv7.github.io/Saketh-Poetry/assets/share/<slug>.jpg?v=<hash8>">
<meta property="og:image:width"  content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt"    content="<title> — <first share line>">
<meta name="twitter:image"       content="<same URL as og:image>">
```

- `<hash8>`: the first 8 lowercase hex characters of
  `sha256(JSON.stringify({ title, lines, bg, text, accent, mood, v: TEMPLATE_VERSION }))`.
  Keys are in that fixed order. `mood` is `null` when absent.
- URLs are absolute. Preview fetchers do not resolve relative `og:image`.
- Pages whose `og:image` points at artwork outside `assets/share/` are never
  rewritten.
- Existing tags (`og:title`, `og:description`, `og:url`, `twitter:card`) are
  left untouched.

## 3. CLI — `tools/build-share-cards.mjs`

```text
node tools/build-share-cards.mjs              # render every stale card
node tools/build-share-cards.mjs --only <slug>
node tools/build-share-cards.mjs --force      # re-render even fresh cards
```

| Env | Default |
|---|---|
| `CHROME_PATH` | `/Applications/Google Chrome.app/Contents/MacOS/Google Chrome` |

| Exit | Meaning |
|---|---|
| 0 | All cards rendered or already fresh |
| 1 | One or more poems failed (listed), or invalid input (unknown mood, > 4 share lines) |
| 2 | Environment: Chrome or `sips` not found |

Card display rule: any line longer than 110 characters is cut at the last word
boundary before that and ends in "…". The fingerprint hashes the full lines, so
clipping is a template concern covered by `TEMPLATE_VERSION`.

Chrome in headless mode writes the screenshot but often never exits. The
script waits until the PNG exists and its size stops changing, then kills
Chrome itself. It gives up after 30 s per card.

Output: one line per poem (`rendered` / `fresh` / `kept artwork` / `FAILED:
<reason>`), then totals. Plain text, no colour codes.

`tools/share-inputs.mjs` exports two functions, used by both scripts:

```js
readShareInputs(html: string, slug: string)
  -> { title, lines: string[], bg, text, accent, mood: string | null, artworkImage: string | null }
cardHash(inputs) -> string   // 8 hex chars, per §2
```

`--check` failures print `<slug>: card missing | card stale | no card yet` and
the exact regenerate command. The exit code stays 1, as it is today.

## 4. Mood CSS contract

A mood is defined only in `css/style.css`:

```css
[data-mood="sharad"] {
  --ornament-divider: url(../assets/ornaments/peepal-leaf.svg);
  --ornament-end:     url(../assets/ornaments/sunflower.svg);
}
```

| Rule | Invariant |
|---|---|
| `[data-mood] .divider-symbol` | Glyph hidden (`color: transparent`), box ≈ 1.5em square, `background: var(--accent)`, `mask: var(--ornament-divider) center/contain no-repeat` |
| `[data-mood] .poem-text::after` | End mark, same mask technique, only if `--ornament-end` is set |
| Ornament SVGs | Single-colour silhouettes on a transparent background, a square `viewBox`, no embedded text, under 4 KB each |
| Unmooded pages | No selector here may match a page without `data-mood`. Checked by diffing a screenshot of one unmooded poem before and after |

Every edit to these rules bumps `style.css?v=` on all 71 pages.

## 5. Accessibility contract

- Ornaments are CSS-only and invisible to screen readers. No new markup, so no
  new `aria-*` is needed.
- Mood palettes must give `--text-secondary` at least 4.5:1 and `--poem-text`
  at least 7:1 against every stop of `--poem-bg`. This is verified with a
  contrast calculation for each gradient stop, not by eye.
- `og:image:alt` gives the card a text alternative in apps that expose it.

## Rollout changes (ADR-0013, ADR-0014)

| Contract | Before | After |
|---|---|---|
| Committed `og:image` | `…/assets/share/<slug>.jpg?v=<hash8>` | `…/assets/share/<slug>.jpg` (no query). The deploy adds `?v=` |
| `assets/share/` | committed | in `.gitignore`, created at deploy |
| `build-content.mjs --check` | poems.json, sitemap.xml, cards | poems.json and sitemap.xml only |
| `build-share-cards.mjs` exit codes | 0 / 1 failures / 2 no Chrome or sips | always 0 unless inputs are invalid (unknown mood, > 4 share lines), which is 1. Render failures are warnings. `sips` is no longer used |
| Flags | `--only`, `--force` | `--only` kept. `--force` removed, since every run renders everything. New `--stamp`: also rewrite each page's `og:image` block, which only the deploy uses |
| Runtime | Node ≥ 18, macOS | Node ≥ 22 (built-in `WebSocket`), macOS or Linux |
| Moods defined | `sharad` | plus `barish`, `patjhad`, `bagicha`, `chandni`, `samundar`, `sheher`, `syahi`, each with `--ornament-divider` and `--ornament-end` |

The ornament SVG rules in §4 are unchanged. All 16 files live in
`assets/ornaments/`, are single-colour and are under 2.5 KB.
