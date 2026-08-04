interface Props {
  streak: number;
  size?: 'sm' | 'lg';
}

export function StreakFlame({ streak, size = 'sm' }: Props) {
  const active = streak > 0;
  if (size === 'lg') {
    return (
      <div className="flex flex-col items-center">
        <span
          className={`text-6xl ${active ? 'animate-flame' : 'opacity-40 grayscale'}`}
          role="img"
          aria-label="streak flame"
        >
          🔥
        </span>
        <span className={`mt-1 text-4xl font-extrabold ${active ? 'text-flame' : 'text-ink-dim'}`}>
          {streak}
        </span>
        <span className="text-sm font-semibold text-ink-dim">
          day{streak === 1 ? '' : 's'} streak
        </span>
      </div>
    );
  }
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-sm font-extrabold ${
        active ? 'bg-flame/15 text-flame' : 'bg-line/40 text-ink-dim'
      }`}
    >
      <span className={active ? 'animate-flame inline-block' : 'grayscale opacity-50'}>🔥</span>
      {streak}
    </span>
  );
}
