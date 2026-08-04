import { Link } from 'react-router-dom';
import type { Routine } from '../types';
import { useSettingsStore } from '../store/settingsStore';
import { routineTotalSec } from '../session/timeline';
import { formatMinutes } from '../lib/format';

export const CATEGORY_META: Record<
  Routine['category'],
  { label: string; emoji: string; color: string }
> = {
  climbing: { label: 'Climbing', emoji: '🧗', color: '#f59e0b' },
  running: { label: 'Running', emoji: '🏃', color: '#3b82f6' },
  'full-body': { label: 'Full body', emoji: '🧘', color: '#10b981' },
  custom: { label: 'My routine', emoji: '⭐', color: '#ec4899' },
};

export function RoutineCard({ routine }: { routine: Routine }) {
  const prepDurationSec = useSettingsStore((s) => s.prepDurationSec);
  const restDurationSec = useSettingsStore((s) => s.restDurationSec);
  const meta = CATEGORY_META[routine.category];
  const total = routineTotalSec(routine, { prepDurationSec, restDurationSec });
  return (
    <Link
      to={`/routines/${routine.id}`}
      className="block rounded-2xl bg-card p-4 transition-colors hover:bg-card-hover active:scale-[0.98]"
    >
      <div className="flex items-center gap-3">
        <div
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-2xl"
          style={{ backgroundColor: `${meta.color}26` }}
        >
          {meta.emoji}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="truncate font-extrabold">{routine.name}</h3>
          <p className="text-xs font-semibold text-ink-dim">
            {routine.steps.length} stretches · {formatMinutes(total)}
          </p>
        </div>
        <span className="text-ink-dim">›</span>
      </div>
    </Link>
  );
}
