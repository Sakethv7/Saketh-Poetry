// Generates the files derived from poems/*.html:
//   poems.json  — content for the homepage book reader and full-text search
//   sitemap.xml — every poem page, for search engines
//
//   node tools/build-content.mjs          # write both
//   node tools/build-content.mjs --check  # exit 1 if either is stale
//
// The poem pages are the source of truth; both outputs are derived and should
// never be edited by hand. Re-run this after adding or editing a poem.

import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const poemsDir = join(root, 'poems');
const contentFile = join(root, 'poems.json');
const sitemapFile = join(root, 'sitemap.xml');
const SITE = 'https://sakethv7.github.io/Saketh-Poetry/';

// Pulls the inner HTML of the first element with the given class, counting
// nested <div>s so stanza wrappers don't end the block early.
function extractBlock(html, className) {
  const open = new RegExp(`<div class="${className}"[^>]*>`);
  const start = html.search(open);
  if (start === -1) return null;
  const bodyStart = start + html.slice(start).match(open)[0].length;

  const tag = /<(\/?)div\b[^>]*>/g;
  tag.lastIndex = bodyStart;
  let depth = 1;
  let match;
  while ((match = tag.exec(html))) {
    depth += match[1] ? -1 : 1;
    if (depth === 0) return html.slice(bodyStart, match.index);
  }
  return null;
}

function decodeEntities(text) {
  return text
    .replace(/&nbsp;/g, ' ')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');
}

function extractText(html, pattern) {
  const match = html.match(pattern);
  if (!match) return '';
  return decodeEntities(match[1].replace(/<[^>]+>/g, ''))
    .replace(/\s+/g, ' ')
    .trim();
}

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
  console.log(`poems.json and sitemap.xml are up to date (${entries.length} poems)`);
} else {
  for (const [path, contents, name] of outputs) {
    await writeFile(path, contents);
    console.log(`Wrote ${name}`);
  }
  console.log(`${entries.length} poems`);
}
