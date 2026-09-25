// Renders each poem's link-preview card (1200×630 JPEG) and points the page's
// og:image at it. Runs on the author's Mac only: it drives local Chrome in
// headless mode and converts with macOS `sips`. CI never renders; it only
// checks freshness (build-content.mjs --check). See docs/api.md §3.
//
//   node tools/build-share-cards.mjs              # render every stale card
//   node tools/build-share-cards.mjs --only <slug>
//   node tools/build-share-cards.mjs --force      # re-render fresh cards too

import { readdir, readFile, writeFile, mkdtemp, rm, stat, access } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';
import { execFile, spawn } from 'node:child_process';
import { promisify } from 'node:util';
import { readShareInputs, cardHash, cardUrl, ogImage } from './share-inputs.mjs';

const run = promisify(execFile);
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const poemsDir = join(root, 'poems');
const shareDir = join(root, 'assets', 'share');
const CHROME = process.env.CHROME_PATH
  ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const MAX_BYTES = 300 * 1024;
const CONCURRENCY = 4;

const args = process.argv.slice(2);
const only = args.includes('--only') ? args[args.indexOf('--only') + 1] : null;
const force = args.includes('--force');

const escapeHtml = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;')
  .replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// Mood → ornament SVGs, read from the [data-mood="…"] blocks in style.css so
// the card and the page always use the same ornaments.
async function loadMoods() {
  const css = await readFile(join(root, 'css', 'style.css'), 'utf8');
  const moods = {};
  for (const [, name, body] of css.matchAll(/\[data-mood="([^"]+)"\]\s*\{([^}]*)\}/g)) {
    const svg = async key => {
      const file = body.match(new RegExp(`--ornament-${key}:\\s*url\\(\\.\\./([^)]+)\\)`))?.[1];
      if (!file) return null;
      const data = await readFile(join(root, file), 'utf8');
      return `url("data:image/svg+xml,${encodeURIComponent(data)}")`;
    };
    moods[name] = { divider: await svg('divider'), end: await svg('end') };
  }
  return moods;
}

// Some poems are prose paragraphs; a preview only needs the opening.
const MAX_LINE_CHARS = 110;
const clip = line => line.length <= MAX_LINE_CHARS
  ? line
  : line.slice(0, line.lastIndexOf(' ', MAX_LINE_CHARS)).replace(/[,;:—-]+$/, '') + '…';

function fillTemplate(template, inputs, mood) {
  const ornament = mood?.divider
    ? `<div class="ornament masked" style='--ornament: ${mood.divider}'></div>`
    : '<div class="ornament rule"></div>';
  const endmark = mood?.end
    ? `<div class="end ornament masked" style='--ornament: ${mood.end}'></div>`
    : '';
  const values = {
    bg: inputs.bg,
    text: inputs.text,
    accent: inputs.accent,
    title: escapeHtml(inputs.title),
    lines: inputs.lines.map(l => `<p>${escapeHtml(clip(l))}</p>`).join(''),
    ornament,
    endmark
  };
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => values[key]);
}

function rewriteHead(html, url, alt) {
  const metaLine = /^[ \t]*<meta (?:property="og:image(?::\w+)?"|name="twitter:image")[^>]*>\n/gm;
  const block =
    `  <meta property="og:image"        content="${url}">\n` +
    `  <meta property="og:image:width"  content="1200">\n` +
    `  <meta property="og:image:height" content="630">\n` +
    `  <meta property="og:image:alt"    content="${escapeHtml(alt)}">\n` +
    `  <meta name="twitter:image"       content="${url}">\n`;
  const at = html.search(metaLine);
  const stripped = html.replace(metaLine, '');
  return stripped.slice(0, at) + block + stripped.slice(at);
}

// Chrome writes the screenshot but, in current versions, often never exits
// in headless mode. So wait for the PNG to appear and stop growing, then
// close Chrome ourselves.
async function screenshot(page, png, profile) {
  const chrome = spawn(CHROME, [
    '--headless', '--disable-gpu', '--hide-scrollbars', '--no-first-run',
    '--force-device-scale-factor=1', '--window-size=1200,630',
    '--virtual-time-budget=5000', `--user-data-dir=${profile}`,
    `--screenshot=${png}`, `file://${page}`
  ], { stdio: 'ignore' });
  try {
    let lastSize = -1;
    for (let waited = 0; waited < 30_000; waited += 250) {
      await new Promise(r => setTimeout(r, 250));
      const size = await stat(png).then(s => s.size, () => 0);
      if (size > 0 && size === lastSize) return;
      lastSize = size;
    }
    throw new Error('Chrome produced no screenshot within 30 s');
  } finally {
    chrome.kill();
  }
}

async function renderCard(slug, cardHtml, workDir) {
  const page = join(workDir, `${slug}.html`);
  const png = join(workDir, `${slug}.png`);
  const jpg = join(shareDir, `${slug}.jpg`);
  await writeFile(page, cardHtml);
  await screenshot(page, png, join(workDir, `profile-${slug}`));
  await run('sips', ['-s', 'format', 'jpeg', '-s', 'formatOptions', '82', png, '--out', jpg]);
  return (await stat(jpg)).size;
}

async function processPoem(file, ctx) {
  const slug = file.replace(/\.html$/, '');
  const path = join(poemsDir, file);
  const html = await readFile(path, 'utf8');
  const inputs = readShareInputs(html, slug);
  if (inputs.artworkImage) return `${slug}: kept artwork`;
  if (inputs.mood && !ctx.moods[inputs.mood]) {
    throw new Error(`${slug}: unknown mood "${inputs.mood}" (not defined in css/style.css)`);
  }

  const url = cardUrl(slug, cardHash(inputs));
  const exists = await access(join(shareDir, `${slug}.jpg`)).then(() => true, () => false);
  if (!force && exists && ogImage(html) === url) return `${slug}: fresh`;

  const cardHtml = fillTemplate(ctx.template, inputs, ctx.moods[inputs.mood]);
  const bytes = await renderCard(slug, cardHtml, ctx.workDir);
  // The page is rewritten only after the JPEG exists, so it never points at a
  // missing image; a crash in between just leaves the card reported stale.
  await writeFile(path, rewriteHead(html, url, `${inputs.title} — ${inputs.lines[0] ?? ''}`));
  const size = `${Math.round(bytes / 1024)} KB`;
  return bytes > MAX_BYTES ? `${slug}: rendered, WARNING ${size} is over 300 KB` : `${slug}: rendered (${size})`;
}

async function main() {
  const missing = [];
  await access(CHROME).catch(() => missing.push(`Chrome not found at ${CHROME} (set CHROME_PATH)`));
  await run('which', ['sips']).catch(() => missing.push('sips not found (macOS only)'));
  if (missing.length) {
    console.error(missing.join('\n'));
    process.exit(2);
  }

  let files = (await readdir(poemsDir)).filter(f => f.endsWith('.html')).sort();
  if (only) files = files.filter(f => f === `${only}.html`);
  if (only && !files.length) {
    console.error(`No poem named ${only}`);
    process.exit(1);
  }

  const ctx = {
    template: await readFile(join(root, 'tools', 'share-card.html'), 'utf8'),
    moods: await loadMoods(),
    workDir: await mkdtemp(join(tmpdir(), 'share-cards-'))
  };

  const results = [];
  const queue = [...files];
  const worker = async () => {
    for (let file; (file = queue.shift()); ) {
      const line = await processPoem(file, ctx).catch(err => `FAILED ${file}: ${err.message.split('\n')[0]}`);
      console.log(line);
      results.push(line);
    }
  };
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));
  await rm(ctx.workDir, { recursive: true, force: true });

  const count = word => results.filter(r => r.includes(word)).length;
  console.log(`\n${count(': rendered')} rendered, ${count(': fresh')} fresh, ` +
    `${count('kept artwork')} kept artwork, ${count('FAILED')} failed`);
  if (count('FAILED')) process.exit(1);
}

await main();
