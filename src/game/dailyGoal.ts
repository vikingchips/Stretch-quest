import type { SessionRecord } from '../types';

/** Total active seconds recorded on a given local day. */
export function activeSecOnDay(sessions: SessionRecord[], dateKey: string): number {
  let total = 0;
  for (const s of sessions) {
    if (s.dateKey === dateKey) total += s.activeSec;
  }
  return total;
}

export function goalProgress(
  sessions: SessionRecord[],
  dateKey: string,
  dailyGoalMinutes: number,
): { activeSec: number; goalSec: number; met: boolean; fraction: number } {
  const activeSec = activeSecOnDay(sessions, dateKey);
  const goalSec = dailyGoalMinutes * 60;
  return {
    activeSec,
    goalSec,
    met: activeSec >= goalSec,
    fraction: goalSec === 0 ? 0 : Math.min(1, activeSec / goalSec),
  };
}
