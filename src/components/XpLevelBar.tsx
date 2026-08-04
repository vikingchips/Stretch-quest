import { progressWithinLevel, titleForLevel } from '../game/levels';

export function XpLevelBar({ xp }: { xp: number }) {
  const { level, intoLevel, toNext } = progressWithinLevel(xp);
  const pct = Math.round((intoLevel / toNext) * 100);
  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between">
        <div className="lowercase">
          <span className="text-base">level {level}</span>
          <span className="ml-2 text-sm text-ink-soft">{titleForLevel(level)}</span>
        </div>
        <span className="text-xs lowercase text-ink-soft">
          {intoLevel} / {toNext} xp
        </span>
      </div>
      <div className="h-px w-full bg-line">
        <div
          className="h-px bg-pine transition-all duration-700 ease-in-out"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
