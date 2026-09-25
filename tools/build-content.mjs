// Generates the files derived from poems/*.html:
//   poems.json  — content for the homepage book reader and full-text search
//   sitemap.xml — every poem page, for search engines
//
// --check also verifies each poem's link-preview card (assets/share/) still
// matches the poem. Cards are rendered locally by build-share-cards.mjs.
//
//   node tools/build-content.mjs          # write both
//   node tools/build-content.mjs --check  # exit 1 if either is stale
//
// The poem pages are the source of truth; both outputs are derived and should
// never be edited by hand. Re-run this after adding or editing a poem.

import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  SITE, extractBlock, decodeEntities, extractText,
  readShareInputs, cardHash, cardUrl, ogImage
} from './share-inputs.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const poemsDir = join(root, 'poems');
const contentFile = join(root, 'poems.json');
const sitemapFile = join(root, 'sitemap.xml');

// Plain text of the poem, used to power full-text search on the homepage.
function toPlainText(html) {
  return decodeEntities(
    html.replace(/<\/(p|div)>/g, '\n').replace(/<[^>]+>/g, ' ')
  )
    .replace(/[ \t]+/g, ' ')
    .replace(/\n\s*\n+/g, '\n')
    .trim();
}

async function buildEntry(file) {
  const html = await readFile(join(poemsDir, file), 'utf8');
  const poem = extractBlock(html, 'poem-text');
  if (!poem) throw new Error(`${file}: no .poem-text block found`);

  const metadata = extractBlock(html, 'poem-metadata') ?? '';
  const body = poem.trim();

  return [
    `poems/${file}`,
    {
      title: extractText(metadata, /<h1[^>]*>([\s\S]*?)<\/h1>/),
      subtitle: extractText(metadata, /<p class="poem-subtitle"[^>]*>([\s\S]*?)<\/p>/),
      form: extractText(metadata, /<span class="poem-category"[^>]*>([\s\S]*?)<\/span>/),
      lang: html.match(/<html[^>]*\blang="([^"]+)"/)?.[1] ?? 'en',
      html: body,
      text: toPlainText(body)
    }
  ];
}

// A card is stale when its fingerprint no longer matches the poem's current
// title, lines, colours and mood. Poems with their own artwork are skipped.
async function checkShareCards() {
  const problems = [];
  for (const file of files) {
    const slug = file.replace(/\.html$/, '');
    const html = await readFile(join(poemsDir, file), 'utf8');
    const inputs = readShareInputs(html, slug);
    if (inputs.artworkImage) continue;

    const fix = `run: node tools/build-share-cards.mjs --only ${slug}`;
    const image = ogImage(html) ?? '';
    const cardExists = await readFile(join(root, 'assets', 'share', `${slug}.jpg`)).then(() => true, () => false);
    if (!image.includes('/assets/share/')) problems.push(`${slug}: no card yet — ${fix}`);
    else if (!cardExists) problems.push(`${slug}: card missing — ${fix}`);
    else if (image !== cardUrl(slug, cardHash(inputs))) problems.push(`${slug}: card stale — ${fix}`);
  }
  return problems;
}

const files = (await readdir(poemsDir)).filter(f => f.endsWith('.html')).sort();
const entries = await Promise.all(files.map(buildEntry));
const json = JSON.stringify(Object.fromEntries(entries), null, 2) + '\n';

const urls = [SITE, ...files.map(f => `${SITE}poems/${f}`)];
const sitemap =
  '<?xml version="1.0" encoding="UTF-8"?>\n' +
  '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
  urls.map(url => `  <url><loc>${url}</loc></url>\n`).join('') +
  '</urlset>\n';

const outputs = [
  [contentFile, json, 'poems.json'],
  [sitemapFile, sitemap, 'sitemap.xml']
];

if (process.argv.includes('--check')) {
  for (const [path, expected, name] of outputs) {
    if ((await readFile(path, 'utf8').catch(() => '')) !== expected) {
      console.error(`${name} is out of date — run: node tools/build-content.mjs`);
      process.exit(1);
    }
  }
  const cardProblems = await checkShareCards();
  if (cardProblems.length) {
    console.error(cardProblems.join('\n'));
    process.exit(1);
  }
  console.log(`poems.json, sitemap.xml and share cards are up to date (${entries.length} poems)`);
} else {
  for (const [path, contents, name] of outputs) {
    await writeFile(path, contents);
    console.log(`Wrote ${name}`);
  }
  console.log(`${entries.length} poems`);
}
