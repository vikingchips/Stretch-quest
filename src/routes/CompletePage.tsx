import { useEffect, useState } from 'react';
import { Link, Navigate, useLocation } from 'react-router-dom';
import type { SessionSummary } from '../types';
import { ACHIEVEMENT_BY_ID } from '../data/achievements';
import { ConfettiBurst } from '../components/ConfettiBurst';
import { StreakFlame } from '../components/StreakFlame';
import { formatMinutes } from '../lib/format';

function useCountUp(target: number, durationMs = 900): number {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (target === 0) return;
    const start = performance.now();
    let raf: number;
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs);
      setValue(Math.round(target * (1 - Math.pow(1 - t, 3))));
      if (t < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, durationMs]);
  return value;
}

export function CompletePage() {
  const location = useLocation();
  const summary = location.state as SessionSummary | null;
  const xpShown = useCountUp(summary?.xpBreakdown.total ?? 0);

  if (!summary) return <Navigate to="/" replace />;

  const { record, xpBreakdown, levelBefore, levelAfter, streakAfter, goalMetNow, newBadgeIds } =
    summary;
  const leveledUp = levelAfter > levelBefore;

  const rows: Array<[string, number]> = [
    ['Session complete', xpBreakdown.base],
    [`Stretch time (${formatMinutes(record.activeSec)})`, xpBreakdown.activeTime],
    ['No skips', xpBreakdown.noSkipBonus],
    ['Daily goal met', xpBreakdown.goalBonus],
    ['Streak milestone', xpBreakdown.streakMilestoneBonus],
  ];

  return (
    <main className="flex min-h-dvh flex-col items-center px-4 pb-10 pt-14 text-center">
      <ConfettiBurst variant="big" />
      <span className="text-6xl animate-pop-in">🎉</span>
      <h1 className="mt-3 text-3xl font-extrabold">Nice stretch!</h1>
      <p className="mt-1 text-sm font-semibold text-ink-dim">{record.routineName}</p>

      <div className="mt-6 text-5xl font-extrabold text-gold">+{xpShown} XP</div>

      {xpBreakdown.total > 0 ? (
        <div className="mt-4 w-full max-w-sm rounded-2xl bg-card p-4 text-left">
          {rows.map(
            ([label, xp]) =>
              xp > 0 && (
                <div key={label} className="flex justify-between py-1 text-sm font-bold">
                  <span className="text-ink-dim">{label}</span>
                  <span className="text-gold">+{xp}</span>
                </div>
              ),
          )}
        </div>
      ) : (
        <p className="mt-4 max-w-sm text-sm font-semibold text-ink-dim">
          Sessions need at least 1 minute of stretching to earn XP and keep the streak alive.
        </p>
      )}

      {leveledUp && (
        <div className="mt-4 w-full max-w-sm rounded-2xl bg-gold/15 p-4 font-extrabold text-gold animate-pop-in">
          ⬆️ Level up! You reached level {levelAfter}
        </div>
      )}

      <div className="mt-6 animate-pop-in" style={{ animationDelay: '0.3s' }}>
        <StreakFlame streak={streakAfter} size="lg" />
      </div>

      {goalMetNow && (
        <div className="mt-3 text-sm font-extrabold text-brand">✅ Daily goal smashed!</div>
      )}

      {newBadgeIds.length > 0 && (
        <div className="mt-6 w-full max-w-sm">
          <h2 className="mb-2 text-sm font-extrabold uppercase tracking-wide text-ink-dim">
            New badges
          </h2>
          <div className="flex flex-col gap-2">
            {newBadgeIds.map((id, i) => {
              const badge = ACHIEVEMENT_BY_ID[id];
              if (!badge) return null;
              return (
                <div
                  key={id}
                  className="flex items-center gap-3 rounded-2xl bg-card p-3 text-left animate-pop-in"
                  style={{ animationDelay: `${0.45 + i * 0.18}s` }}
                >
                  <span className="text-3xl">{badge.emoji}</span>
                  <div>
                    <div className="font-extrabold">{badge.name}</div>
                    <div className="text-xs font-semibold text-ink-dim">{badge.description}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <Link
        to="/"
        className="mt-8 w-full max-w-sm rounded-2xl bg-brand py-4 text-lg font-extrabold text-surface shadow-lg shadow-brand/30 active:scale-[0.98]"
      >
        Continue
      </Link>
    </main>
  );
}
