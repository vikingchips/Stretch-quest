import { describe, expect, it } from 'vitest';
import { addDays, dateKeyOf, daysBetween } from './dates';

describe('dates', () => {
  it('formats local dates as YYYY-MM-DD', () => {
    expect(dateKeyOf(new Date(2026, 7, 2))).toBe('2026-08-02');
    expect(dateKeyOf(new Date(2026, 0, 9))).toBe('2026-01-09');
  });

  it('counts whole days between keys', () => {
    expect(daysBetween('2026-08-01', '2026-08-02')).toBe(1);
    expect(daysBetween('2026-07-31', '2026-08-02')).toBe(2);
    expect(daysBetween('2025-12-31', '2026-01-01')).toBe(1);
    expect(daysBetween('2026-08-02', '2026-08-02')).toBe(0);
  });

  it('adds and subtracts days across boundaries', () => {
    expect(addDays('2026-08-01', 1)).toBe('2026-08-02');
    expect(addDays('2026-01-01', -1)).toBe('2025-12-31');
    expect(addDays('2026-02-28', 1)).toBe('2026-03-01');
    expect(addDays('2024-02-28', 1)).toBe('2024-02-29'); // leap year
  });
});
