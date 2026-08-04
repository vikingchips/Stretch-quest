interface Props {
  fraction: number;
  met: boolean;
  label: string;
  sublabel: string;
  size?: number;
}

export function DailyGoalRing({ fraction, met, label, sublabel, size = 116 }: Props) {
  const stroke = 3;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c * (1 - Math.min(1, fraction));
  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--color-line)"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={met ? 'var(--color-pine)' : 'var(--color-fjord)'}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          className="transition-all duration-700 ease-in-out"
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="text-xl lowercase leading-tight">{label}</span>
        <span className="mt-0.5 text-[11px] lowercase text-ink-soft">{sublabel}</span>
      </div>
    </div>
  );
}
