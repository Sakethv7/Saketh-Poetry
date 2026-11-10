import fs from 'node:fs';
import path from 'node:path';
import { canonicalPoemHref } from '../js/legacy-reader-redirect.js';

const root = path.resolve(import.meta.dirname, '..');
const index = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const cardHrefs = [...index.matchAll(
  /<a href="(poems\/[a-z0-9-]+\.html)" class="poem-card"/g
)].map(match => match[1]);
const poemFiles = fs.readdirSync(path.join(root, 'poems'))
  .filter(file => file.endsWith('.html'))
  .map(file => `poems/${file}`);

const failures = [];
const check = (condition, message) => {
  if (!condition) failures.push(message);
};

check(cardHrefs.length === 71, `expected 71 poem cards, found ${cardHrefs.length}`);
check(new Set(cardHrefs).size === cardHrefs.length, 'poem-card hrefs must be unique');
check(poemFiles.length === 71, `expected 71 poem pages, found ${poemFiles.length}`);
check(poemFiles.every(file => cardHrefs.includes(file)), 'every poem page must have a card');
check(cardHrefs.every(file => fs.existsSync(path.join(root, file))), 'every card must target a poem page');
check(!/bookReader|book-reader|openBook\(/.test(index), 'homepage must not restore the second reader');
check(index.includes('js/legacy-reader-redirect.js'), 'homepage must load the legacy redirect shim');

const known = 'poems/pratichhaya.html';
check(canonicalPoemHref('?poem=pratichhaya', cardHrefs) === known, 'known legacy slug must resolve');
check(canonicalPoemHref('?poem=not-a-poem', cardHrefs) === null, 'unknown legacy slug must stay unresolved');
check(canonicalPoemHref('?poem=../index', cardHrefs) === null, 'path-like legacy slug must stay unresolved');
check(canonicalPoemHref('', cardHrefs) === null, 'missing legacy slug must stay unresolved');
check(
  canonicalPoemHref('?poem=pratichhaya', cardHrefs) === canonicalPoemHref('?poem=pratichhaya', cardHrefs),
  'legacy resolution must be repeatable'
);

for (const file of ['index.html', ...poemFiles]) {
  const html = fs.readFileSync(path.join(root, file), 'utf8');
  check(html.includes('style.css?v=17'), `${file} must use the current stylesheet cache key`);
}

if (failures.length) {
  failures.forEach(failure => console.error(`reading-path check: ${failure}`));
  process.exit(1);
}

console.log(`reading paths are canonical (${cardHrefs.length} cards, ${poemFiles.length} pages)`);
