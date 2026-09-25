// Renders each poem's link-preview card (1200×630 JPEG) into assets/share/.
// Runs automatically in the deploy job; see docs/api.md and ADR-0013.
//
//   node tools/build-share-cards.mjs                 # render cards for a look
//   node tools/build-share-cards.mjs --only <slug>
//   node tools/build-share-cards.mjs --stamp         # deploy: also point each
//                                                    # page's og:image at its card
//
// Chrome is driven over the DevTools Protocol (CDP): one headless browser,
// a tab per card, and Chrome hands back the JPEG itself. Node 22+ is needed
// for the built-in WebSocket. Rendering fails open: a card that can't be made
// leaves its page on the default image, and the run still exits 0.

import { readdir, readFile, writeFile, mkdtemp, mkdir, rm } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { tmpdir } from 'node:os';
import { spawn } from 'node:child_process';
import { readShareInputs, cardHash, cardUrl, DEFAULT_OG_IMAGE } from './share-inputs.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const poemsDir = join(root, 'poems');
const shareDir = join(root, 'assets', 'share');
const CHROME = process.env.CHROME_PATH ?? (process.platform === 'darwin'
  ? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
  : 'google-chrome');
const CONCURRENCY = 4;
const CARD_TIMEOUT_MS = 20_000;
const MAX_LINE_CHARS = 110;

const args = process.argv.slice(2);
const only = args.includes('--only') ? args[args.indexOf('--only') + 1] : null;
const stamp = args.includes('--stamp');

const escapeHtml = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;')
  .replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// Some poems are prose paragraphs; a preview only needs the opening.
const clip = line => line.length <= MAX_LINE_CHARS
  ? line
  : line.slice(0, line.lastIndexOf(' ', MAX_LINE_CHARS)).replace(/[,;:—-]+$/, '') + '…';

const sleep = ms => new Promise(r => setTimeout(r, ms));

function withTimeout(promise, ms, what) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(`${what} timed out after ${ms / 1000} s`)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

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

// Starts headless Chrome and connects to its DevTools WebSocket. Returns a
// tiny CDP client: send(method, params, sessionId) and once(event, sessionId).
async function launchChrome(profile) {
  const flags = [
    '--headless', '--disable-gpu', '--hide-scrollbars', '--no-first-run',
    '--no-default-browser-check', '--remote-debugging-port=0',
    `--user-data-dir=${profile}`, 'about:blank'
  ];
  // Ubuntu 24.04 blocks the unprivileged namespaces Chrome's sandbox needs.
  if (process.platform === 'linux') flags.unshift('--no-sandbox');
  const chrome = spawn(CHROME, flags, { stdio: 'ignore' });
  const exited = new Promise((_, reject) => {
    chrome.on('error', err => reject(new Error(`could not start Chrome at ${CHROME}: ${err.message}`)));
  });

  // Chrome writes its chosen port and WebSocket path here once it is ready.
  const portFile = async () => {
    for (let waited = 0; waited < 10_000; waited += 100) {
      const text = await readFile(join(profile, 'DevToolsActivePort'), 'utf8').catch(() => '');
      const [port, path] = text.split('\n');
      if (port && path) return `ws://127.0.0.1:${port}${path}`;
      await sleep(100);
    }
    throw new Error('Chrome did not open a DevTools port within 10 s');
  };
  const wsUrl = await Promise.race([portFile(), exited]);

  const ws = new WebSocket(wsUrl);
  await new Promise((resolve, reject) => {
    ws.onopen = resolve;
    ws.onerror = () => reject(new Error('could not connect to Chrome DevTools'));
  });

  let nextId = 0;
  const pending = new Map();
  const waiters = [];
  ws.onmessage = ({ data }) => {
    const msg = JSON.parse(data);
    if (msg.id !== undefined) {
      const { resolve, reject } = pending.get(msg.id);
      pending.delete(msg.id);
      msg.error ? reject(new Error(msg.error.message)) : resolve(msg.result);
      return;
    }
    const i = waiters.findIndex(w => w.method === msg.method && w.sessionId === msg.sessionId);
    if (i !== -1) waiters.splice(i, 1)[0].resolve(msg.params);
  };

  return {
    send(method, params = {}, sessionId) {
      const id = ++nextId;
      ws.send(JSON.stringify({ id, method, params, sessionId }));
      return new Promise((resolve, reject) => pending.set(id, { resolve, reject }));
    },
    once(method, sessionId) {
      return new Promise(resolve => waiters.push({ method, sessionId, resolve }));
    },
    close() {
      ws.close();
      chrome.kill();
    }
  };
}

async function renderCard(cdp, slug, cardHtml, workDir) {
  const page = join(workDir, `${slug}.html`);
  await writeFile(page, cardHtml);

  const { targetId } = await cdp.send('Target.createTarget', { url: 'about:blank' });
  const { sessionId } = await cdp.send('Target.attachToTarget', { targetId, flatten: true });
  try {
    await cdp.send('Emulation.setDeviceMetricsOverride',
      { width: 1200, height: 630, deviceScaleFactor: 1, mobile: false }, sessionId);
    await cdp.send('Page.enable', {}, sessionId);
    const loaded = cdp.once('Page.loadEventFired', sessionId);
    await cdp.send('Page.navigate', { url: pathToFileURL(page).href }, sessionId);
    await loaded;
    // Fonts first, then two frames so the verse-fitting script has run.
    await cdp.send('Runtime.evaluate', {
      expression: 'document.fonts.ready.then(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))))',
      awaitPromise: true
    }, sessionId);
    const { data } = await cdp.send('Page.captureScreenshot', {
      format: 'jpeg', quality: 82, clip: { x: 0, y: 0, width: 1200, height: 630, scale: 1 }
    }, sessionId);
    const jpeg = Buffer.from(data, 'base64');
    await writeFile(join(shareDir, `${slug}.jpg`), jpeg);
    return jpeg.length;
  } finally {
    await cdp.send('Target.closeTarget', { targetId }).catch(() => {});
  }
}

async function processPoem(file, ctx) {
  const slug = file.replace(/\.html$/, '');
  const path = join(poemsDir, file);
  const html = await readFile(path, 'utf8');
  const inputs = readShareInputs(html, slug);
  if (inputs.artworkImage) return `${slug}: kept artwork`;

  const alt = `${inputs.title} — ${inputs.lines[0] ?? ''}`;
  let line;
  let url;
  try {
    if (!ctx.cdp) throw new Error(ctx.launchError);
    const cardHtml = fillTemplate(ctx.template, inputs, ctx.moods[inputs.mood]);
    const bytes = await withTimeout(renderCard(ctx.cdp, slug, cardHtml, ctx.workDir), CARD_TIMEOUT_MS, 'render');
    url = cardUrl(slug, cardHash(inputs));
    line = `${slug}: rendered (${Math.round(bytes / 1024)} KB)`;
  } catch (err) {
    url = DEFAULT_OG_IMAGE;
    line = `WARNING ${slug}: no card, using the default image (${err.message.split('\n')[0]})`;
  }
  if (stamp) await writeFile(path, rewriteHead(html, url, alt));
  return line;
}

async function main() {
  let files = (await readdir(poemsDir)).filter(f => f.endsWith('.html')).sort();
  if (only) files = files.filter(f => f === `${only}.html`);
  if (only && !files.length) {
    console.error(`No poem named ${only}`);
    process.exit(1);
  }

  // Invalid inputs are the author's to fix, so they stop the run before any
  // rendering. Everything after this point fails open.
  const moods = await loadMoods();
  for (const file of files) {
    const slug = file.replace(/\.html$/, '');
    const inputs = readShareInputs(await readFile(join(poemsDir, file), 'utf8'), slug);
    if (inputs.mood && !moods[inputs.mood]) {
      console.error(`${slug}: unknown mood "${inputs.mood}" (not defined in css/style.css)`);
      process.exit(1);
    }
  }

  await mkdir(shareDir, { recursive: true });
  const workDir = await mkdtemp(join(tmpdir(), 'share-cards-'));
  const ctx = {
    template: await readFile(join(root, 'tools', 'share-card.html'), 'utf8'),
    moods,
    workDir,
    cdp: null,
    launchError: null
  };
  try {
    ctx.cdp = await launchChrome(join(workDir, 'profile'));
  } catch (err) {
    ctx.launchError = err.message;
  }

  const results = [];
  const queue = [...files];
  const worker = async () => {
    for (let file; (file = queue.shift()); ) {
      const line = await processPoem(file, ctx);
      console.log(line);
      results.push(line);
    }
  };
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));
  ctx.cdp?.close();
  await rm(workDir, { recursive: true, force: true }).catch(() => {});

  const count = word => results.filter(r => r.includes(word)).length;
  console.log(`\n${count(': rendered')} rendered, ${count('kept artwork')} kept artwork, ` +
    `${count('WARNING')} fell back to the default image`);
}

await main();
