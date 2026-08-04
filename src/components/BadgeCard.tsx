import type { Achievement } from '../types';

interface Props {
  achievement: Achievement;
  unlockedAt?: string;
}

export function BadgeCard({ achievement, unlockedAt }: Props) {
  const unlocked = Boolean(unlockedAt);
  return (
    <div
      className={`flex flex-col items-center rounded-2xl p-4 text-center ${
        unlocked ? 'bg-card' : 'bg-card/50'
      }`}
    >
      <span
        className={`text-4xl ${unlocked ? '' : 'opacity-30 grayscale'}`}
        role="img"
        aria-label={achievement.name}
      >
        {achievement.emoji}
      </span>
      <span className={`mt-2 text-sm font-extrabold ${unlocked ? '' : 'text-ink-dim'}`}>
        {achievement.name}
      </span>
      <span className="mt-0.5 text-[11px] font-semibold leading-tight text-ink-dim">
        {achievement.description}
      </span>
      {unlocked && unlockedAt && (
        <span className="mt-1 text-[10px] font-bold text-brand">
          {new Date(unlockedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
        </span>
      )}
    </div>
  );
}
