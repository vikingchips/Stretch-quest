import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../sync/authStore';
import { syncConfigured } from '../sync/client';
import { nameToSlug } from '../sync/identity';
import { useFriendsStore } from '../store/friendsStore';
import { useProgressStore } from '../store/progressStore';
import { goalMetOnDay } from '../game/dailyGoal';
import { todayKey } from '../game/dates';
import { weekPattern } from '../sync/friends';
import { Icon } from '../components/Icon';

const LETTERS = ['m', 't', 'w', 't', 'f', 's', 's'];

function WeekDots({ pattern }: { pattern: string }) {
  return (
    <div className="flex gap-1.5">
      {LETTERS.map((letter, i) => (
        <span
          key={i}
          title={letter}
          className={`h-3.5 w-3.5 border ${
            pattern[i] === '1' ? 'border-pine bg-pine' : 'border-line-soft'
          }`}
        />
      ))}
    </div>
  );
}

/** Share link is just your name — nothing secret, and easy to read aloud. */
function shareUrl(slug: string): string {
  const { origin, pathname } = window.location;
  return `${origin}${pathname}#/add/${slug}`;
}

export function FriendsPage() {
  const { status, displayName } = useAuthStore();
  const { friends, requests, loading, error, refresh, accept, decline, unfriend } =
    useFriendsStore();
  const progress = useProgressStore((s) => s.progress);
  const sessions = useProgressStore((s) => s.sessions);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (status === 'signed-in') void refresh();
  }, [status, refresh]);

  if (!syncConfigured || status !== 'signed-in') {
    return (
      <main className="px-6 pb-28 pt-10">
        <h1 className="mb-8 text-2xl lowercase tracking-wide">friends</h1>
        <p className="measure leading-relaxed text-ink-soft">
          {syncConfigured
            ? 'Friends need an account, so there is something to compare. It takes a name and four digits.'
            : 'This build has no sync credentials, so friends are unavailable. Everything else works offline as usual.'}
        </p>
        {syncConfigured && (
          <Link
            to="/settings"
            className="mt-8 block border border-line py-3.5 text-center text-sm lowercase hover:bg-surface"
          >
            go to settings
          </Link>
        )}
      </main>
    );
  }

  const slug = nameToSlug(displayName ?? '');
  const today = todayKey();
  const mine = {
    displayName: displayName ?? 'you',
    streak: progress.streak,
    pattern: weekPattern(sessions, progress.frozenDateKeys),
    doneToday: goalMetOnDay(sessions, today),
  };

  // Longest streak first — the list is meant to be a nudge, so the person
  // doing best sits at the top.
  const ranked = [...friends].sort((a, b) => b.streak - a.streak);
  const incoming = requests.filter((r) => r.direction === 'incoming');
  const outgoing = requests.filter((r) => r.direction === 'outgoing');

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(shareUrl(slug));
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Clipboard blocked — the link is on screen to copy by hand.
    }
  }

  return (
    <main className="px-6 pb-28 pt-10">
      <h1 className="text-2xl lowercase tracking-wide">friends</h1>
      <p className="measure mb-10 mt-1 text-sm leading-relaxed text-ink-soft">
        Who is keeping their routine this week.
      </p>

      {error && <p className="measure mb-6 text-xs leading-relaxed text-clay">{error}</p>}

      {incoming.length > 0 && (
        <section className="mb-10">
          <h2 className="mb-1 text-sm lowercase text-ink-soft">wants to follow you</h2>
          <div className="border-t border-line-soft">
            {incoming.map((r) => (
              <div
                key={r.id}
                className="flex items-center gap-3 border-b border-line-soft py-4"
              >
                <span className="min-w-0 flex-1 truncate lowercase">{r.displayName}</span>
                <button
                  onClick={() => void accept(r.id)}
                  className="border border-pine px-4 py-2 text-xs lowercase text-pine-deep hover:bg-surface"
                >
                  accept
                </button>
                <button
                  onClick={() => void decline(r.id)}
                  className="border border-line-soft px-4 py-2 text-xs lowercase text-ink-soft hover:text-ink"
                >
                  decline
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="mb-10">
        <h2 className="mb-1 text-sm lowercase text-ink-soft">this week</h2>
        <div className="border-t border-line-soft">
          <div className="flex items-center gap-4 border-b border-line-soft py-4">
            <div className="min-w-0 flex-1">
              <p className="truncate lowercase">
                {mine.displayName} <span className="text-ink-soft">· you</span>
              </p>
              <p className="mt-1 text-xs lowercase text-ink-soft">
                {mine.streak} day streak · {mine.doneToday ? 'done today' : 'not yet today'}
              </p>
            </div>
            <WeekDots pattern={mine.pattern} />
          </div>

          {ranked.map((friend) => {
            const doneToday = friend.lastActive === today;
            return (
              <div key={friend.userId} className="flex items-center gap-4 border-b border-line-soft py-4">
                <div className="min-w-0 flex-1">
                  <p className="truncate lowercase">{friend.displayName}</p>
                  <p className="mt-1 text-xs lowercase text-ink-soft">
                    {friend.streak} day streak · {doneToday ? 'done today' : 'not yet today'}
                  </p>
                </div>
                <WeekDots pattern={friend.weekPattern} />
                <button
                  onClick={() => {
                    if (confirm(`Stop following ${friend.displayName}?`)) {
                      void unfriend(friend.userId);
                    }
                  }}
                  aria-label={`Remove ${friend.displayName}`}
                  className="text-line hover:text-clay"
                >
                  <Icon name="close" size={15} />
                </button>
              </div>
            );
          })}
        </div>

        {ranked.length === 0 && (
          <p className="measure mt-4 text-sm leading-relaxed text-ink-soft">
            {loading ? 'Loading…' : 'No one yet. Send someone your link below.'}
          </p>
        )}
      </section>

      {outgoing.length > 0 && (
        <section className="mb-10">
          <h2 className="mb-1 text-sm lowercase text-ink-soft">waiting on them</h2>
          <div className="border-t border-line-soft">
            {outgoing.map((r) => (
              <div key={r.id} className="flex items-center gap-3 border-b border-line-soft py-4">
                <span className="min-w-0 flex-1 truncate lowercase text-ink-soft">
                  {r.displayName}
                </span>
                <button
                  onClick={() => void decline(r.id)}
                  className="text-xs lowercase text-ink-soft hover:text-clay"
                >
                  cancel
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      <section>
        <h2 className="mb-1 text-sm lowercase text-ink-soft">your link</h2>
        <p className="measure mb-4 mt-1 text-xs leading-relaxed text-ink-soft">
          Send this to someone. Opening it asks them to follow you, and you get the same
          request back once they accept.
        </p>
        <p className="break-all border border-line-soft bg-surface p-4 text-xs text-ink-soft">
          {shareUrl(slug)}
        </p>
        <button
          onClick={() => void copyLink()}
          className="mt-3 flex w-full items-center justify-center gap-2 border border-line py-3.5 text-sm lowercase hover:bg-surface"
        >
          <Icon name={copied ? 'check' : 'plus'} size={16} />
          {copied ? 'copied' : 'copy link'}
        </button>
      </section>
    </main>
  );
}
