import type { Achievement } from '../types';
import { Icon } from './Icon';

interface Props {
  achievement: Achievement;
  unlockedAt?: string;
}

export function BadgeCard({ achievement, unlockedAt }: Props) {
  const unlocked = Boolean(unlockedAt);
  return (
    <div
      className={`flex flex-col items-center border px-4 py-6 text-center ${
        unlocked ? 'border-line bg-surface' : 'border-line-soft'
      }`}
    >
      <span className={unlocked ? 'text-pine' : 'text-line'}>
        <Icon name={achievement.icon} size={34} strokeWidth={unlocked ? 1.15 : 1} />
      </span>
      <span className={`mt-3 text-sm lowercase ${unlocked ? 'text-ink' : 'text-ink-soft'}`}>
        {achievement.name}
      </span>
      <span className="mt-1 text-[11px] leading-snug text-ink-soft">
        {achievement.description}
      </span>
      {unlocked && unlockedAt && (
        <span className="mt-2 text-[10px] lowercase tracking-wide text-pine-deep">
          {new Date(unlockedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
        </span>
      )}
    </div>
  );
}
