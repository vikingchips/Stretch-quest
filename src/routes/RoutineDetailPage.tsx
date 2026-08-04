import { Link, useNavigate, useParams } from 'react-router-dom';
import { useRoutinesStore } from '../store/routinesStore';
import { useSettingsStore } from '../store/settingsStore';
import { EXERCISE_BY_ID } from '../data/exercises';
import { routineActiveSec, routineTotalSec } from '../session/timeline';
import { computeXp } from '../game/xp';
import { initAudio } from '../session/audio';
import { ExerciseArt } from '../components/ExerciseArt';
import { CATEGORY_META } from '../components/RoutineCard';
import { formatMinutes } from '../lib/format';

export function RoutineDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const getRoutine = useRoutinesStore((s) => s.getRoutine);
  const deleteRoutine = useRoutinesStore((s) => s.deleteRoutine);
  const prepDurationSec = useSettingsStore((s) => s.prepDurationSec);
  const restDurationSec = useSettingsStore((s) => s.restDurationSec);

  const routine = id ? getRoutine(id) : undefined;
  if (!routine) {
    return (
      <main className="px-4 pt-10 text-center">
        <p className="font-bold text-ink-dim">Routine not found.</p>
        <Link to="/routines" className="mt-4 inline-block font-extrabold text-brand">
          Back to library
        </Link>
      </main>
    );
  }

  const meta = CATEGORY_META[routine.category];
  const total = routineTotalSec(routine, { prepDurationSec, restDurationSec });
  const activeSec = routineActiveSec(routine);
  const estXp = computeXp({
    activeSec,
    stepsCompleted: routine.steps.length,
    stepsTotal: routine.steps.length,
    firstTimeDailyGoalMetToday: false,
    streakBefore: 0,
    streakAfter: 0,
  }).total;

  return (
    <main className="px-4 pb-40 pt-6">
      <button onClick={() => navigate(-1)} className="mb-3 text-sm font-extrabold text-ink-dim">
        ‹ Back
      </button>
      <div className="mb-1 flex items-center gap-2">
        <span className="text-3xl">{meta.emoji}</span>
        <h1 className="text-2xl font-extrabold">{routine.name}</h1>
      </div>
      <p className="mb-3 text-sm font-semibold text-ink-dim">{routine.description}</p>
      <div className="mb-5 flex gap-2 text-xs font-extrabold">
        <span className="rounded-full bg-card px-3 py-1.5">⏱ {formatMinutes(total)}</span>
        <span className="rounded-full bg-card px-3 py-1.5">🧘 {routine.steps.length} stretches</span>
        <span className="rounded-full bg-card px-3 py-1.5 text-gold">⚡ ~{estXp} XP</span>
      </div>

      <div className="flex flex-col gap-2">
        {routine.steps.map((step, i) => {
          const exercise = EXERCISE_BY_ID[step.exerciseId];
          if (!exercise) return null;
          return (
            <div key={i} className="flex items-center gap-3 rounded-2xl bg-card p-3">
              <ExerciseArt art={exercise.art} />
              <div className="min-w-0 flex-1">
                <h3 className="font-extrabold">{exercise.name}</h3>
                <p className="text-xs font-semibold text-ink-dim">
                  {step.durationSec}s{exercise.side === 'per-side' ? ' per side' : ''}
                </p>
              </div>
              <span className="text-sm font-extrabold text-ink-dim">{i + 1}</span>
            </div>
          );
        })}
      </div>

      {routine.isCustom && (
        <div className="mt-4 flex gap-2">
          <Link
            to={`/builder/${routine.id}`}
            className="flex-1 rounded-2xl bg-card py-3 text-center font-extrabold"
          >
            ✏️ Edit
          </Link>
          <button
            onClick={() => {
              if (confirm('Delete this routine? Your session history keeps its records.')) {
                deleteRoutine(routine.id);
                navigate('/routines');
              }
            }}
            className="flex-1 rounded-2xl bg-card py-3 font-extrabold text-red-400"
          >
            🗑 Delete
          </button>
        </div>
      )}

      <div className="fixed bottom-16 left-0 right-0 z-10 mx-auto max-w-md px-4 pb-4">
        <Link
          to={`/session/${routine.id}`}
          onClick={() => initAudio()}
          className="block rounded-2xl bg-brand py-4 text-center text-lg font-extrabold text-surface shadow-lg shadow-brand/30 transition-transform active:scale-[0.98]"
        >
          Start session ▶
        </Link>
      </div>
    </main>
  );
}
