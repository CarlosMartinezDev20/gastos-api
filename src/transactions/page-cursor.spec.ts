import {
  CURSOR_PATTERN,
  decodeCursor,
  encodeCursor,
  likePattern,
  normalizeSearch,
} from './page-cursor';

describe('page cursor', () => {
  it('round-trips the last movement of a page', () => {
    const last = {
      date: new Date('2026-10-08T15:04:05.123Z'),
      id: '0b7c2a8e-1d2f-4c3b-9a8e-7f6d5c4b3a21',
    };
    const cursor = encodeCursor(last);
    expect(cursor).toMatch(CURSOR_PATTERN);
    expect(decodeCursor(cursor)).toEqual(last);
  });

  it('searches like the app: lowercase, no accents, literal wildcards', () => {
    expect(normalizeSearch('  Café ÚNICO ')).toBe('cafe unico');
    expect(normalizeSearch('Piñata')).toBe('piñata');
    expect(likePattern('50%_a\\b')).toBe('%50\\%\\_a\\\\b%');
  });
});
