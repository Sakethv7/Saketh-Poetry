# Architecture Decision Records — the phone shelf

Numbered decisions behind the change described in `architecture.md`. Each one
names what was given up; a decision with no listed downside has not been thought
through yet.

---

## ADR-0001 — The shelf flows down the page instead of scrolling inside a fixed frame

> **Amended by ADR-0005.** Originally scoped to phones only (≤760px). ADR-0005
> extends it to every width, which removes the "two structurally different
> layouts" consequence listed below.

### Context

`#poems` is one viewport tall and `.poems-grid` scrolls inside it. Measured on a
375×812 phone, that gives a 445px window onto 11,082px of shelf — 4% visible,
about 1.79 card rows — nested inside a page that also scrolls. Two problems come
out of this. The visual one: 445px is not enough of a bookcase for the eye to
read it as furniture, so the centrepiece of the design degrades into a scrolling
widget. The interaction one: two nested scroll regions on a touch screen make
every flick near the shelf's edges ambiguous, and the browser guesses.

The desktop version does not have this problem because 618px and three columns
is enough to read as a shelf, and a mouse wheel over a scroll region is
unambiguous in a way a thumb is not.

### Options

**A. Keep the fixed frame, tune it.** One card per row, taller shelf window,
reclaim the hero's dead space so the shelf starts higher. Perhaps 550px of
window instead of 445px.

**B. Release the height constraint below 760px** so `#poems` grows to its
content and the page's own scrollbar drives the shelf.

**C. Redesign the phone shelf as its own thing** — horizontally swipeable
shelves per language, or a compact spine list.

### Decision

**B.** The nested scroller is the actual defect, and A does not remove it — it
makes the trap slightly roomier while leaving the edge ambiguity exactly where it
is. A phone browser already gives you a first-class, hardware-accelerated,
momentum-scrolling viewport with a scroll indicator the user understands; the
fixed frame is a second, worse copy of it laid on top. C is real design work
against a problem that B may well dissolve, and it discards the shelf metaphor
that the rest of the art direction is built on.

B is also the smallest change of the three. It deletes constraints rather than
adding mechanism: three height declarations and one `overflow-y` come out inside
an existing media query.

### Consequences

Given up:

- **The bookcase-as-object framing on phones.** On desktop you look *at* a
  bookcase; on a phone you will now scroll *through* one. The metaphor shifts
  from furniture to a long shelf you walk along. This is a genuine loss of the
  thing that makes the desktop page distinctive, accepted because the 445px
  version was not delivering that framing anyway.
- **A twelve-thousand-pixel page scroll.** The scrollbar becomes a hairline and
  "get me back to the top" becomes a real need. ADR-0003 (sticky header) is the
  mitigation, and it is a mitigation, not a cure.
- **Divergence between phone and desktop layout models.** Two structurally
  different layouts behind one breakpoint is more to hold in your head than one
  layout that reflows, and a future change to the shelf has to be checked on
  both sides of 760px.

Gained: one scroll gesture; the full seventy-poem shelf reachable by the
browser's own scroll; vertical room freed so cards can be sized for legibility
rather than for fitting inside a 445px window; native find-in-page and
deep-link-to-card scrolling start working on phones, since the target is no
longer inside a nested overflow region.

---

## ADR-0002 — The library photograph moves to a sticky backdrop element, not `background-attachment: fixed`

### Context

The photograph is a `background-image` on `#poems` with `background-size: cover`.
That composes correctly only because `#poems` is one screen tall. Once ADR-0001
lets the section grow to ~12,000px, `cover` scales the image to fill that box —
the shot of the Delhi bookshop becomes a hugely magnified fragment of itself. The
photo needs to stay viewport-sized while the content scrolls past it.

### Options

**A. `background-attachment: fixed` on `#poems`.** One declaration. The
background paints against the viewport instead of the element.

**B. A sticky backdrop element** — a first child of `#poems`, `height: 100svh`,
`position: sticky; top: 0`, below the content in stacking order, carrying the
`image-set()` and the dark scrim.

**C. Drop the photo below the first viewport** and let the shelf sit on the flat
gradient that `#poems::before` already paints.

### Decision

**B.** A is the tempting one-liner and it does not work where it matters: iOS
Safari has never honoured `background-attachment: fixed` and silently treats it
as `scroll`, which lands us back on the stretched-`cover` bug on exactly the
devices this change is for. Android Chrome does honour it, at the cost of
repainting a full-screen image every frame of the scroll. C is cheap and safe but
throws away the illustrated library, which `ART_DIRECTION.md` treats as the
homepage's identity.

Sticky is the right primitive rather than `position: fixed` because a sticky
element is laid out inside its container and therefore stops at the container's
edges on its own. A fixed backdrop would need explicit hiding when `#poems`
leaves the viewport, which means a scroll listener or an `IntersectionObserver` —
mechanism, to do what one keyword already does.

### Consequences

Given up:

- **A new DOM element in the markup for a purely presentational job.** A
  pseudo-element cannot be used here: `::before` and `::after` on `#poems` are
  already taken by the two gradient scrims, and a sticky pseudo-element would
  still be positioned relative to the same box.
- **A second definition of the photograph.** The `image-set()` with its WebP and
  JPEG branches — the thing commit `aee10a3` was about — now lives on the
  backdrop rather than on `#poems`. If it is moved rather than duplicated, there
  is one source of truth; if it is duplicated, phones and desktops will drift.
  The plan moves it and points desktop at the same element.
- **The parallax is gone.** With the photo pinned and the shelf sliding over it,
  the backdrop no longer moves relative to the content. Some will read that as
  calmer, some as flatter.

---

## ADR-0003 — The library header becomes sticky on phones

### Context

ADR-0001 replaces a 445px window with a ~12,000px page scroll. In the old layout
search and the fourteen filters were permanently on screen beside (or above) the
shelf, because the shelf could not scroll away from them. In flow layout they
scroll off after the first screen, and a reader forty poems deep has no way back
to them but a long flick.

### Options

**A. Let the header scroll away.** Simplest; matches how an ordinary article
behaves.

**B. `position: sticky; top: 0` on `.library-header`,** keeping the kicker,
heading, search field, and filter row pinned.

**C. Sticky, but collapsed** — pin only the search field and filter row after
the heading scrolls past, so less vertical space is spent.

### Decision

**B**, for now. A makes the filters ornamental on the device where they matter
most: filtering is how you avoid the twelve-thousand-pixel scroll, so burying the
control at the top of it is self-defeating. C is the better end state and is
strictly more work — it needs either a scroll listener or a sentinel element plus
an `IntersectionObserver`, which is new mechanism this change does not otherwise
need. B first; if the pinned header eats too much of the screen in practice, C is
the follow-up.

### Consequences

Given up:

- **Roughly 246px of the 812px screen**, permanently, once the header is pinned.
  That is 30% of the viewport spent on chrome, and it is the main reason C exists
  as a follow-up.
- **A backdrop-filtered element pinned during scroll.** `.library-header` carries
  `backdrop-filter: blur(7px)`; blurring a moving backdrop every frame is one of
  the more expensive things to ask a phone GPU for. Needs watching on a real
  device, not just in a desktop browser's device emulation.
- **A sticky element overlapping sticky planks' visual rhythm.** The header will
  cover the top of whatever card row is passing under it. Acceptable — that is
  what sticky headers do — but it means the top card row is never fully visible
  mid-scroll.

---

## ADR-0004 — Cards stay two-up on phones

### Context

At 375px the two-up grid yields 144px columns. Titles break to three lines
("Does the / Rain Ever / Fall on Us") and excerpts clamp to three short lines
behind a fade, so a card is mostly title. Freed vertical space makes one-up
affordable for the first time.

### Options

**A. Stay two-up,** and spend the freed vertical room on card height so the
title and excerpt stop competing.

**B. Go one-up** at ~300px wide: single-line titles, a real four-line excerpt.

### Decision

**A.** Two reasons, one structural and one aesthetic. Structurally, one-up
roughly doubles a scroll that ADR-0001 already made long. Aesthetically, the
planks are the shelf: `layoutPlanks()` draws a plank under each *row* of cards,
and a row containing a single book does not read as a shelf — it reads as a list
with lines between the items, which is the generic thing this design exists to
avoid.

### Consequences

Given up:

- **Comfortable title typography on the narrowest phones.** 144px columns will
  still break long titles to two or three lines. Taller cards stop the excerpt
  being crushed by that, but they do not make the title fit.
- **This is the decision most likely to be wrong**, and it is cheap to reverse —
  one `minmax()` value in the 760px media query. It is listed as open question 1
  in `architecture.md` for that reason.

---

## ADR-0005 — The header becomes a full-width band above the shelf, and the fixed frame comes off at every width

### Context

Requested directly: *"let the bookcase fit the entire width and keep the search
bar and title above as previous rendition had, that way the poems selection
doesn't look small."* The pre-`f5afcfa` homepage did exactly this — `.poems-inner`
was a plain centred 1100px block with no sidebar and no fixed height.

The request contains a hidden fork. Moving the header out of the sidebar and
above the shelf costs vertical room that the sidebar was getting for free. Inside
a `100svh` frame that cost lands entirely on the shelf. Measured at 1440×900:

| | columns | shelf window | cards visible |
|---|---|---|---|
| sidebar, fixed frame (before) | 4 | 791px | ~12.7 |
| header above, full width, **fixed frame kept** | 6 | **474px** | **~11.4** |
| header above, full width, **flowing** | 6 | page scroll | all of them |

So the middle row — the literal reading of the request — makes the shelf a 474px
letterbox showing *fewer* volumes than before. It reproduces the phone complaint
on the desktop.

### Options

**A. Header above, full width, keep the `100svh` frame.** Literal reading.

**B. Header above, full width, and extend ADR-0001's flow layout to all widths.**

**C. Header above on phones only**, sidebar retained on desktop.

### Decision

**B.** The stated goal is that the selection stop looking small, and A measurably
makes it smaller. C keeps two layouts to maintain and ignores the request for
desktop, which is where it was aimed.

B also collapses a cost listed under ADR-0001: there is now one layout that
reflows rather than two structurally different ones behind a breakpoint, and the
760px query shrinks to card sizing and header stacking.

### Consequences

Given up:

- **The immersive bookcase on desktop.** This is the real price. The laptop view
  was a window you looked into; it is now a page you scroll. That framing was the
  distinctive thing about the redesign in `f5afcfa`, and it is gone at every
  width, not just on phones.
- **The desktop page grows from 1,440px to ~7,800px** at 1280 wide. The hero is
  no longer half the document.
- **Reversibility drops.** ADR-0001 alone was a media-query change; with the
  desktop layout gone too, restoring the framed bookcase means rebuilding it.

Gained: 6 columns at 1440 and 5 at 1280, against 4 and 3 before — the shelf is
half again as wide; one scroll model everywhere; the header pinned so search and
filters stay reachable at any depth.

---

## ADR-0006 — The filter bar moves from the shelf into the header

### Context

`.filter-bar` was the first child of `.poems-grid`, painted on the wood. With the
header pinned (ADR-0003) and the shelf now thousands of pixels long, a filter
control that scrolls away with the shelf is unreachable exactly when it is most
needed.

### Decision

Move the element into `.library-header` as a grid area. The shelf script fetches
it by `#filterBar` and never walks up from `.poems-grid`, so nothing in the
filter or plank logic notices.

### Consequences

Given up:

- **The filters no longer read as part of the bookcase.** They were chips on the
  wood; they are now controls in a chrome band, which is more conventional and
  slightly less characterful.
- **`.filter-bar { grid-column: 1 / -1 }` is now inert**, left in place because it
  still applies on the poem pages' own grids.
- The header grows by a row, which sharpens the cost already named in ADR-0003.

---

## ADR-0007 — `.is-hidden` is scoped through `#poems` rather than `.poems-grid`

### Context

Found while verifying ADR-0001: filtering did not remove any volume from the
shelf. `#poems .poem-card { display: flex }` (one id, one class) outranks
`.poems-grid > .poem-card.is-hidden` (three classes), so `display: none` never
applied. Present in `HEAD` since commit `08d9117`, which introduced the flex
column for the excerpt fade. On the live site the count text updated and the
shelf did not change.

Invisible under the old layout — a too-tall grid just scrolled inside a fixed
frame. Under flow it sets the document to 10,675px to show twelve poems, so the
bug had to be fixed for this change to work at all.

### Decision

Re-scope the hiding rule through `#poems`, giving it one id and two classes, and
leave the `display: flex` rule alone.

### Consequences

Given up:

- **The rule now depends on an id**, so it inherits the specificity problem it
  solves: any future rule scoped through `#poems` with two or more classes can
  outrank it. A cascade layer or `:where()` would be the durable fix; both are a
  larger refactor of a stylesheet that is otherwise plain.
- Fixing a bug outside the requested scope. Justified because the change cannot
  be verified without it, but it is a separate defect and is called out as one.

## ADR-0008 — A single generative ink-and-watercolor identity belongs only to the homepage opening

**Status:** Local prototype for visual review; not approved or shipped.

### Context

Earlier unique full-screen art across poem pages made the collection feel
overstimulating. The shared book reader produced the calmer and more coherent
reading experience. The anthology still needs a memorable visual signature, but
that signature must not spread back into the reading surfaces or disturb the
accepted bookshelf.

### Options

1. Put a unique generative scene on every poem page.
2. Add one generative scene to the homepage opening and preserve every reading
   surface.
3. Keep the current CSS opening unchanged.
4. Build or fine-tune a generative model to create the visual system.

### Decision

Choose option 2. Reinterpret only the homepage opening with handcrafted,
editable p5.brush code. The scene begins as blank paper, forms through brush
strokes, reveals the existing title and quotation, settles after roughly 4–6
seconds, and then yields to the unchanged bookshelf on scroll.

The visual language is original Indic ink and watercolor derived from the
anthology's own motifs. A reference may inform medium or motion, but no specific
hibiscus composition is reproduced. Individual poem pages remain typography-led
with their existing restrained `data-anim` layers. `#poems` and `#bookReader`
are explicit no-change zones.

### Consequences

The homepage gains one client-side dependency boundary and one finite animation
lifecycle. The artwork stays editable as code and can be tuned without an ML
pipeline. The settled frame must work as the canonical reduced-motion state.
The cost is that the whole identity depends on one composition; approval should
therefore judge its cultural specificity, restraint, legibility, and transition
into the shelf before implementation begins.

Rejected for this change: per-poem p5.brush scenes, continuous animation,
randomly changing compositions, model fine-tuning, RL infrastructure, changes to
card/shelf/reader markup, and painting semantic text into the canvas.

---

# ADRs — poem pages: mood and link previews

These records cover the change described in `architecture.md` under "Poem
pages — per-poem mood and link previews". Status for all four: **accepted and
implemented, 2026-09-25**.

## ADR-0009 — Preview cards are rendered locally by headless Chrome and committed

### Context

Each poem needs its own 1200×630 preview image. The image has to show
Devanagari correctly. Devanagari is a **complex script**: letters combine into
conjuncts (`म् + ह → म्ह`) and vowel signs move around the consonant. A renderer
needs a **shaping engine**, the component that turns a letter sequence into the
right glyphs. Without one, तुम्हारी renders as broken pieces. The site is static
on GitHub Pages, so nothing can render on request.

### Options

1. **Headless Chrome screenshot of an HTML card template.** Chrome's shaping
   engine is the one readers' browsers use. The card uses the same CSS, fonts and
   gradients as the page.
2. **Python Pillow with libraqm.** Pillow is a Python imaging library, and
   libraqm is the shaping engine it can use. Both are installed on this machine.
   But the card layout, line wrapping and gradients would be rewritten by hand in
   Python, and a Devanagari font file would have to be committed.
3. **Satori + resvg via npm.** This is the usual Node pipeline. It adds
   `package.json` and `node_modules`, and Satori does not shape Devanagari.
4. **A dynamic OG image service.** It needs a server and uses Satori, so it has
   the same shaping problem.
5. **Hand-made cards in a design tool.** They look best, but 70 cards drift out
   of date the first time a poem is edited.

### Decision

Option 1. The card is an HTML file, so it is designed with the same tools as the
site. Shaping is correct by construction. There are no new dependencies.

### Consequences

What is given up: generation only works on a Mac with Chrome installed, because
the script calls Chrome's binary and macOS `sips`. CI cannot regenerate cards.
It can only detect stale ones (ADR-0010). Screenshots are also not
byte-for-byte reproducible across Chrome versions, so regenerating an unchanged
poem may produce a different file. That is why the fingerprint is computed from
the card's inputs, never from the image bytes. Fonts are fetched from Google
Fonts during rendering, so generation needs network access.

## ADR-0010 — A content fingerprint in the `og:image` URL, checked in CI

### Context

A committed image goes stale silently. Edit the first stanza, forget to
regenerate, and the preview quotes lines that no longer exist. That is exactly
what happened with the homepage card excerpt for तुम्हारी यादें in this session.
Apps like WhatsApp also cache previews by image URL, so a changed image at the
same URL may keep showing the old one.

### Options

1. **No check.** Rely on remembering to regenerate.
2. **Fingerprint the inputs.** Hash the card's inputs (title, share lines,
   colours, mood and template version). Put the first 8 hex characters in the
   URL as `?v=<hash>`. `--check` recomputes the hash and compares.
3. **Generate cards in CI.** Install Chrome on the GitHub runner and render
   there on every deploy.

### Decision

Option 2. The check is plain string work, so it fits in the existing
dependency-free `build-content.mjs --check`. The same hash also busts preview
caches: new content means a new URL.

### Consequences

What is given up: editing a poem's opening lines, when those are its share
lines, now blocks the deploy until the cards are regenerated locally. That is
friction, but it only appears when the card really is wrong. Editing lines that
are not share lines does not trigger it. Changing the card template bumps its
version and makes every card stale at once. That is correct, but it means
regenerating all 70 cards (about a minute).

## ADR-0011 — Moods are named CSS bundles selected by `data-mood`, with SVG mask ornaments

### Context

Rich poems should feel like themselves. Each page already has an inline palette
and a `data-anim` atmosphere. What's missing is motif: the ornaments that tie
the page to the poem's images. Whatever is added must not touch the poem markup
that `build-content.mjs` extracts for the reader and search.

### Options

1. **Bespoke inline CSS and markup per poem.** Each page gets its own ornaments
   written straight into its HTML.
2. **Named moods in the shared stylesheet.** `[data-mood="sharad"]` rules
   restyle `.divider-symbol` and add an end mark, using SVG files as CSS masks.
   The page opts in with one attribute.
3. **A JSON mood config plus a JS theme engine** that applies moods at runtime.

### Decision

Option 2. It changes one attribute per page, and the extracted poem markup is
unchanged. Moods can be reused: a later autumn poem can take `sharad` as is.
Option 3 adds a runtime and a failure mode for what is only styling.

### Consequences

What is given up: CSS masks produce **single-colour silhouettes**. A mask only
decides where the accent colour shows, so there is no shading or
multi-colour ornament. Every new mood edits `style.css` and so bumps its `?v=`
on all 71 pages. Moods also never reach the `#bookReader`, which has no
`data-mood`. The reader keeps its uniform paper look, which is the deliberate
choice from ADR-0008.

## ADR-0012 — Tiro Devanagari Hindi for Devanagari text

### Context

None of the site's fonts (Lora, Playfair Display, Poppins) include Devanagari.
So `.hindi-text` falls back to whatever the reader's system has, which differs
on every device. Only तुम्हारी यादें uses Devanagari today. The other 25 Hindi
and Urdu poems are written in Roman letters.

### Options

1. **System fallback** (status quo). There is no cost, and there is no
   control over the look.
2. **Tiro Devanagari Hindi.** A literary text face designed to sit beside Latin
   serifs like Lora. One weight, plus italic.
3. **Noto Serif Devanagari.** Full weight range and very robust, but larger
   files and a plainer, more technical look.

### Decision

Option 2. It's loaded through the existing Google Fonts import and added as
the second family in `--font-serif` and `--font-display`
(`'Lora', 'Tiro Devanagari Hindi', serif`). This is **per-character font
fallback**: Lora has no Devanagari glyphs, so for those characters alone the
browser moves to the next family in the list. Latin text keeps Lora
everywhere, and no markup needs a class. Google serves each script as a
separate **unicode-range subset**, so a browser downloads Tiro only when a page
actually contains Devanagari. English and Roman-script pages pay nothing.

This was chosen during implementation over the originally planned
`.hindi-text` rule. The class only covered the poem's lines. The Devanagari
title, the nav title and the homepage card still fell back to system fonts.

### Consequences

What is given up: a single weight, so there is no bold Devanagari title. The
title is carried by size instead. The fallback also reaches the homepage
shelf card and the `#bookReader` for तुम्हारी यादें. That's a small exception
to ADR-0008's no-change zone, and it only changes which font draws the
Devanagari. There is one extra font request (about
60–90 KB) on Devanagari pages, with a brief moment of fallback text while it
loads (`font-display: swap`).
