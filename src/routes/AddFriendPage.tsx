import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuthStore } from '../sync/authStore';
import { syncConfigured } from '../sync/client';
import { findBySlug, sendRequest } from '../sync/friends';
import { useFriendsStore } from '../store/friendsStore';
import { Icon } from '../components/Icon';

type State =
  | { kind: 'looking' }
  | { kind: 'found'; userId: string; displayName: string }
  | { kind: 'missing' }
  | { kind: 'sent'; displayName: string }
  | { kind: 'error'; message: string };

/** Landing page for a shared link: `#/add/<slug>`. */
export function AddFriendPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { status, userId } = useAuthStore();
  const refresh = useFriendsStore((s) => s.refresh);
  const [state, setState] = useState<State>({ kind: 'looking' });

  useEffect(() => {
    if (status !== 'signed-in' || !slug) return;
    let cancelled = false;
    void (async () => {
      try {
        const found = await findBySlug(slug);
        if (cancelled) return;
        setState(
          found
            ? { kind: 'found', userId: found.userId, displayName: found.displayName }
            : { kind: 'missing' },
        );
      } catch (error) {
        if (!cancelled) {
          setState({
            kind: 'error',
            message: error instanceof Error ? error.message : 'Lookup failed.',
          });
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [slug, status]);

  async function send() {
    if (state.kind !== 'found' || !userId) return;
    try {
      await sendRequest(state.userId, userId);
      setState({ kind: 'sent', displayName: state.displayName });
      void refresh();
    } catch (error) {
      setState({
        kind: 'error',
        message: error instanceof Error ? error.message : 'Could not send the request.',
      });
    }
  }

  return (
    <main className="flex min-h-dvh flex-col justify-center px-6 pb-28">
      <h1 className="text-2xl lowercase">follow a friend</h1>

      {!syncConfigured || status !== 'signed-in' ? (
        <p className="measure mt-4 leading-relaxed text-ink-soft">
          This build has no sync credentials, so friends are unavailable.
        </p>
      ) : state.kind === 'looking' ? (
        <p className="mt-4 text-sm lowercase text-ink-soft">looking for {slug}…</p>
      ) : state.kind === 'missing' ? (
        <p className="measure mt-4 leading-relaxed text-ink-soft">
          No one called <span className="lowercase text-ink">{slug}</span> — or that link is
          your own. Check the spelling with whoever sent it.
        </p>
      ) : state.kind === 'error' ? (
        <p className="measure mt-4 leading-relaxed text-clay">{state.message}</p>
      ) : state.kind === 'sent' ? (
        <p className="measure mt-4 leading-relaxed text-ink-soft">
          Request sent to <span className="lowercase text-ink">{state.displayName}</span>. You
          will see them once they accept.
        </p>
      ) : (
        <>
          <p className="measure mt-4 leading-relaxed text-ink-soft">
            Follow <span className="lowercase text-ink">{state.displayName}</span>? You will see
            each other's streak and week — nothing else.
          </p>
          <button
            onClick={() => void send()}
            className="mt-8 flex items-center justify-center gap-2.5 bg-pine-deep py-3.5 text-sm lowercase tracking-wide text-paper hover:brightness-110"
          >
            <Icon name="check" size={16} />
            send request
          </button>
        </>
      )}

      <button
        onClick={() => navigate('/friends', { replace: true })}
        className="mt-4 border border-line py-3.5 text-sm lowercase text-ink-soft hover:bg-surface hover:text-ink"
      >
        {state.kind === 'sent' ? 'done' : 'not now'}
      </button>
    </main>
  );
}
