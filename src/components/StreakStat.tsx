interface Props {
  streak: number;
  size?: 'sm' | 'lg';
}

/**
 * The streak used to be a pulsing flame. It's now just the number, set large
 * and light — the count is the reward, the animation never was.
 */
export function StreakStat({ streak, size = 'sm' }: Props) {
  const active = streak > 0;
  if (size === 'lg') {
    return (
      <div className="flex flex-col items-center">
        <span className={`display text-6xl leading-none ${active ? 'text-ink' : 'text-line'}`}>
          {streak}
        </span>
        <span className="mt-2 text-xs lowercase tracking-wide text-ink-soft">
          day{streak === 1 ? '' : 's'} in a row
        </span>
      </div>
    );
  }
  return (
    <span className="inline-flex items-baseline gap-1.5 lowercase">
      <span className={active ? 'text-ink' : 'text-ink-soft'}>{streak}</span>
      <span className="text-xs text-ink-soft">day streak</span>
    </span>
  );
}
