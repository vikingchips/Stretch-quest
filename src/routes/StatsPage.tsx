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

  return (
    <main className="px-4 pb-24 pt-6">
      <h1 className="mb-4 text-2xl font-extrabold">Stats</h1>

      <section className="mb-5 grid grid-cols-3 gap-2">
        <div className="rounded-2xl bg-card p-3 text-center">
          <div className="text-2xl font-extrabold text-brand">{sessions.length}</div>
          <div className="text-[11px] font-bold text-ink-dim">sessions</div>
        </div>
        <div className="rounded-2xl bg-card p-3 text-center">
          <div className="text-2xl font-extrabold text-frost">
            {formatMinutes(totalActiveSec)}
          </div>
          <div className="text-[11px] font-bold text-ink-dim">stretched</div>
        </div>
        <div className="rounded-2xl bg-card p-3 text-center">
          <div className="text-2xl font-extrabold text-flame">{progress.longestStreak}</div>
          <div className="text-[11px] font-bold text-ink-dim">best streak</div>
        </div>
      </section>

      <section className="mb-5 rounded-2xl bg-card p-4">
        <h2 className="mb-3 text-sm font-extrabold uppercase tracking-wide text-ink-dim">
          Last 16 weeks
        </h2>
        <HeatmapCalendar sessions={sessions} frozenDateKeys={progress.frozenDateKeys} />
        <div className="mt-3 flex items-center gap-2 text-[10px] font-bold text-ink-dim">
          <span>Less</span>
          <span className="h-3 w-3 rounded-[3px] bg-line/50" />
          <span className="h-3 w-3 rounded-[3px] bg-brand/40" />
          <span className="h-3 w-3 rounded-[3px] bg-brand/70" />
          <span className="h-3 w-3 rounded-[3px] bg-brand" />
          <span>More</span>
          <span className="ml-2">❄️ = streak freeze</span>
        </div>
      </section>

      <section className="rounded-2xl bg-card p-4">
        <h2 className="mb-3 text-sm font-extrabold uppercase tracking-wide text-ink-dim">
          Sessions by type
        </h2>
        <div className="flex flex-col gap-2">
          {byCategory.map(({ category, count }) => {
            const meta = CATEGORY_META[category];
            return (
              <div key={category} className="flex items-center gap-2">
                <span className="w-6 text-center">{meta.emoji}</span>
                <div className="h-5 flex-1 overflow-hidden rounded-full bg-line/40">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${(count / maxCount) * 100}%`,
                      backgroundColor: meta.color,
                      minWidth: count > 0 ? '1.25rem' : 0,
                    }}
                  />
                </div>
                <span className="w-8 text-right text-sm font-extrabold">{count}</span>
              </div>
            );
          })}
        </div>
      </section>
    </main>
  );
}
