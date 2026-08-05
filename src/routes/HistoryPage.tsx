import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { SessionRecord } from '../types';
import { useProgressStore } from '../store/progressStore';
import { useFingerStore } from '../store/fingerStore';
import { CATEGORY_META } from '../components/RoutineCard';
import { Icon } from '../components/Icon';
import { formatMinutes } from '../lib/format';

function monthLabel(dateKey: string): string {
  const [year, month] = dateKey.split('-');
  const name = new Date(Number(year), Number(month) - 1, 1).toLocaleString('en', {
    month: 'long',
  });
  return `${name.toLowerCase()} ${year}`;
}

function timeLabel(startedAt: string): string {
  return new Date(startedAt).toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function HistoryPage() {
  const navigate = useNavigate();
  const sessions = useProgressStore((s) => s.sessions);
  const deleteSession = useProgressStore((s) => s.deleteSession);
  const deleteFingerSession = useFingerStore((s) => s.deleteSession);
  const [confirming, setConfirming] = useState<SessionRecord | null>(null);

  // Newest first, grouped by month — a flat list of a year's sessions is
  // impossible to find anything in.
  const months = useMemo(() => {
    const groups = new Map<string, SessionRecord[]>();
    for (const session of [...sessions].reverse()) {
      const key = session.dateKey.slice(0, 7);
      const list = groups.get(key) ?? [];
      list.push(session);
      groups.set(key, list);
    }
    return [...groups.entries()];
  }, [sessions]);

  function remove(session: SessionRecord) {
    deleteSession(session.id);
    // A finger session keeps its detail under the same id, so both go.
    deleteFingerSession(session.id);
    setConfirming(null);
  }

  return (
    <main className="px-6 pb-28 pt-8">
      <button
        onClick={() => navigate(-1)}
        className="mb-8 flex items-center gap-1 text-sm lowercase text-ink-soft hover:text-ink"
      >
        <Icon name="chevronLeft" size={16} />
        back
      </button>
      <h1 className="mb-2 text-2xl lowercase tracking-wide">history</h1>
      <p className="measure mb-12 text-sm leading-relaxed text-ink-soft">
        {sessions.length} session{sessions.length === 1 ? '' : 's'}. Removing one takes its XP
        and its day back out of your streak.
      </p>

      {months.length === 0 && (
        <p className="measure text-sm leading-relaxed text-ink-soft">Nothing recorded yet.</p>
      )}

      {months.map(([month, list]) => (
        <section key={month} className="mb-10">
          <h2 className="mb-1 text-sm lowercase text-ink-soft">{monthLabel(list[0].dateKey)}</h2>
          <ul className="border-t border-line-soft">
            {list.map((session) => {
              const meta = CATEGORY_META[session.category];
              return (
                <li
                  key={session.id}
                  className="flex items-center gap-3 border-b border-line-soft py-3"
                >
                  <span
                    className="h-1.5 w-1.5 shrink-0 rounded-full"
                    style={{ backgroundColor: meta?.color ?? 'var(--color-stone)' }}
                    aria-hidden="true"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm lowercase">{session.routineName}</p>
                    <p className="mt-0.5 text-xs lowercase tabular-nums text-ink-soft">
                      {session.dateKey} · {timeLabel(session.startedAt)} ·{' '}
                      {formatMinutes(session.activeSec)} · {session.stepsCompleted}/
                      {session.stepsTotal}
                      {session.xpEarned > 0 && ` · +${session.xpEarned} xp`}
                    </p>
                  </div>
                  <button
                    onClick={() => setConfirming(session)}
                    className="shrink-0 p-1 text-ink-soft hover:text-clay"
                    aria-label={`Delete ${session.routineName} on ${session.dateKey}`}
                  >
                    <Icon name="trash" size={16} />
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      ))}

      {confirming && (
        <div className="animate-reveal fixed inset-0 z-30 flex items-center justify-center bg-paper/90 px-8 backdrop-blur-sm">
          <div className="w-full max-w-sm border border-line bg-surface p-8 text-center">
            <h2 className="text-lg lowercase">delete this session?</h2>
            <p className="measure mt-2 text-sm leading-relaxed text-ink-soft">
              {confirming.routineName} on {confirming.dateKey}. Its XP comes off your total, and
              if it was the only session that day, the day stops counting toward your streak.
              Badges you have already earned stay.
            </p>
            <div className="mt-8 flex flex-col gap-3">
              <button
                onClick={() => remove(confirming)}
                className="border border-clay py-3 text-sm lowercase tracking-wide text-clay hover:bg-paper"
              >
                delete
              </button>
              <button
                onClick={() => setConfirming(null)}
                className="bg-pine-deep py-3 text-sm lowercase tracking-wide text-paper hover:brightness-110"
              >
                keep it
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
