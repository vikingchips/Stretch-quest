import { Link } from 'react-router-dom';
import { useProgressStore } from '../store/progressStore';
import { useSettingsStore } from '../store/settingsStore';
import { useRoutinesStore } from '../store/routinesStore';
import { BUILTIN_ROUTINES, BUILTIN_ROUTINE_BY_ID } from '../data/routines';
import { goalProgress } from '../game/dailyGoal';
import { todayKey } from '../game/dates';
import { StreakStat } from '../components/StreakStat';
import { XpLevelBar } from '../components/XpLevelBar';
import { DailyGoalRing } from '../components/DailyGoalRing';
import { RoutineCard } from '../components/RoutineCard';
import { Icon } from '../components/Icon';
import { formatMinutes } from '../lib/format';

export function HomePage() {
  const progress = useProgressStore((s) => s.progress);
  const sessions = useProgressStore((s) => s.sessions);
  const freezeToast = useProgressStore((s) => s.freezeToast);
  const streakLostToast = useProgressStore((s) => s.streakLostToast);
  const dismissToasts = useProgressStore((s) => s.dismissToasts);
  const dailyGoalMinutes = useSettingsStore((s) => s.dailyGoalMinutes);
  const customRoutines = useRoutinesStore((s) => s.customRoutines);

  const goal = goalProgress(sessions, todayKey(), dailyGoalMinutes);

  const lastSession = sessions[sessions.length - 1];
  const lastRoutine = lastSession
    ? (BUILTIN_ROUTINE_BY_ID[lastSession.routineId] ??
      customRoutines.find((r) => r.id === lastSession.routineId))
    : undefined;
  const suggestion =
    BUILTIN_ROUTINES.find((r) => r.id !== lastRoutine?.id) ?? BUILTIN_ROUTINES[0];

  return (
    <main className="px-6 pb-28 pt-10">
      <header className="mb-12 flex items-start justify-between">
        <div>
          <h1 className="text-2xl lowercase tracking-wide">stretchquest</h1>
          <p className="mt-1 text-sm text-ink-soft">a few quiet minutes, every day.</p>
        </div>
        <Link
          to="/settings"
          aria-label="Settings"
          className="p-1 text-ink-soft hover:text-ink"
        >
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

      <section className="mb-12 flex items-center justify-between">
        <StreakStat streak={progress.streak} size="lg" />
        <div className="flex flex-col items-center gap-3">
          <DailyGoalRing
            fraction={goal.fraction}
            met={goal.met}
            label={formatMinutes(goal.activeSec)}
            sublabel={`of ${dailyGoalMinutes} min`}
          />
          <span className="text-[11px] lowercase text-ink-soft">
            {progress.streakFreezes} freeze{progress.streakFreezes === 1 ? '' : 's'} banked
          </span>
        </div>
      </section>

      <div className="mb-12">
        <XpLevelBar xp={progress.xp} />
      </div>

      <section>
        <h2 className="mb-1 text-sm lowercase text-ink-soft">
          {lastRoutine ? 'pick up where you left off' : 'start here'}
        </h2>
        <div className="border-t border-line-soft">
          {lastRoutine && <RoutineCard routine={lastRoutine} />}
          {suggestion && suggestion.id !== lastRoutine?.id && (
            <RoutineCard routine={suggestion} />
          )}
        </div>
        <Link
          to="/routines"
          className="mt-8 block border border-line py-3.5 text-center text-sm lowercase tracking-wide hover:bg-surface"
        >
          browse all routines
        </Link>
      </section>
    </main>
  );
}
