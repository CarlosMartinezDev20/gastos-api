/** Where a page of movements ends: the last one's date and id, the same
 * order the list uses (date desc, id desc), so new movements don't shift
 * the pages already loaded. */
export const CURSOR_PATTERN =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z_[0-9a-f-]{36}$/;

export function encodeCursor(last: { date: Date; id: string }) {
  return `${last.date.toISOString()}_${last.id}`;
}

export function decodeCursor(cursor: string) {
  const split = cursor.indexOf('_');
  return {
    date: new Date(cursor.slice(0, split)),
    id: cursor.slice(split + 1),
  };
}

/** Lowercase without the accents the app ignores, so "cafe" finds "Café". */
export function normalizeSearch(query: string) {
  return query
    .trim()
    .toLowerCase()
    .replace(/[áéíóúü]/g, (c) => SEARCH_FROM_TO[c]);
}

/** For SQL `translate(...)`: the same letters, in the same order. */
export const SEARCH_FROM = 'áéíóúü';
export const SEARCH_TO = 'aeiouu';
const SEARCH_FROM_TO: Record<string, string> = Object.fromEntries(
  [...SEARCH_FROM].map((c, i) => [c, SEARCH_TO[i]]),
);

/** Escapes LIKE wildcards so "50%" is searched literally. */
export function likePattern(search: string) {
  return `%${search.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
}
