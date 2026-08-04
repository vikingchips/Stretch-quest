import { useMemo } from 'react';
import type { SessionRecord } from '../types';
import { addDays, dateKeyOf } from '../game/dates';

interface Props {
  sessions: SessionRecord[];
  frozenDateKeys: string[];
  weeks?: number;
}

/** GitHub-style activity grid: one column per week, Monday-first rows. */
export function HeatmapCalendar({ sessions, frozenDateKeys, weeks = 16 }: Props) {
  const { columns, activeByDay, frozen } = useMemo(() => {
    const activeByDay = new Map<string, number>();
    for (const s of sessions) {
      activeByDay.set(s.dateKey, (activeByDay.get(s.dateKey) ?? 0) + s.activeSec);
    }
    const frozen = new Set(frozenDateKeys);

    const today = new Date();
    const todayIdx = (today.getDay() + 6) % 7; // Monday = 0
    const lastMonday = addDays(dateKeyOf(today), -todayIdx);
    const columns: string[][] = [];
    for (let w = weeks - 1; w >= 0; w--) {
      const monday = addDays(lastMonday, -7 * w);
      columns.push(Array.from({ length: 7 }, (_, d) => addDays(monday, d)));
    }
    return { columns, activeByDay, frozen };
  }, [sessions, frozenDateKeys, weeks]);

  const todayKeyStr = dateKeyOf(new Date());

  function cellClass(day: string): string {
    const active = activeByDay.get(day) ?? 0;
    if (active >= 900) return 'bg-pine';
    if (active >= 450) return 'bg-pine/60';
    if (active > 0) return 'bg-pine/30';
    return 'bg-line-soft';
  }

  return (
    <div className="overflow-x-auto">
      <div className="flex gap-[3px]">
        {columns.map((week, i) => (
          <div key={i} className="flex flex-col gap-[3px]">
            {week.map((day) => {
              const future = day > todayKeyStr;
              // Frozen days get a hollow fjord square instead of a fill, so
              // they read as "held" rather than "earned".
              const isFrozen = !future && frozen.has(day);
              return (
                <div
                  key={day}
                  title={day}
                  className={`h-4 w-4 ${
                    future
                      ? 'bg-transparent'
                      : isFrozen
                        ? 'border border-fjord bg-transparent'
                        : cellClass(day)
                  } ${
                    day === todayKeyStr
                      ? 'outline outline-1 outline-offset-1 outline-ink-soft'
                      : ''
                  }`}
                />
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
