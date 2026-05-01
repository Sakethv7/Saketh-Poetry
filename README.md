# Wandering Poet

A beautifully crafted portfolio of 11 poems across four emotional landscapes: mourning, obsession, classical ghazals, and hope. Each poem lives on its own atmospheric page, with colors and aesthetics tailored to its essence.

## 📖 The Collection

### Mourning Cycle (4 poems)
- **Empty Reasons** — Loss through seasons, the blue umbrella refrain
- **Tale of the Wandering Poet** — Which versions of you remain?
- **My Dear Melancholy** — A dialogue with sorrow itself
- **The Girl with a Cat Named Whiskey** — Sugarless coffee and fading warmth

### Obsession & Denial (2 poems)
- **It's Not As If** — Denial as the truest confession
- **तुम्हारी यादें** — Hindi: Memories of you, through seasons

### Ghazals (3 poems)
Classical form, each a meditation on loss and longing:
- **Saboot** — Proof that love is real
- **Shaam-e-Gham** — Sorrow of the evening
- **Dariya** — The river of memory

### Hope & Reunion (2 poems)
- **At the Turn of a Hill** — A chance encounter, flowers, and new beginnings
- **After Many Seasons** — Reunion, acceptance, umbrellas finding companions

---

## 🎨 Design

Each poem has its own color palette and atmosphere:
- **Typography**: Serif (Lora) for poetry, sans-serif (Poppins) for UI
- **Layout**: Centered reading columns, generous whitespace, stanza markers (Roman numerals)
- **Aesthetics**: Warm parchment backgrounds with unique color gradients per poem
- **Responsiveness**: Mobile-first, adapts beautifully to all screen sizes

See **CONCEPTS.md** for full design philosophy and technical architecture.

---

## 🚀 Quick Start

### Local Development
No build step required — just open `index.html` in your browser.

```bash
# Clone the repo
git clone https://github.com/yourusername/saketh-poetry.git
cd saketh-poetry

# Open in browser (macOS)
open index.html

# Or use a simple server (Python 3)
python3 -m http.server 8000
# Visit http://localhost:8000
```

### File Structure
```
saketh-poetry/
├── index.html                    # Homepage with all poems
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
│   └── style.css                 # Global styles & typography
├── README.md                      # This file
└── CONCEPTS.md                    # Design & architecture docs
```

---

## 📦 Deployment to GitHub Pages

### 1. Create a GitHub Repository
```bash
# Initialize git (if not already done)
git config --global user.name "Your Name"
git config --global user.email "your.email@example.com"
git add .
git commit -m "Initial commit: Poetry portfolio"
git branch -M main
git remote add origin https://github.com/yourusername/saketh-poetry.git
git push -u origin main
```

### 2. Enable GitHub Pages
1. Go to your repository on GitHub
2. Settings → Pages
3. Select **Source**: `Deploy from a branch`
4. Select **Branch**: `main` → `/root`
5. Click **Save**

Your site will be live at: `https://yourusername.github.io/saketh-poetry`

### 3. Custom Domain (Optional)
In **Settings → Pages**, add your custom domain under **Custom domain** and follow GitHub's DNS setup instructions.

---

## ✨ Features

- **No JavaScript Framework** — Pure HTML, CSS. Fast, lightweight, reliable.
- **Responsive Design** — Works beautifully on mobile, tablet, desktop
- **Print-Friendly** — Each poem prints perfectly
- **Accessibility** — Semantic HTML, high contrast, keyboard navigation
- **Dark Mode Support** — Automatic based on system preference (optional CSS media query)
- **Fast Load Times** — ~15KB total assets, served instantly
- **SEO-Friendly** — Clean URLs, semantic structure, Open Graph tags

---

## 🎯 Future Enhancements

- [ ] Dark mode toggle
- [ ] Search/filter by category or language
- [ ] Reading time estimates per poem
- [ ] Audio recordings (poet reciting each poem)
- [ ] Social sharing buttons (individual poem links)
- [ ] Poem metadata (date written, inspiration notes)
- [ ] Visitor analytics (light, privacy-respecting)
- [ ] Email subscription for new poems

---

## 💭 About This Collection

These 11 poems trace a journey through loss, obsession, and ultimately, hope. Written across different moods and time periods, they experiment with form (from free verse to classical ghazals), language (English and Hindi), and emotional register.

The collection is organized not chronologically, but thematically — creating a arc that begins in mourning, deepens into obsession, explores the classical weight of ghazals, and emerges into hope.

---

## 📝 Notes on the Ghazals

Three of these poems follow the classical **ghazal** form:
- A series of couplets (called *shers*) that can stand alone
- A rhyme scheme (radif-qafia): repetition of a word at the end of each couplet
- A signature couplet at the end (the *makhta*), where the poet signs their name
- Each couplet is autonomous; you can read them in any order

This ancient form, originating in Arabic and refined in Urdu and Persian poetry, is experiencing a revival in contemporary English and Hindi poetry.

---

## 🛠 Built With

- **HTML5** — Semantic structure
- **CSS3** — Gradients, variables, responsive design
- **Google Fonts** — Lora, Playfair Display, Poppins
- **GitHub Pages** — Free, fast hosting

---

## 📄 License

These poems are original works by Wandering Poet. Please ask before republishing or adapting them.

The website code is available for modification and reuse — fork it, remix it, adapt it for your own poetry.

---

## 👤 Author

**Wandering Poet** — Poet, builder, wanderer. Working on FactoryMind (hardware + agentic AI). Building toward AI × hardware founder work.

---

## 🤝 Contributing

Found a typo? Have a suggestion for the design or typography? Open an issue or pull request.

---

**Last updated:** April 2026

---

*Read the poems. Sit with them. Let them settle. That's the only instruction.*
