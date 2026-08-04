export function formatClock(totalSec: number): string {
  const sec = Math.max(0, Math.ceil(totalSec));
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export function formatMinutes(totalSec: number): string {
  const min = Math.round(totalSec / 60);
  if (min < 1) return '<1 min';
  return `${min} min`;
}

export function formatAreaLabel(area: string): string {
  return area.charAt(0).toUpperCase() + area.slice(1);
}
