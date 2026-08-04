import { useState } from 'react';
import { Link } from 'react-router-dom';
import type { BodyArea } from '../types';
import { BUILTIN_ROUTINES } from '../data/routines';
import { EXERCISES } from '../data/exercises';
import { useRoutinesStore } from '../store/routinesStore';
import { RoutineCard } from '../components/RoutineCard';
import { BodyMark } from '../components/BodyMark';
import { Icon } from '../components/Icon';
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
  'adductors',
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

  // Grouped by when you run them, not by body part — the timing split is the
  // whole point of the protocol.
  const groups: Array<{
    key: string;
    title: string;
    note?: string;
    routines: typeof BUILTIN_ROUTINES;
  }> = [
    {
      key: 'daily',
      title: 'every day',
      routines: BUILTIN_ROUTINES.filter((r) => r.category === 'hybrid'),
    },
    {
      key: 'pre-activity',
      title: 'before you go',
      note: 'Dynamic only, so nothing is taken off the top of your session.',
      routines: BUILTIN_ROUTINES.filter((r) => r.timing === 'pre-activity'),
    },
    {
      key: 'recovery',
      title: 'away from performance',
      note: 'Loaded and static work. This is where range is actually built.',
      routines: BUILTIN_ROUTINES.filter((r) => r.timing === 'away-from-performance'),
    },
    {
      key: 'custom',
      title: 'my routines',
      routines: customRoutines,
    },
  ];

  const filteredExercises = areaFilter
    ? EXERCISES.filter((e) => e.targetAreas.includes(areaFilter))
    : EXERCISES;

  return (
    <main className="px-6 pb-28 pt-10">
      <h1 className="mb-8 text-2xl lowercase tracking-wide">library</h1>

      <div className="mb-10 flex border-b border-line">
        {(['routines', 'exercises'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`-mb-px border-b pb-3 pr-8 text-sm lowercase tracking-wide ${
              tab === t ? 'border-pine text-ink' : 'border-transparent text-ink-soft hover:text-ink'
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
                <section key={group.key} className="mb-10">
                  <h2 className="text-sm lowercase text-ink-soft">{group.title}</h2>
                  {group.note && (
                    <p className="measure mb-1 mt-1 text-xs leading-relaxed text-ink-soft">
                      {group.note}
                    </p>
                  )}
                  <div className="mt-1 border-t border-line-soft">
                    {group.routines.map((r) => (
                      <RoutineCard key={r.id} routine={r} />
                    ))}
                  </div>
                </section>
              ),
          )}
          <Link
            to="/builder"
            className="flex w-full items-center justify-center gap-2 border border-line py-3.5 text-sm lowercase text-ink-soft hover:bg-surface hover:text-ink"
          >
            <Icon name="plus" size={16} />
            new routine
          </Link>
        </>
      ) : (
        <>
          <div className="mb-8 flex gap-2 overflow-x-auto pb-1">
            <button
              onClick={() => setAreaFilter(null)}
              className={`shrink-0 border px-3 py-1.5 text-xs lowercase ${
                areaFilter === null
                  ? 'border-pine text-pine-deep'
                  : 'border-line-soft text-ink-soft hover:text-ink'
              }`}
            >
              all
            </button>
            {AREAS.map((area) => (
              <button
                key={area}
                onClick={() => setAreaFilter(area === areaFilter ? null : area)}
                className={`shrink-0 border px-3 py-1.5 text-xs lowercase ${
                  areaFilter === area
                    ? 'border-pine text-pine-deep'
                    : 'border-line-soft text-ink-soft hover:text-ink'
                }`}
              >
                {formatAreaLabel(area)}
              </button>
            ))}
          </div>
          <div className="border-t border-line-soft">
            {filteredExercises.map((exercise) => (
              <div
                key={exercise.id}
                className="flex items-start gap-5 border-b border-line-soft py-5"
              >
                <BodyMark areas={exercise.targetAreas} />
                <div className="min-w-0 flex-1">
                  <h3 className="text-base lowercase">{exercise.name}</h3>
                  <p className="mt-0.5 text-xs lowercase text-ink-soft">
                    {exercise.targetAreas.map(formatAreaLabel).join(' · ')} ·{' '}
                    {exercise.modality}
                  </p>
                  <p className="measure mt-2 text-sm leading-relaxed text-ink-soft">
                    {exercise.instructions}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </main>
  );
}
