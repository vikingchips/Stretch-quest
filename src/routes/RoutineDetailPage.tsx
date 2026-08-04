import { Link, useNavigate, useParams } from 'react-router-dom';
import { useRoutinesStore } from '../store/routinesStore';
import { useSettingsStore } from '../store/settingsStore';
import { EXERCISE_BY_ID } from '../data/exercises';
import { routineActiveSec, routineTotalSec } from '../session/timeline';
import { computeXp } from '../game/xp';
import { initAudio } from '../session/audio';
import { BodyMark } from '../components/BodyMark';
import { Icon } from '../components/Icon';
import { CATEGORY_META } from '../components/RoutineCard';
import { formatMinutes, formatStepDose } from '../lib/format';

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
      <main className="px-6 pt-16 text-center">
        <p className="text-ink-soft">Routine not found.</p>
        <Link to="/routines" className="mt-6 inline-block lowercase text-pine-deep">
          back to library
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
    firstSessionOfDay: false,
    streakBefore: 0,
    streakAfter: 0,
  }).total;

  return (
    <main className="px-6 pb-44 pt-8">
      <button
        onClick={() => navigate(-1)}
        className="mb-8 flex items-center gap-1 text-sm lowercase text-ink-soft hover:text-ink"
      >
        <Icon name="chevronLeft" size={16} />
        back
      </button>

      <div className="mb-2 flex items-center gap-2.5">
        <span
          className="h-1.5 w-1.5 rounded-full"
          style={{ backgroundColor: meta.color }}
          aria-hidden="true"
        />
        <span className="text-xs lowercase text-ink-soft">{meta.label}</span>
      </div>
      <h1 className="text-2xl lowercase">{routine.name}</h1>
      <p className="measure mt-3 text-sm leading-relaxed text-ink-soft">{routine.description}</p>

      {routine.guidance && (
        <p className="measure mt-5 text-sm leading-relaxed">
          <span className="lowercase text-ink-soft">when · </span>
          {routine.guidance}
        </p>
      )}
      {routine.caution && (
        <p className="measure mt-3 border border-line-soft bg-surface p-4 text-sm leading-relaxed text-clay">
          {routine.caution}
        </p>
      )}

      <dl className="mt-8 flex gap-10 border-y border-line-soft py-4 text-sm lowercase">
        <div>
          <dt className="text-xs text-ink-soft">work</dt>
          <dd className="mt-1">{formatMinutes(activeSec)}</dd>
        </div>
        <div>
          <dt className="text-xs text-ink-soft">with rests</dt>
          <dd className="mt-1">{formatMinutes(total)}</dd>
        </div>
        <div>
          <dt className="text-xs text-ink-soft">earns</dt>
          <dd className="mt-1">~{estXp} xp</dd>
        </div>
      </dl>

      <ol className="mt-6">
        {routine.steps.map((step, i) => {
          const exercise = EXERCISE_BY_ID[step.exerciseId];
          if (!exercise) return null;
          return (
            <li key={i} className="flex items-start gap-5 border-b border-line-soft py-4">
              <BodyMark areas={exercise.targetAreas} />
              <div className="min-w-0 flex-1">
                <h3 className="text-base lowercase">{exercise.name}</h3>
                <p className="mt-0.5 text-xs lowercase text-ink-soft">
                  {formatStepDose(step, exercise)} · {exercise.modality}
                </p>
                {exercise.purpose && (
                  <p className="measure mt-1.5 text-xs leading-relaxed text-ink-soft">
                    {exercise.purpose}
                  </p>
                )}
              </div>
              <span className="text-sm tabular-nums text-line">
                {String(i + 1).padStart(2, '0')}
              </span>
            </li>
          );
        })}
      </ol>

      {routine.isCustom && (
        <div className="mt-8 flex gap-3">
          <Link
            to={`/builder/${routine.id}`}
            className="flex flex-1 items-center justify-center gap-2 border border-line py-3 text-sm lowercase hover:bg-surface"
          >
            <Icon name="pencil" size={16} />
            edit
          </Link>
          <button
            onClick={() => {
              if (confirm('Delete this routine? Your session history keeps its records.')) {
                deleteRoutine(routine.id);
                navigate('/routines');
              }
            }}
            className="flex flex-1 items-center justify-center gap-2 border border-line py-3 text-sm lowercase text-clay hover:bg-surface"
          >
            <Icon name="trash" size={16} />
            delete
          </button>
        </div>
      )}

      <div className="fixed inset-x-0 bottom-16 z-10 mx-auto max-w-md bg-gradient-to-t from-paper via-paper to-transparent px-6 pb-5 pt-14">
        <Link
          to={`/session/${routine.id}`}
          onClick={() => initAudio()}
          className="flex items-center justify-center gap-2.5 bg-pine-deep py-4 text-base lowercase tracking-wide text-paper hover:brightness-110"
        >
          <Icon name="play" size={17} />
          begin
        </Link>
      </div>
    </main>
  );
}
