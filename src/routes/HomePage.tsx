import { Link } from 'react-router-dom';
import { useProgressStore } from '../store/progressStore';
import { useSettingsStore } from '../store/settingsStore';
import { useFingerStore } from '../store/fingerStore';
import { goalMetOnDay, weekMarks } from '../game/dailyGoal';
import { todayKey } from '../game/dates';
import { buildPlan, dayComplete, type PlanTarget } from '../game/plan';
import { maxByHand } from '../finger/maxTest';
import { StreakStat } from '../components/StreakStat';
import { XpLevelBar } from '../components/XpLevelBar';
import { WeekStrip } from '../components/WeekStrip';
import { TodayList } from '../components/TodayList';
import { Icon } from '../components/Icon';

export function HomePage() {
  const progress = useProgressStore((s) => s.progress);
  const sessions = useProgressStore((s) => s.sessions);
  const freezeToast = useProgressStore((s) => s.freezeToast);
  const streakLostToast = useProgressStore((s) => s.streakLostToast);
  const dismissToasts = useProgressStore((s) => s.dismissToasts);
  const fingerEnabled = useSettingsStore((s) => s.fingerModuleEnabled);
  const finger = useFingerStore();

  const today = todayKey();
  const marks = weekMarks(sessions, progress.frozenDateKeys, today);
  const somethingToday = goalMetOnDay(sessions, today);

  const maxes = maxByHand(finger.maxes, 'half-crimp', finger.activeEdgeMm);
  const plan = buildPlan({
    sessions,
    fingerSessions: finger.sessions,
    today,
    fingerEnabled,
    hasMax: maxes.left !== undefined || maxes.right !== undefined,
    lastAbrahangsAt: finger.lastAbrahangsAt,
  });
  const daily = plan.filter((t) => t.period === 'day');
  const weekly = plan.filter((t) => t.period === 'week');
  const done = dayComplete(plan);

  // The max test is not part of the plan — it is the thing the plan depends
  // on — so it only appears when it is actually blocking something.
  const needsTest = fingerEnabled && daily.some((t) => t.blocked?.includes('max test'));
  const retestDue = fingerEnabled && finger.retestDue();

  return (
    <main className="px-6 pb-28 pt-10">
      <header className="mb-12 flex items-start justify-between">
        <div>
          <h1 className="text-2xl lowercase tracking-wide">stretchquest</h1>
          <p className="mt-1 text-sm text-ink-soft">a few quiet minutes, every day.</p>
        </div>
        <Link to="/settings" aria-label="Settings" className="p-1 text-ink-soft hover:text-ink">
          <Icon name="sliders" size={22} />
        </Link>
      </header>

      {(freezeToast || streakLostToast) && (
        <button
          onClick={dismissToasts}
          className="animate-reveal mb-10 w-full border border-line-soft bg-surface px-4 py-3 text-left"
        >
          <span className="text-sm text-ink">
            {freezeToast
              ? 'A streak freeze held your streak overnight. Stretch today to keep it.'
              : 'Your streak reset. Today is a fine day to begin another.'}
          </span>
          <span className="mt-1 block text-[11px] lowercase text-ink-soft">tap to dismiss</span>
        </button>
      )}

      <section className="mb-12">
        <div className="flex items-end justify-between">
          <StreakStat streak={progress.streak} size="lg" />
          <div className="text-right">
            {/* Three states, not two. The streak only asks whether you turned
                up; finishing the plan is a different question, and calling a
                half-done day "done" was the thing that made this dishonest. */}
            <p className="text-sm lowercase">
              {done ? 'today is done' : somethingToday ? 'today, so far' : 'nothing yet today'}
            </p>
            <p className="mt-1 text-[11px] lowercase text-ink-soft">
              {progress.streakFreezes} freeze{progress.streakFreezes === 1 ? '' : 's'} banked
            </p>
          </div>
        </div>
        <div className="mt-8">
          <WeekStrip marks={marks} />
        </div>
      </section>

      <div className="mb-12">
        <XpLevelBar xp={progress.xp} />
      </div>

      <section className="mb-10">
        <h2 className="mb-1 text-sm lowercase text-ink-soft">today</h2>
        <TodayList items={daily.map(toItem)} />
      </section>

      <section>
        <h2 className="mb-1 text-sm lowercase text-ink-soft">this week</h2>
        <TodayList items={weekly.map(toItem)} />
      </section>

      {(needsTest || retestDue) && (
        <Link
          to="/finger/test"
          className="mt-10 flex items-center justify-between border-b border-line-soft py-4 text-sm lowercase text-ink-soft hover:text-ink"
        >
          <span>
            {needsTest ? 'max test — every band comes from it' : 'retest your max'}
            {retestDue && !needsTest && ` · ${finger.daysSinceTest()} days ago`}
          </span>
          <Icon name="chevronRight" size={16} />
        </Link>
      )}
    </main>
  );
}

function toItem(target: PlanTarget) {
  const of = target.targetMax ? `${target.target}–${target.targetMax}` : String(target.target);
  return {
    key: target.key,
    to: target.to,
    label: target.label,
    note: `${target.done} of ${of}`,
    done: target.done >= target.target,
    blocked: target.blocked,
  };
}
