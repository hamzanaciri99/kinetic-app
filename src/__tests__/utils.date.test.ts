import { isSameDay, dayKey, makeId } from '../utils/date';

describe('isSameDay', () => {
  it('returns true for the same date strings', () => {
    expect(isSameDay('2024-01-15T08:00:00.000Z', '2024-01-15T23:59:59.000Z')).toBe(true);
  });

  it('returns false for different dates', () => {
    expect(isSameDay('2024-01-15T08:00:00.000Z', '2024-01-16T00:00:00.000Z')).toBe(false);
  });

  it('works with Date objects', () => {
    const a = new Date('2024-03-10T10:00:00.000Z');
    const b = new Date('2024-03-10T22:00:00.000Z');
    expect(isSameDay(a, b)).toBe(true);
  });

  it('returns false for different month', () => {
    expect(isSameDay('2024-02-15T08:00:00.000Z', '2024-03-15T08:00:00.000Z')).toBe(false);
  });

  it('returns false for different year', () => {
    expect(isSameDay('2023-01-15T08:00:00.000Z', '2024-01-15T08:00:00.000Z')).toBe(false);
  });

  it('handles mixed string and Date inputs', () => {
    const a = '2024-06-01T12:00:00.000Z';
    const b = new Date('2024-06-01T18:00:00.000Z');
    expect(isSameDay(a, b)).toBe(true);
  });
});

describe('dayKey', () => {
  it('returns YYYY-MM-DD format', () => {
    const result = dayKey('2024-01-05T12:00:00.000Z');
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('pads month and day with zeros', () => {
    const d = new Date(2024, 0, 5); // Jan 5
    const result = dayKey(d);
    expect(result).toMatch(/-01-05$/);
  });

  it('works with Date objects', () => {
    const d = new Date(2024, 11, 25); // Dec 25
    const result = dayKey(d);
    expect(result).toContain('2024');
  });
});

describe('makeId', () => {
  it('returns a non-empty string', () => {
    expect(typeof makeId()).toBe('string');
    expect(makeId().length).toBeGreaterThan(0);
  });

  it('generates unique IDs', () => {
    const ids = new Set(Array.from({ length: 100 }, () => makeId()));
    expect(ids.size).toBe(100);
  });

  it('contains a timestamp component', () => {
    const id = makeId();
    const [timestamp] = id.split('-');
    expect(Number(timestamp)).toBeGreaterThan(0);
  });
});
