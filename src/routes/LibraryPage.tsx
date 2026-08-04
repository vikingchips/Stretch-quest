import { useState } from 'react';
import { Link } from 'react-router-dom';
import type { BodyArea } from '../types';
import { BUILTIN_ROUTINES } from '../data/routines';
import { EXERCISES } from '../data/exercises';
import { useRoutinesStore } from '../store/routinesStore';
import { RoutineCard, CATEGORY_META } from '../components/RoutineCard';
import { ExerciseArt } from '../components/ExerciseArt';
import { formatAreaLabel } from '../lib/format';

const AREAS: BodyArea[] = [
  'neck',
  'shoulders',
  'chest',
  'back',
  'arms',
  'wrists',
  'fingers',
  'core',
  'hips',
  'glutes',
  'hamstrings',
  'quads',
  'calves',
  'ankles',
  'feet',
];

export function LibraryPage() {
  const [tab, setTab] = useState<'routines' | 'exercises'>('routines');
  const [areaFilter, setAreaFilter] = useState<BodyArea | null>(null);
  const customRoutines = useRoutinesStore((s) => s.customRoutines);

  const groups: Array<{ key: string; title: string; routines: typeof BUILTIN_ROUTINES }> = [
    {
      key: 'climbing',
      title: `${CATEGORY_META.climbing.emoji} Climbing`,
      routines: BUILTIN_ROUTINES.filter((r) => r.category === 'climbing'),
    },
    {
      key: 'running',
      title: `${CATEGORY_META.running.emoji} Running`,
      routines: BUILTIN_ROUTINES.filter((r) => r.category === 'running'),
    },
    {
      key: 'full-body',
      title: `${CATEGORY_META['full-body'].emoji} Full body`,
      routines: BUILTIN_ROUTINES.filter((r) => r.category === 'full-body'),
    },
    {
      key: 'custom',
      title: `${CATEGORY_META.custom.emoji} My routines`,
      routines: customRoutines,
    },
  ];

  const filteredExercises = areaFilter
    ? EXERCISES.filter((e) => e.targetAreas.includes(areaFilter))
    : EXERCISES;

  return (
    <main className="px-4 pb-24 pt-6">
      <h1 className="mb-4 text-2xl font-extrabold">Library</h1>

      <div className="mb-4 flex rounded-full bg-card p-1">
        {(['routines', 'exercises'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 rounded-full py-2 text-sm font-extrabold capitalize transition-colors ${
              tab === t ? 'bg-brand text-surface' : 'text-ink-dim'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === 'routines' ? (
        <>
          {groups.map(
            (group) =>
              group.routines.length > 0 && (
                <section key={group.key} className="mb-5">
                  <h2 className="mb-2 text-sm font-extrabold uppercase tracking-wide text-ink-dim">
                    {group.title}
                  </h2>
                  <div className="flex flex-col gap-2">
                    {group.routines.map((r) => (
                      <RoutineCard key={r.id} routine={r} />
                    ))}
                  </div>
                </section>
              ),
          )}
          <Link
            to="/builder"
            className="fixed bottom-20 right-4 z-10 flex h-14 w-14 items-center justify-center rounded-full bg-brand text-3xl font-extrabold text-surface shadow-lg shadow-brand/30 active:scale-95"
            aria-label="Create routine"
          >
            +
          </Link>
        </>
      ) : (
        <>
          <div className="mb-3 flex gap-2 overflow-x-auto pb-1">
            <button
              onClick={() => setAreaFilter(null)}
              className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-extrabold ${
                areaFilter === null ? 'bg-brand text-surface' : 'bg-card text-ink-dim'
              }`}
            >
              All
            </button>
            {AREAS.map((area) => (
              <button
                key={area}
                onClick={() => setAreaFilter(area === areaFilter ? null : area)}
                className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-extrabold ${
                  areaFilter === area ? 'bg-brand text-surface' : 'bg-card text-ink-dim'
                }`}
              >
                {formatAreaLabel(area)}
              </button>
            ))}
          </div>
          <div className="flex flex-col gap-2">
            {filteredExercises.map((exercise) => (
              <div key={exercise.id} className="flex items-center gap-3 rounded-2xl bg-card p-3">
                <ExerciseArt art={exercise.art} />
                <div className="min-w-0 flex-1">
                  <h3 className="font-extrabold">{exercise.name}</h3>
                  <p className="text-xs font-semibold text-ink-dim">
                    {exercise.targetAreas.map(formatAreaLabel).join(' · ')} ·{' '}
                    {exercise.defaultDurationSec}s
                    {exercise.side === 'per-side' ? ' / side' : ''}
                  </p>
                  <p className="mt-1 text-xs leading-snug text-ink-dim">{exercise.instructions}</p>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </main>
  );
}
