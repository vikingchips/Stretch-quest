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
    if (active >= 900) return 'bg-brand';
    if (active >= 450) return 'bg-brand/70';
    if (active > 0) return 'bg-brand/40';
    return 'bg-line/50';
  }

  return (
    <div className="overflow-x-auto">
      <div className="flex gap-1">
        {columns.map((week, i) => (
          <div key={i} className="flex flex-col gap-1">
            {week.map((day) => {
              const future = day > todayKeyStr;
              return (
                <div
                  key={day}
                  title={day}
                  className={`flex h-4 w-4 items-center justify-center rounded-[4px] text-[9px] leading-none ${
                    future ? 'bg-transparent' : cellClass(day)
                  } ${day === todayKeyStr ? 'ring-1 ring-ink' : ''}`}
                >
                  {!future && frozen.has(day) ? '❄️' : ''}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
