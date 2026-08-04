/** Local calendar day as 'YYYY-MM-DD'. Never derived from UTC/ISO slicing. */
export function dateKeyOf(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function todayKey(): string {
  return dateKeyOf(new Date());
}

/** Parse a dateKey into a local-midnight Date. */
export function dateFromKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/** Whole calendar days from `a` to `b` (positive when b is later). */
export function daysBetween(a: string, b: string): number {
  const ms = dateFromKey(b).getTime() - dateFromKey(a).getTime();
  return Math.round(ms / 86_400_000);
}

export function addDays(key: string, days: number): string {
  const d = dateFromKey(key);
  d.setDate(d.getDate() + days);
  return dateKeyOf(d);
}
