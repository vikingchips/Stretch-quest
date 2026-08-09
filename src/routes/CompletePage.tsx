import { useEffect, useState } from 'react';
import { Link, Navigate, useLocation } from 'react-router-dom';
import type { SessionSummary } from '../types';
import { ACHIEVEMENT_BY_ID } from '../data/achievements';
import { StreakStat } from '../components/StreakStat';
import { Icon } from '../components/Icon';
import { formatMinutes } from '../lib/format';
import { HangIndicators } from '../components/HangIndicators';
import type { HandIndicators } from '../finger/summary';

/** Eases to the total over ~1.4s — a slow settle, not a slot machine. */
function useCountUp(target: number, durationMs = 1400): number {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (target === 0) return;
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduced) {
      setValue(target);
      return;
    }
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

/** Extras the finger module passes through router state. */
interface CompleteState extends SessionSummary {
  fingerNote?: string;
  hangIndicators?: HandIndicators[];
}

export function CompletePage() {
  const location = useLocation();
  const summary = location.state as CompleteState | null;
  const xpShown = useCountUp(summary?.xpBreakdown.total ?? 0);

  if (!summary) return <Navigate to="/" replace />;

  const { record, xpBreakdown, levelBefore, levelAfter, streakAfter, goalMetNow, newBadgeIds } =
    summary;
  const leveledUp = levelAfter > levelBefore;
  // Hang time is not stretch time, and calling it that on the one screen that
  // reports the number would be quietly wrong.
  const timeLabel = record.category === 'fingers' ? 'time under tension' : 'stretch time';

  const rows: Array<[string, number]> = [
    ['session complete', xpBreakdown.base],
    [`${timeLabel} (${formatMinutes(record.activeSec)})`, xpBreakdown.activeTime],
    ['no skips', xpBreakdown.noSkipBonus],
    // Paid for the first session of the day, not for finishing the plan —
    // which is a different question, and one the home screen answers.
    ['first session today', xpBreakdown.goalBonus],
    ['streak milestone', xpBreakdown.streakMilestoneBonus],
  ];

  return (
    <main className="animate-reveal flex min-h-dvh flex-col items-center px-6 pb-12 pt-20 text-center">
      <h1 className="text-2xl lowercase">that's done</h1>
      <p className="mt-2 text-sm lowercase text-ink-soft">{record.routineName}</p>

      <div className="display mt-12 text-6xl leading-none tabular-nums">+{xpShown}</div>
      <div className="mt-2 text-xs lowercase tracking-[0.18em] text-ink-soft">xp</div>

      {xpBreakdown.total > 0 ? (
        <dl className="mt-10 w-full max-w-sm border-t border-line-soft text-left">
          {rows.map(
            ([label, xp]) =>
              xp > 0 && (
                <div
                  key={label}
                  className="flex justify-between border-b border-line-soft py-2.5 text-sm lowercase"
                >
                  <dt className="text-ink-soft">{label}</dt>
                  <dd className="tabular-nums">+{xp}</dd>
                </div>
              ),
          )}
        </dl>
      ) : (
        <p className="measure mt-8 text-sm leading-relaxed text-ink-soft">
          Sessions need at least a minute of work to earn XP and hold the streak.
        </p>
      )}

      {summary.fingerNote && (
        <p className="measure mt-10 border-t border-line-soft pt-4 text-sm leading-relaxed text-clay">
          {summary.fingerNote}
        </p>
      )}

      {summary.hangIndicators && summary.hangIndicators.length > 0 && (
        <div className="mt-14 flex justify-center">
          <HangIndicators indicators={summary.hangIndicators} />
        </div>
      )}

      {leveledUp && (
        <p className="mt-8 text-sm lowercase text-pine-deep">
          level {levelAfter} reached
        </p>
      )}

      <div className="mt-14">
        <StreakStat streak={streakAfter} size="lg" />
      </div>

      {goalMetNow && (
        <p className="mt-6 inline-flex items-center gap-2 text-sm lowercase text-pine-deep">
          <Icon name="check" size={15} />
          today counted
        </p>
      )}

      {newBadgeIds.length > 0 && (
        <div className="mt-14 w-full max-w-sm text-left">
          <h2 className="mb-1 text-sm lowercase text-ink-soft">new badges</h2>
          <div className="border-t border-line-soft">
            {newBadgeIds.map((id) => {
              const badge = ACHIEVEMENT_BY_ID[id];
              if (!badge) return null;
              return (
                <div key={id} className="flex items-center gap-4 border-b border-line-soft py-4">
                  <span className="text-pine">
                    <Icon name={badge.icon} size={26} strokeWidth={1.15} />
                  </span>
                  <div>
                    <div className="text-sm lowercase">{badge.name}</div>
                    <div className="mt-0.5 text-xs text-ink-soft">{badge.description}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <Link
        to="/"
        className="mt-16 w-full max-w-sm bg-pine-deep py-4 text-sm lowercase tracking-wide text-paper hover:brightness-110"
      >
        done
      </Link>
    </main>
  );
}
