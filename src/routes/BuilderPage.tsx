import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import type { Routine, RoutineStep } from '../types';
import { EXERCISES, EXERCISE_BY_ID } from '../data/exercises';
import { useRoutinesStore } from '../store/routinesStore';
import { useProgressStore } from '../store/progressStore';
import { ExerciseArt } from '../components/ExerciseArt';
import { formatAreaLabel } from '../lib/format';

const DURATION_STEP = 5;
const MIN_DURATION = 10;
const MAX_DURATION = 120;

export function BuilderPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const customRoutines = useRoutinesStore((s) => s.customRoutines);
  const saveRoutine = useRoutinesStore((s) => s.saveRoutine);
  const unlockBadge = useProgressStore((s) => s.unlockBadge);

  const editing = id ? customRoutines.find((r) => r.id === id) : undefined;
  const [name, setName] = useState(editing?.name ?? '');
  const [steps, setSteps] = useState<RoutineStep[]>(editing?.steps ?? []);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [search, setSearch] = useState('');

  const filtered = EXERCISES.filter(
    (e) =>
      e.name.toLowerCase().includes(search.toLowerCase()) ||
      e.targetAreas.some((a) => a.includes(search.toLowerCase())),
  );

  function move(index: number, delta: number) {
    const target = index + delta;
    if (target < 0 || target >= steps.length) return;
    const next = [...steps];
    [next[index], next[target]] = [next[target], next[index]];
    setSteps(next);
  }

  function adjustDuration(index: number, delta: number) {
    setSteps((prev) =>
      prev.map((s, i) =>
        i === index
          ? {
              ...s,
              durationSec: Math.min(MAX_DURATION, Math.max(MIN_DURATION, s.durationSec + delta)),
            }
          : s,
      ),
    );
  }

  function save() {
    const routine: Routine = {
      id: editing?.id ?? `custom-${crypto.randomUUID()}`,
      name: name.trim() || 'My routine',
      description: 'Custom routine',
      category: 'custom',
      isCustom: true,
      steps,
      createdAt: editing?.createdAt ?? new Date().toISOString(),
    };
    saveRoutine(routine);
    unlockBadge('architect');
    navigate(`/routines/${routine.id}`, { replace: true });
  }

  return (
    <main className="px-4 pb-32 pt-6">
      <button onClick={() => navigate(-1)} className="mb-3 text-sm font-extrabold text-ink-dim">
        ‹ Back
      </button>
      <h1 className="mb-4 text-2xl font-extrabold">
        {editing ? 'Edit routine' : 'Build a routine'}
      </h1>

      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Routine name (e.g. Morning yoga)"
        maxLength={40}
        className="mb-4 w-full rounded-2xl border border-line bg-card p-4 font-bold placeholder:text-ink-dim/60 focus:border-brand focus:outline-none"
      />

      {steps.length === 0 && (
        <p className="mb-4 rounded-2xl bg-card p-4 text-sm font-semibold text-ink-dim">
          Add stretches from the library to build your own routine — for yoga, desk breaks,
          post-gym, anything.
        </p>
      )}

      <div className="flex flex-col gap-2">
        {steps.map((step, i) => {
          const exercise = EXERCISE_BY_ID[step.exerciseId];
          if (!exercise) return null;
          return (
            <div key={`${step.exerciseId}-${i}`} className="rounded-2xl bg-card p-3">
              <div className="flex items-center gap-3">
                <ExerciseArt art={exercise.art} />
                <div className="min-w-0 flex-1">
                  <h3 className="truncate font-extrabold">{exercise.name}</h3>
                  <p className="text-xs font-semibold text-ink-dim">
                    {step.durationSec}s{exercise.side === 'per-side' ? ' per side' : ''}
                  </p>
                </div>
                <div className="flex flex-col">
                  <button
                    onClick={() => move(i, -1)}
                    disabled={i === 0}
                    className="px-2 text-lg disabled:opacity-25"
                    aria-label="Move up"
                  >
                    ▲
                  </button>
                  <button
                    onClick={() => move(i, 1)}
                    disabled={i === steps.length - 1}
                    className="px-2 text-lg disabled:opacity-25"
                    aria-label="Move down"
                  >
                    ▼
                  </button>
                </div>
              </div>
              <div className="mt-2 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => adjustDuration(i, -DURATION_STEP)}
                    className="h-8 w-8 rounded-full bg-line/60 font-extrabold"
                  >
                    −
                  </button>
                  <span className="w-12 text-center text-sm font-extrabold">
                    {step.durationSec}s
                  </span>
                  <button
                    onClick={() => adjustDuration(i, DURATION_STEP)}
                    className="h-8 w-8 rounded-full bg-line/60 font-extrabold"
                  >
                    +
                  </button>
                </div>
                <button
                  onClick={() => setSteps(steps.filter((_, j) => j !== i))}
                  className="text-sm font-bold text-red-400"
                >
                  Remove
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <button
        onClick={() => {
          setSearch('');
          setPickerOpen(true);
        }}
        className="mt-3 w-full rounded-2xl border-2 border-dashed border-line py-3 font-extrabold text-ink-dim"
      >
        + Add stretch
      </button>

      <div className="fixed bottom-16 left-0 right-0 z-10 mx-auto max-w-md px-4 pb-4">
        <button
          onClick={save}
          disabled={steps.length === 0}
          className="w-full rounded-2xl bg-brand py-4 text-lg font-extrabold text-surface shadow-lg shadow-brand/30 disabled:opacity-40"
        >
          Save routine
        </button>
      </div>

      {pickerOpen && (
        <div className="fixed inset-0 z-30 flex flex-col bg-surface/95 backdrop-blur-sm">
          <div className="mx-auto flex w-full max-w-md flex-1 flex-col overflow-hidden px-4 pt-6">
            <div className="mb-3 flex items-center gap-3">
              <input
                autoFocus
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search stretches…"
                className="flex-1 rounded-2xl border border-line bg-card p-3 font-bold placeholder:text-ink-dim/60 focus:border-brand focus:outline-none"
              />
              <button
                onClick={() => setPickerOpen(false)}
                className="font-extrabold text-ink-dim"
              >
                Done
              </button>
            </div>
            <div className="flex-1 overflow-y-auto pb-8">
              <div className="flex flex-col gap-2">
                {filtered.map((exercise) => (
                  <button
                    key={exercise.id}
                    onClick={() =>
                      setSteps((prev) => [
                        ...prev,
                        { exerciseId: exercise.id, durationSec: exercise.defaultDurationSec },
                      ])
                    }
                    className="flex items-center gap-3 rounded-2xl bg-card p-3 text-left active:bg-card-hover"
                  >
                    <ExerciseArt art={exercise.art} />
                    <div className="min-w-0 flex-1">
                      <h3 className="font-extrabold">{exercise.name}</h3>
                      <p className="text-xs font-semibold text-ink-dim">
                        {exercise.targetAreas.map(formatAreaLabel).join(' · ')}
                      </p>
                    </div>
                    <span className="text-xl text-brand">＋</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
