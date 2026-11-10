// Reader links created before ADR-0016 used ?poem=<slug>. Resolve only a slug
// already present in the shelf; the query never becomes an arbitrary URL.
export function canonicalPoemHref(search, poemHrefs) {
  const slug = new URLSearchParams(search).get('poem');
  if (!slug) return null;

  const expected = `poems/${slug}.html`;
  return poemHrefs.includes(expected) ? expected : null;
}

export function redirectLegacyReaderLink(documentRef, locationRef) {
  const poemHrefs = Array.from(documentRef.querySelectorAll('a.poem-card'))
    .map(card => card.getAttribute('href'));
  const href = canonicalPoemHref(locationRef.search, poemHrefs);
  if (href) locationRef.replace(new URL(href, locationRef.href).href);
  return href;
}

if (typeof document !== 'undefined' && typeof window !== 'undefined') {
  redirectLegacyReaderLink(document, window.location);
}
