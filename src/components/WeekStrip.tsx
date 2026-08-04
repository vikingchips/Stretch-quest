import type { DayMark } from '../game/dailyGoal';

const LETTERS = ['m', 't', 'w', 't', 'f', 's', 's'];

/**
 * Seven marks for the current week. Replaces the old goal ring: with a
 * one-session-a-day goal there is no partial progress to fill, but there is a
 * week worth showing.
 */
export function WeekStrip({ marks }: { marks: DayMark[] }) {
  return (
    <div className="flex gap-2.5">
      {marks.map((mark, i) => (
        <div key={mark.dateKey} className="flex flex-col items-center gap-2">
          <span
            title={mark.dateKey}
            className={`h-7 w-7 border ${
              mark.done
                ? 'border-pine bg-pine'
                : mark.frozen
                  ? 'border-fjord bg-transparent'
                  : mark.isFuture
                    ? 'border-line-soft bg-transparent'
                    : 'border-line-soft bg-line-soft'
            } ${mark.isToday ? 'outline outline-1 outline-offset-2 outline-ink-soft' : ''}`}
          />
          <span className={`text-[10px] lowercase ${mark.isToday ? 'text-ink' : 'text-ink-soft'}`}>
            {LETTERS[i]}
          </span>
        </div>
      ))}
    </div>
  );
}
