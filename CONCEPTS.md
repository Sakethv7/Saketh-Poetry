# Saketh's Poetry — Design & Architecture

## Core Concept
A literary, surreal poetry portfolio where each poem exists as its own atmospheric world. Readers navigate between poems via a central index, and each poem page reflects its emotional essence through color, typography, and subtle visual metaphors.

## Design Philosophy

### Visual Language
- **Typography**: Serif (Lora/Playfair) for poetry text, sans-serif (Poppins) for UI
- **Palette Foundation**: Warm cream/beige backgrounds (mimicking aged manuscript paper)
- **Spacing**: Generous whitespace for breathing room and contemplation
- **Hierarchy**: Roman numerals mark stanzas; subtle decorative dividers create rhythm
- **Texture**: Slight grain/texture for vintage, hand-written feel

### Per-Poem Aesthetic Strategy
Each poem gets a unique color accent and atmospheric quality that mirrors its content:

1. **Empty Reasons** — Deep indigo + faded gold accents (melancholy, rain-soaked)
2. **Tale of the Wandering Poet** — Dusty sage + amber (introspection, journeys)
3. **My Dear Melancholy** — Dark plum + rose gold (intimate, dialogic)
4. **तुम्हारी यादें** — Saffron gold + deep teal (Hindi sensibility, seasons)
5. **At the Turn of a Hill** — Soft blush + green (meeting, hope, flowers)
6. **It's Not As If** — Gray-blue + copper (denial, nervous energy)
7. **Saboot** — Rich burgundy + cream (ghazal form, traditional)
8. **The Girl with a Cat Named Whiskey** — Charcoal + warm brown (intimate, grounded)
9. **Shaam-e-Gham** — Deep plum + gold (sorrow of evening, formal)
10. **Dariya** — Deep teal + silver (river metaphor, flowing time)
11. **After Many Seasons** — Soft lavender + muted gold (reunion, acceptance)

### Interactive Elements
- **Hover effects**: Subtle color shifts on text
- **Navigation**: Simple prev/next or return-to-home
- **Responsiveness**: Adapts to mobile (full-width, readable) and desktop (centered column)
- **No distractions**: Focus on the poem itself

## Technical Architecture

### File Structure
```
saketh-poetry/
├── index.html                    # Homepage: all 11 poems as cards
├── poems/
│   ├── empty-reasons.html
│   ├── tale-of-wandering-poet.html
│   ├── my-dear-melancholy.html
│   ├── tumhari-yaadein.html
│   ├── at-the-turn-of-a-hill.html
│   ├── it-not-as-if.html
│   ├── saboot.html
│   ├── girl-with-cat-named-whiskey.html
│   ├── shaam-e-gham.html
│   ├── dariya.html
│   └── after-many-seasons.html
├── css/
│   ├── style.css                 # Global styles
│   └── themes.css                # Per-poem color variables
├── js/
│   └── script.js                 # Minimal interactivity
├── assets/
│   ├── fonts/                    # Google Fonts (Lora, Playfair, Poppins)
│   └── decorations/              # SVG dividers, ornaments
├── README.md
└── CONCEPTS.md                   # This file
```

### Design Tokens (CSS Variables)
Each poem defines its own theme with three main variables:
```css
--poem-bg: #F5F1ED;          /* Background */
--poem-accent: #3A2F47;      /* Primary text/accent */
--poem-secondary: #C9A961;   /* Secondary accent (dividers, stanza nums) */
```

### Mobile-First Responsive Design
- **Mobile**: Full-width padding, centered text, stanza markers visible
- **Tablet**: 80vw max-width, centered
- **Desktop**: 70ch reading column, centered on screen

## Content Strategy

### Homepage (index.html)
- Grid of poem cards (3 columns on desktop, 1-2 on mobile)
- Each card shows: title, category tag (Mourning/Obsession/Ghazal/Hope), excerpt
- Click to open full poem page

### Poem Pages
Structure:
1. **Header**: Poem title, category, mood metadata
2. **Body**: Full poem text with proper stanza breaks (Roman numerals)
3. **Footer**: Navigation (← Home, ↙ Prev, Next →)
4. **Background**: Subtle gradient or texture unique to poem

### Categories
- **Mourning Cycle**: Empty Reasons, Tale of the Wandering Poet, My Dear Melancholy, The Girl with a Cat Named Whiskey
- **Obsession & Denial**: It's Not As If, तुम्हारी यादें
- **Ghazals**: Saboot, Shaam-e-Gham, Dariya
- **Hope & Reunion**: At the Turn of a Hill, After Many Seasons

## Technical Notes

### Why No JavaScript Framework?
- Static HTML files work perfectly for this use case
- GitHub Pages hosting (free, fast)
- No build step required
- Lightweight: ~15KB total assets
- Fast on mobile networks

### Fonts
- **Poetry text**: Lora (serif, readable, literary)
- **Headings**: Playfair Display (elegant, display)
- **UI text**: Poppins (modern, clean)
- All from Google Fonts (no self-hosting overhead)

### Accessibility
- Semantic HTML (article, header, footer, nav)
- High contrast text (dark on light)
- Readable font sizes (18px+ for body text)
- Alt text for decorative elements (marked as `aria-hidden`)
- Keyboard navigation support

### Deployment (GitHub Pages)
1. Create repo: `saketh-poetry`
2. Push to GitHub
3. Enable Pages in repo settings (main branch, `/root`)
4. Access at: `username.github.io/saketh-poetry`

## Future Enhancements
- Dark mode toggle (per-poem themes adapt)
- Search/filter by category
- Reading time estimates
- Social sharing (individual poem links)
- Poem metadata (date written, inspiration notes)
- Audio recordings (recitation of poems)

---

**Design responsibility**: Clarity, elegance, readability. The poem is the hero.
