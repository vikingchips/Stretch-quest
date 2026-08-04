import { Link } from 'react-router-dom';
import { useProgressStore } from '../store/progressStore';
import { useSettingsStore } from '../store/settingsStore';
import { useRoutinesStore } from '../store/routinesStore';
import { BUILTIN_ROUTINES, BUILTIN_ROUTINE_BY_ID } from '../data/routines';
import { goalProgress } from '../game/dailyGoal';
import { todayKey } from '../game/dates';
import { StreakFlame } from '../components/StreakFlame';
import { XpLevelBar } from '../components/XpLevelBar';
import { DailyGoalRing } from '../components/DailyGoalRing';
import { RoutineCard } from '../components/RoutineCard';
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
    <main className="px-4 pb-24 pt-6">
      <header className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold">StretchQuest</h1>
          <p className="text-sm font-semibold text-ink-dim">Stay bendy. Keep the flame alive.</p>
        </div>
        <Link to="/settings" aria-label="Settings" className="text-2xl">
          ⚙️
        </Link>
      </header>

      {(freezeToast || streakLostToast) && (
        <button
          onClick={dismissToasts}
          className={`mb-4 w-full rounded-2xl p-3 text-left text-sm font-bold animate-float-up ${
            freezeToast ? 'bg-frost/15 text-frost' : 'bg-flame/15 text-flame'
          }`}
        >
          {freezeToast
            ? '❄️ A streak freeze saved your streak! Stretch today to keep it going.'
            : '💔 Your streak reset. Today is a great day to start a new one!'}
          <span className="mt-0.5 block text-[11px] font-semibold opacity-70">Tap to dismiss</span>
        </button>
      )}

      <section className="mb-4 flex items-center justify-between rounded-2xl bg-card p-4">
        <StreakFlame streak={progress.streak} size="lg" />
        <div className="flex flex-col items-center gap-1">
          <DailyGoalRing
            fraction={goal.fraction}
            met={goal.met}
            label={formatMinutes(goal.activeSec)}
            sublabel={`of ${dailyGoalMinutes} min goal`}
          />
          <span className="text-[11px] font-bold text-ink-dim">
            ❄️ {progress.streakFreezes} freeze{progress.streakFreezes === 1 ? '' : 's'} banked
          </span>
        </div>
      </section>

      <div className="mb-6">
        <XpLevelBar xp={progress.xp} />
      </div>

      <section>
        <h2 className="mb-2 text-sm font-extrabold uppercase tracking-wide text-ink-dim">
          {lastRoutine ? 'Jump back in' : 'Start here'}
        </h2>
        <div className="flex flex-col gap-2">
          {lastRoutine && <RoutineCard routine={lastRoutine} />}
          {suggestion && suggestion.id !== lastRoutine?.id && (
            <RoutineCard routine={suggestion} />
          )}
        </div>
        <Link
          to="/routines"
          className="mt-4 block rounded-2xl bg-brand py-3 text-center text-base font-extrabold text-surface transition-transform active:scale-[0.98]"
        >
          Browse all routines
        </Link>
      </section>
    </main>
  );
}
