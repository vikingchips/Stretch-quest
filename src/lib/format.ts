export function formatClock(totalSec: number): string {
  const sec = Math.max(0, Math.ceil(totalSec));
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export function formatMinutes(totalSec: number): string {
  const min = Math.round(totalSec / 60);
  if (min < 1) return '<1 min';
  return `${min} min`;
}

/** Body areas read as lowercase labels throughout the UI. */
export function formatAreaLabel(area: string): string {
  return area.replace('-', ' ');
}

/**
 * How a step's dose reads on screen: "2 x 5 reps", "2 x 25s per side", "60s".
 */
export function formatStepDose(
  step: { durationSec: number; sets?: number; reps?: number },
  exercise: { side: 'both' | 'per-side'; mode?: 'timed' | 'reps'; defaultReps?: number },
): string {
  const sets = Math.max(1, step.sets ?? 1);
  const perSide = exercise.side === 'per-side' ? ' per side' : '';
  const unit =
    exercise.mode === 'reps'
      ? `${step.reps ?? exercise.defaultReps ?? 0} reps`
      : `${step.durationSec}s`;
  return sets > 1 ? `${sets} × ${unit}${perSide}` : `${unit}${perSide}`;
}
