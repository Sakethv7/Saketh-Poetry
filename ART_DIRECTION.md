# Wandering Poet Art Direction

## Core Rule

The anthology uses art selectively. A poem earns a full scene when it has a
specific place, object, action, and visual turn. Object-rich poems receive a
light motif. Internal or rhetorical poems remain book chapters, where paper,
type, folios, and ornaments carry the atmosphere.

The site may move between Indic, European, American, Japanese, and other visual
contexts when the poem supports them. The homepage is the exception: its visual
identity is a contemporary Delhi kitabkhana after rain.

## Homepage Identity

The homepage depicts a lived-in Delhi independent bookstore and poetry room,
not a palace, heritage hotel, colonial study, or generic dark-academia library.

Required cues:

- Limewashed plaster, practical teak shelving, exposed conduit, and red-oxide
  or Kota-stone flooring.
- Contemporary Hindi, Urdu, English, Punjabi, and translated poetry editions.
- Monsoon Delhi through a restrained iron jaali: flat roofs, utility wires,
  wet concrete, and neem or amaltas leaves.
- Evidence of a small reading: mismatched chairs, manuscript pages, chai,
  bookmarks, a canvas tote, and a few marigold petals.
- A quiet central field for the rotating poem, with cultural detail kept around
  the edges.

Avoid symbolic "India-themed" decoration, palace architecture, excessive
arches, tourist spectacle, mystical effects, and saffron-dominated palettes.

## Full Illustrated Scenes

These 18 poems have enough narrative and material specificity for full scenes:

- The Hairpin
- Lost at Sea
- A Wandering Taxi
- At the Turn of a Hill
- Tokyo
- The Woman Who Brought Spring
- The Warden's Garden
- The Tattered Page
- The Blue Scarf
- Simple Twist of Fate
- Almere's Fair
- The Bar Under a Lonely Star
- The Green Umbrella
- Painting Her
- Khaali Gali
- Shaam Samay
- Aangan Ke Phool
- Jhuti Tasalli

The generated scene set for The Green Umbrella, The Warden's Garden, The Woman
Who Brought Spring, Khaali Gali, Aangan Ke Phool, The Hairpin, and Jhuti Tasalli
is retained as reference material in `assets/art`. It is not currently applied
to poem pages. All shelf poems open in the shared book reader so the collection
has one calm reading experience instead of competing full-screen scenes.

Human figures must not become portrait subjects. Prefer empty spaces, objects,
weather, traces, distant backs, or silhouettes. Faces are used only when the
poem cannot work without one and must never dominate the composition. The
Woman Who Brought Spring is intentionally people-free: an old umbrella, empty
rain shelter, marigolds, bare branches, and a receding path carry the reunion.

## Light Motifs

These poems should use restrained material details rather than full scenes:

- Tale of the Wandering Poet
- In the Rain
- September
- A Ring in the Rain
- Jessie
- Does the Rain Ever Fall on Us
- Almost Blue
- Eyes Almost Blue
- Once More
- 11th of April
- The Cafe in March
- Only the Garden Roses Were Listening
- My Dear Melancholy
- Gazing at Flowers
- The Girl with a Cat Named Whiskey
- A Beautiful Curse
- Red Sweater
- The Gardner
- I've Known Life
- Dusky Window
- Before We Grey
- Garden of Words
- Dariya
- Jaayega Kahan Ab
- Hawa Ke Dastaan
- Sardi Ka Mahina
- Tumhari Yaadein
- Naya Rang
- Jaan-e-Baharan
- Ghaav Ki Khushboo
- Bekashi Ka Saya
- Khawab Ki Dakhili
- Patjhad Ka Parichay

Useful motif families include ink blooms and gold rules for ghazals, handmade
paper and margin annotations for nazms, water tide marks for rain, pressed
petals and photograph corners for memory, and one botanical specimen for a
seasonal shift.

## Book Chapters

These poems are strongest as typography-first chapters:

- It's Not As If
- Regret
- Once Again
- Empty Reasons
- After Many Seasons
- Homeward Bound
- A Rainy Day of July
- Saboot
- Hum Kahan Jayenge
- Kuch Lafz
- Door Jaake Basi
- Shayad
- Udaasi Ka Itiraf
- Intezaar
- Shaam-e-Gham
- Pehele Aur Fir
- Anjaan Sheher
- Aadat

They may vary in paper color, folio mark, chapter ornament, and typesetting, but
should not receive representational backgrounds.

## Next Production Batch

Produce and review artwork in small batches. Do not publish a generated image
merely because it is visually attractive.

Pause artwork production. Revisit the reference set only after the book reader
and anthology rhythm are stable. Any future illustrated mode should be optional,
rare, and reviewed in context rather than enabled poem by poem by default.

For each asset, review desktop crop, mobile crop, text-safe area, cultural
specificity, narrative accuracy, file weight, and contrast before publishing.

## Engineering Order

1. Stabilize the catalog as one source of truth for title, form, language,
   excerpt, palette, and presentation mode.
2. Extract homepage, shelf, and reader CSS and JavaScript from `index.html`.
3. Add an artwork manifest containing asset paths, focal points, overlays,
   mobile crops, alt descriptions, and approval status.
4. Add deep-linking, history handling, previous/next controls, and chapter
   progress to the book reader.
5. Add curated paths such as Delhi in Rain, Gardens and Departures, and
   Hindi/Urdu Nights.
6. Generate social previews only from approved artwork.
