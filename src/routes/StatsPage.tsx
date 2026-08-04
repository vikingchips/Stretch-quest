import { useProgressStore } from '../store/progressStore';
import { HeatmapCalendar } from '../components/HeatmapCalendar';
import { CATEGORY_META } from '../components/RoutineCard';
import type { RoutineCategory } from '../types';
import { formatMinutes } from '../lib/format';

export function StatsPage() {
  const progress = useProgressStore((s) => s.progress);
  const sessions = useProgressStore((s) => s.sessions);

  const totalActiveSec = sessions.reduce((sum, s) => sum + s.activeSec, 0);
  const categories: RoutineCategory[] = ['climbing', 'running', 'full-body', 'custom'];
  const byCategory = categories.map((c) => ({
    category: c,
    count: sessions.filter((s) => s.category === c).length,
  }));
  const maxCount = Math.max(1, ...byCategory.map((c) => c.count));

  const totals: Array<[string, string | number]> = [
    ['sessions', sessions.length],
    ['stretched', formatMinutes(totalActiveSec)],
    ['best streak', progress.longestStreak],
  ];

  return (
    <main className="px-6 pb-28 pt-10">
      <h1 className="mb-10 text-2xl lowercase tracking-wide">stats</h1>

      <dl className="mb-14 grid grid-cols-3 gap-6 border-y border-line-soft py-6">
        {totals.map(([label, value]) => (
          <div key={label}>
            <dd className="text-2xl leading-none tabular-nums">{value}</dd>
            <dt className="mt-2 text-[11px] lowercase text-ink-soft">{label}</dt>
          </div>
        ))}
      </dl>

      <section className="mb-14">
        <h2 className="mb-4 text-sm lowercase text-ink-soft">last 16 weeks</h2>
        <HeatmapCalendar sessions={sessions} frozenDateKeys={progress.frozenDateKeys} />
        <div className="mt-4 flex items-center gap-2 text-[10px] lowercase text-ink-soft">
          <span>less</span>
          <span className="h-3 w-3 bg-line-soft" />
          <span className="h-3 w-3 bg-pine/30" />
          <span className="h-3 w-3 bg-pine/60" />
          <span className="h-3 w-3 bg-pine" />
          <span>more</span>
          <span className="ml-3 flex items-center gap-1.5">
            <span className="h-3 w-3 border border-fjord" />
            streak freeze
          </span>
        </div>
      </section>

      <section>
        <h2 className="mb-4 text-sm lowercase text-ink-soft">sessions by type</h2>
        <div className="flex flex-col gap-4">
          {byCategory.map(({ category, count }) => {
            const meta = CATEGORY_META[category];
            return (
              <div key={category} className="flex items-center gap-4">
                <span className="w-20 text-xs lowercase text-ink-soft">{meta.label}</span>
                <div className="h-2 flex-1 bg-line-soft">
                  <div
                    className="h-2 transition-all duration-700 ease-in-out"
                    style={{
                      width: `${(count / maxCount) * 100}%`,
                      backgroundColor: meta.color,
                    }}
                  />
                </div>
                <span className="w-6 text-right text-sm tabular-nums">{count}</span>
              </div>
            );
          })}
        </div>
      </section>
    </main>
  );
}
