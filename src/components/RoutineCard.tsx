import { Link } from 'react-router-dom';
import type { Routine } from '../types';
import { routineActiveSec } from '../session/timeline';
import { formatMinutes } from '../lib/format';
import { Icon } from './Icon';

/** Colors are marks only — never text — so they stay quiet and pass contrast. */
export const CATEGORY_META: Record<Routine['category'], { label: string; color: string }> = {
  hybrid: { label: 'daily', color: 'var(--color-pine)' },
  climbing: { label: 'climbing', color: 'var(--color-bark)' },
  running: { label: 'running', color: 'var(--color-fjord)' },
  recovery: { label: 'rest day', color: 'var(--color-clay)' },
  custom: { label: 'my routine', color: 'var(--color-stone)' },
  fingers: { label: 'fingers', color: 'var(--color-bark)' },
  // Legacy: only reachable through old session records.
  'full-body': { label: 'full body', color: 'var(--color-stone)' },
};

export function RoutineCard({ routine }: { routine: Routine }) {
  const meta = CATEGORY_META[routine.category];
  const work = routineActiveSec(routine);
  return (
    <Link
      to={`/routines/${routine.id}`}
      className="group flex items-center gap-4 border-b border-line-soft py-4 hover:bg-surface"
    >
      <span
        className="h-1.5 w-1.5 shrink-0 rounded-full"
        style={{ backgroundColor: meta.color }}
        aria-hidden="true"
      />
      <div className="min-w-0 flex-1">
        <h3 className="truncate text-base lowercase">{routine.name}</h3>
        <p className="mt-0.5 text-xs lowercase text-ink-soft">
          {meta.label} · {routine.steps.length} exercises · {formatMinutes(work)} work
        </p>
      </div>
      <span className="text-line group-hover:text-ink-soft">
        <Icon name="chevronRight" size={18} />
      </span>
    </Link>
  );
}
