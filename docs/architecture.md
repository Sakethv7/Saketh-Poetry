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
