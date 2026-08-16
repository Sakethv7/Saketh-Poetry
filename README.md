# Wandering Poet

A portfolio of 69 poems across English and Hindi · Urdu, organized by literary form. Each poem lives on its own atmospheric page with colors and aesthetics tailored to its essence.

## The Collection

### English (53 poems)

| Form | Poems |
|---|---|
| **Free Verse** (15) | Tale of the Wandering Poet, The Hairpin, In the Rain, September, A Ring in the Rain, Jessie, Does the Rain Ever Fall on Us, Lost at Sea, Almost Blue, Eyes Almost Blue, Once More, 11th of April, Simple Twist of Fate, The Café in March, Only the Garden Roses Were Listening |
| **Anaphoric Verse** (3) | It's Not As If, Regret, Once Again |
| **Lyric Ode** (1) | My Dear Melancholy |
| **Lyric Meditation** (1) | The Longer Route |
| **Prose Poem** (2) | Gazing at Flowers, A Wandering Taxi |
| **Narrative Verse** (8) | At the Turn of a Hill, The Girl with a Cat Named Whiskey, Tokyo, The Woman Who Brought Spring, The Warden's Garden, The Tattered Page, The Blue Scarf, A Beautiful Curse |
| **Rhymed Verse · ABAB** (13) | Empty Reasons, After Many Seasons, Red Sweater, Almere's Fair, The Bar Under a Lonely Star, Homeward Bound, A Rainy Day of July, The Gardner, The Green Umbrella, Painting Her, I've Known Life, Dusky Window, Before We Grey |
| **Waka** (1) | Garden of Words |

### Hindi · Urdu (16 poems)

| Form | Poems |
|---|---|
| **Ghazal** (12) | Saboot, Dariya, Hum Kahan Jayenge, Kuch Lafz, Door Jaake Basi, Shayad, Jaayega Kahan Ab, Hawa Ke Dastaan, Udaasi Ka Itiraf, Khaali Gali, Intezaar, Sardi Ka Mahina |
| **Nazm** (13) | Shaam-e-Gham, तुम्हारी यादें, Pehele Aur Fir, Shaam Samay, Aangan Ke Phool, Naya Rang, Anjaan Sheher, Jaan-e-Baharan, Ghaav Ki Khushboo, Bekashi Ka Saya, Aadat, Khawab Ki Dakhili, Patjhad Ka Parichay |
| **Nathar Nazm** (1) | Jhuti Tasalli |

---

## Design

Each poem has its own color palette and atmosphere:
- **Typography**: Lora (serif) for poetry, Playfair Display (display headings), Poppins (sans-serif UI)
- **Layout**: Centered reading columns, generous whitespace, stanza markers (Roman numerals)
- **Aesthetics**: Warm parchment backgrounds with unique color gradients per poem
- **Responsiveness**: Mobile-first, adapts to all screen sizes
- **Animation**: Canvas-based atmospheric backgrounds (rain, leaves, petals, fireflies, stars, mist, etc.) per poem

See **CONCEPTS.md** for full design philosophy and technical architecture.

---

## Quick Start

No build step required — just open `index.html` in your browser.

```bash
git clone https://github.com/sakethv7/saketh-poetry.git
cd saketh-poetry
python3 -m http.server 8000
# Visit http://localhost:8000
```

### File Structure
```
saketh-poetry/
├── index.html               # Homepage — bookshelf, filters, search, book reader
├── poems/                   # 70 individual poem HTML files — source of truth
├── poems.json               # Generated: poem text for the reader & search
├── sitemap.xml              # Generated: every poem page
├── tools/
│   └── build-content.mjs    # Regenerates poems.json + sitemap.xml
├── css/
│   └── style.css            # Global styles & typography
├── js/
│   ├── poems.js             # Canonical poem list (slug + title)
│   ├── quotes.js            # Rotating quote pool for landing page
│   ├── poem-nav.js          # Auto-generated prev/next navigation
│   ├── bg-anim.js           # Canvas atmospheric animations
│   └── scroll-reveal.js     # Intersection Observer scroll-fade
├── README.md
└── CONCEPTS.md              # Design philosophy & architecture
```

### After adding or editing a poem

The poem pages are the source of truth. Regenerate what's derived from them:

```bash
node tools/build-content.mjs
```

This rewrites `poems.json` (what the homepage reader shows and search looks
through) and `sitemap.xml`. Deployment runs `node tools/build-content.mjs --check`
and fails if either file is out of date, so a forgotten rebuild can't ship.

---

## Deployment

Hosted on GitHub Pages via GitHub Actions (`.github/workflows/deploy.yml`).

To deploy your own fork:
1. Push to GitHub
2. Settings → Pages → Source: `Deploy from a branch` → `main` / `root`
3. Live at `https://yourusername.github.io/saketh-poetry`

---

## Features

- **No JavaScript Framework** — Pure HTML/CSS/JS. Fast, lightweight, reliable.
- **Filter by language or form** — Filter bar on the homepage for quick navigation across 69 poems
- **Responsive** — Mobile, tablet, desktop
- **Per-poem theming** — Each card and poem page has a unique color palette
- **Atmospheric backgrounds** — Canvas animations tuned to each poem's mood
- **Rotating quotes** — Landing page cycles lines from the anthology
- **Automatic nav** — Prev/next links derived from canonical poem list
- **Print-friendly** — Each poem prints cleanly
- **Accessibility** — Semantic HTML, high contrast, keyboard navigation
- **SEO** — Open Graph meta tags, clean URLs

---

## Future Enhancements

- [ ] Dark mode toggle
- [ ] Reading time estimate per poem
- [ ] Poem metadata (date written, inspiration notes)
- [ ] Audio recordings (poet reciting each poem)
- [ ] Social sharing buttons

---

## Notes on Forms

**Ghazal** — Classical Urdu/Persian form: couplets (*shers*) that can stand alone, a strict rhyme-and-refrain scheme (*radif-qafia*), and a closing signature couplet (*makhta*). Ancient form experiencing a revival in contemporary Hindi/Urdu poetry.

**Nazm** — Modern Urdu/Hindi lyric poem with a unified theme across stanzas, unlike the autonomous couplets of the ghazal.

**Nathar Nazm** — Urdu prose poem: the lyric impulse of a nazm written in flowing prose rather than metered verse.

**Waka** — Classical Japanese short form (31 syllables, 5-7-5-7-7). *Garden of Words* is the only poem here in this form.

**Anaphoric Verse** — Poems built on deliberate repetition of an opening phrase at the start of successive lines (*anaphora*). The repeated phrase creates cumulative emotional pressure.

**Lyric Ode** — Direct address to an abstraction or personified subject. *My Dear Melancholy* speaks to sorrow itself.

**Lyric Meditation** — Sustained first-person reflection on a single image or walk, no narrative arc, just deepening attention.

**Prose Poem** — Reads like prose but is organized by image and rhythm rather than syntax or argument.

---

## License

Poems are original works by Wandering Poet. Please ask before republishing.
Website code is available for modification and reuse.

---

*Read the poems. Sit with them. Let them settle.*
