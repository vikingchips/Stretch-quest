import { progressWithinLevel, titleForLevel } from '../game/levels';

export function XpLevelBar({ xp }: { xp: number }) {
  const { level, intoLevel, toNext } = progressWithinLevel(xp);
  const pct = Math.round((intoLevel / toNext) * 100);
  return (
    <div className="rounded-2xl bg-card p-4">
      <div className="mb-2 flex items-baseline justify-between">
        <div>
          <span className="text-lg font-extrabold text-gold">Lv {level}</span>
          <span className="ml-2 text-sm font-semibold text-ink-dim">{titleForLevel(level)}</span>
        </div>
        <span className="text-xs font-bold text-ink-dim">
          {intoLevel} / {toNext} XP
        </span>
      </div>
      <div className="h-3 overflow-hidden rounded-full bg-line/60">
        <div
          className="h-full rounded-full bg-gradient-to-r from-gold to-amber-400 transition-all duration-700"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
