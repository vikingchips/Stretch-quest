import { Link } from 'react-router-dom';
import { Icon } from './Icon';

export interface TodayItem {
  key: string;
  to: string;
  label: string;
  /** What is left, in a few words: '1 of 2 today', '2 of 2–3 this week'. */
  note: string;
  done: boolean;
  /** Reason it cannot be started, if it cannot. */
  blocked?: string;
}

/**
 * The one thing home is for: what is left to do today.
 *
 * Done rows stay in place rather than disappearing — seeing the day fill up
 * is the point, and a list that empties itself gives you nothing to look at
 * once you have done the work.
 */
export function TodayList({ items }: { items: TodayItem[] }) {
  return (
    <ul className="border-t border-line-soft">
      {items.map((item) => {
        const inner = (
          <>
            <span
              className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
                item.done ? 'border-pine text-pine-deep' : 'border-line text-transparent'
              }`}
              aria-hidden="true"
            >
              <Icon name="check" size={12} strokeWidth={1.6} />
            </span>
            <div className="min-w-0 flex-1">
              <p className={`truncate text-base lowercase ${item.done ? 'text-ink-soft' : ''}`}>
                {item.label}
              </p>
              {/* The count stays visible even when the row cannot be
                  started — how much is left is the thing you came to see. */}
              <p className="mt-0.5 text-xs lowercase text-ink-soft">
                {item.note}
                {item.blocked && ` · ${item.blocked}`}
              </p>
            </div>
            {!item.blocked && (
              <span className="text-line">
                <Icon name="chevronRight" size={18} />
              </span>
            )}
          </>
        );

        return (
          <li key={item.key}>
            {item.blocked ? (
              <div className="flex items-center gap-4 border-b border-line-soft py-4 opacity-50">
                {inner}
              </div>
            ) : (
              <Link
                to={item.to}
                className="flex items-center gap-4 border-b border-line-soft py-4 hover:bg-surface"
              >
                {inner}
              </Link>
            )}
          </li>
        );
      })}
    </ul>
  );
}
