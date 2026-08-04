import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import type { Routine, RoutineStep } from '../types';
import { EXERCISES, EXERCISE_BY_ID } from '../data/exercises';
import { useRoutinesStore } from '../store/routinesStore';
import { useProgressStore } from '../store/progressStore';
import { BodyMark } from '../components/BodyMark';
import { Icon } from '../components/Icon';
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
    <main className="px-6 pb-40 pt-8">
      <button
        onClick={() => navigate(-1)}
        className="mb-8 flex items-center gap-1 text-sm lowercase text-ink-soft hover:text-ink"
      >
        <Icon name="chevronLeft" size={16} />
        back
      </button>
      <h1 className="mb-8 text-2xl lowercase tracking-wide">
        {editing ? 'edit routine' : 'build a routine'}
      </h1>

      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="routine name"
        maxLength={40}
        className="mb-10 w-full border-b border-line bg-transparent pb-3 text-lg lowercase placeholder:text-ink-soft/60 focus:border-pine focus:outline-none"
      />

      {steps.length === 0 && (
        <p className="measure mb-8 text-sm leading-relaxed text-ink-soft">
          Add stretches from the library to build your own sequence — for yoga, desk breaks,
          post-gym, anything.
        </p>
      )}

      <ol className={steps.length > 0 ? 'border-t border-line-soft' : ''}>
        {steps.map((step, i) => {
          const exercise = EXERCISE_BY_ID[step.exerciseId];
          if (!exercise) return null;
          return (
            <li key={`${step.exerciseId}-${i}`} className="border-b border-line-soft py-4">
              <div className="flex items-center gap-4">
                <BodyMark areas={exercise.targetAreas} />
                <div className="min-w-0 flex-1">
                  <h3 className="truncate text-base lowercase">{exercise.name}</h3>
                  <p className="mt-0.5 text-xs lowercase text-ink-soft">
                    {exercise.side === 'per-side' ? 'per side' : 'both sides'}
                  </p>
                </div>
                <div className="flex flex-col text-ink-soft">
                  <button
                    onClick={() => move(i, -1)}
                    disabled={i === 0}
                    className="p-1 hover:text-ink disabled:opacity-25"
                    aria-label="Move up"
                  >
                    <Icon name="arrowUp" size={16} />
                  </button>
                  <button
                    onClick={() => move(i, 1)}
                    disabled={i === steps.length - 1}
                    className="p-1 hover:text-ink disabled:opacity-25"
                    aria-label="Move down"
                  >
                    <Icon name="arrowDown" size={16} />
                  </button>
                </div>
              </div>
              <div className="mt-3 flex items-center justify-between pl-[50px]">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => adjustDuration(i, -DURATION_STEP)}
                    className="border border-line-soft p-1.5 text-ink-soft hover:text-ink"
                    aria-label="Shorter"
                  >
                    <Icon name="minus" size={14} />
                  </button>
                  <span className="w-12 text-center text-sm tabular-nums">{step.durationSec}s</span>
                  <button
                    onClick={() => adjustDuration(i, DURATION_STEP)}
                    className="border border-line-soft p-1.5 text-ink-soft hover:text-ink"
                    aria-label="Longer"
                  >
                    <Icon name="plus" size={14} />
                  </button>
                </div>
                <button
                  onClick={() => setSteps(steps.filter((_, j) => j !== i))}
                  className="text-xs lowercase text-ink-soft hover:text-clay"
                >
                  remove
                </button>
              </div>
            </li>
          );
        })}
      </ol>

      <button
        onClick={() => {
          setSearch('');
          setPickerOpen(true);
        }}
        className="mt-6 flex w-full items-center justify-center gap-2 border border-line py-3.5 text-sm lowercase text-ink-soft hover:bg-surface hover:text-ink"
      >
        <Icon name="plus" size={16} />
        add stretch
      </button>

      <div className="fixed inset-x-0 bottom-16 z-10 mx-auto max-w-md bg-gradient-to-t from-paper via-paper to-transparent px-6 pb-5 pt-14">
        <button
          onClick={save}
          disabled={steps.length === 0}
          className="w-full bg-pine-deep py-4 text-sm lowercase tracking-wide text-paper hover:brightness-110 disabled:opacity-30"
        >
          save routine
        </button>
      </div>

      {pickerOpen && (
        <div className="animate-reveal fixed inset-0 z-30 flex flex-col bg-paper">
          <div className="mx-auto flex w-full max-w-md flex-1 flex-col overflow-hidden px-6 pt-8">
            <div className="mb-6 flex items-center gap-4">
              <div className="flex flex-1 items-center gap-2 border-b border-line pb-2 focus-within:border-pine">
                <Icon name="search" size={16} className="shrink-0 text-ink-soft" />
                <input
                  autoFocus
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="search stretches"
                  className="w-full bg-transparent lowercase placeholder:text-ink-soft/60 focus:outline-none"
                />
              </div>
              <button
                onClick={() => setPickerOpen(false)}
                className="text-sm lowercase text-ink-soft hover:text-ink"
              >
                done
              </button>
            </div>
            <div className="flex-1 overflow-y-auto pb-10">
              <div className="border-t border-line-soft">
                {filtered.map((exercise) => (
                  <button
                    key={exercise.id}
                    onClick={() =>
                      setSteps((prev) => [
                        ...prev,
                        { exerciseId: exercise.id, durationSec: exercise.defaultDurationSec },
                      ])
                    }
                    className="flex w-full items-center gap-4 border-b border-line-soft py-4 text-left hover:bg-surface"
                  >
                    <BodyMark areas={exercise.targetAreas} />
                    <div className="min-w-0 flex-1">
                      <h3 className="text-base lowercase">{exercise.name}</h3>
                      <p className="mt-0.5 text-xs lowercase text-ink-soft">
                        {exercise.targetAreas.map(formatAreaLabel).join(' · ')}
                      </p>
                    </div>
                    <span className="text-ink-soft">
                      <Icon name="plus" size={16} />
                    </span>
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
