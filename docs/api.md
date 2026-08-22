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
