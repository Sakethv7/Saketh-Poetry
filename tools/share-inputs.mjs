// What goes on a poem's link-preview card, and the fingerprint of it.
//
// Shared by build-share-cards.mjs (which renders the card) and
// build-content.mjs --check (which fails the deploy when a committed card no
// longer matches its poem). Keeping both on one definition means they can
// never disagree about what "stale" means.

import { createHash } from 'node:crypto';

// Bump when tools/share-card.html or an ornament SVG changes: the hash does
// not cover ornament artwork, so this is what gives cards a new URL.
export const TEMPLATE_VERSION = 4;

export const SITE = 'https://sakethv7.github.io/Saketh-Poetry/';
export const DEFAULT_OG_IMAGE = `${SITE}assets/art/delhi-poetry-bookstore.jpg`;
export const MAX_SHARE_LINES = 4;

// Pulls the inner HTML of the first element with the given class, counting
// nested <div>s so stanza wrappers don't end the block early.
export function extractBlock(html, className) {
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

export function decodeEntities(text) {
  return text
    .replace(/&nbsp;/g, ' ')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');
}

export function extractText(html, pattern) {
  const match = html.match(pattern);
  if (!match) return '';
  return decodeEntities(match[1].replace(/<[^>]+>/g, ''))
    .replace(/\s+/g, ' ')
    .trim();
}

function cssVar(html, name) {
  return html.match(new RegExp(`--${name}:\\s*([^;]+);`))?.[1].trim() ?? null;
}

export function ogImage(html) {
  return html.match(/<meta property="og:image"\s+content="([^"]+)"/)?.[1] ?? null;
}

// The lines the card quotes: every <p class="… share-line …"> in order, else
// the poem's first two lines (skipping waka speaker labels).
function shareLines(poem) {
  const paragraphs = [...poem.matchAll(/<p\b([^>]*)>([\s\S]*?)<\/p>/g)].map(m => ({
    attrs: m[1],
    text: decodeEntities(m[2].replace(/<[^>]+>/g, '')).replace(/\s+/g, ' ').trim()
  }));
  const marked = paragraphs.filter(p => /class="[^"]*\bshare-line\b/.test(p.attrs));
  if (marked.length) return marked.map(p => p.text);
  return paragraphs
    .filter(p => !/waka-speaker/.test(p.attrs) && p.text)
    .slice(0, 2)
    .map(p => p.text);
}

export function readShareInputs(html, slug) {
  const poem = extractBlock(html, 'poem-text');
  if (!poem) throw new Error(`${slug}: no .poem-text block found`);

  const lines = shareLines(poem);
  if (lines.length > MAX_SHARE_LINES) {
    throw new Error(`${slug}: ${lines.length} share-line paragraphs, at most ${MAX_SHARE_LINES}`);
  }

  const image = ogImage(html);
  const isOurs = !image || image === DEFAULT_OG_IMAGE || image.includes('/assets/share/');

  return {
    title: extractText(extractBlock(html, 'poem-metadata') ?? '', /<h1[^>]*>([\s\S]*?)<\/h1>/),
    lines,
    bg: cssVar(html, 'poem-bg'),
    text: cssVar(html, 'poem-text'),
    accent: cssVar(html, 'poem-accent'),
    mood: html.match(/<body[^>]*\bdata-mood="([^"]+)"/)?.[1] ?? null,
    artworkImage: isOurs ? null : image
  };
}

export function cardHash({ title, lines, bg, text, accent, mood }) {
  const recipe = JSON.stringify({ title, lines, bg, text, accent, mood, v: TEMPLATE_VERSION });
  return createHash('sha256').update(recipe).digest('hex').slice(0, 8);
}

export function cardUrl(slug, hash) {
  return `${SITE}assets/share/${slug}.jpg?v=${hash}`;
}
